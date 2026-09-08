import unittest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from predictions.preprocessing.data_quality import check_and_clean
from predictions.models.revenue.features import build_features
from predictions.models.revenue.predict import predict_revenue
from predictions.models.workload.features import workload_level
from predictions.models.workload.predict import predict_workload
from predictions.models.inventory_demand.predict import predict_inventory_demand
from predictions.models.duration.features import rule_based_estimate
from predictions.models.duration.predict import predict_duration
from predictions.models.registry import all_model_status


class PredictionsTests(unittest.TestCase):
    def setUp(self):
        # Build dummy data for tests
        base_date = datetime(2026, 1, 1)
        self.revenue_df = pd.DataFrame([
            {
                "invoice_date": (base_date + timedelta(days=i)).strftime("%Y-%m-%d"),
                "daily_revenue": 1000.0 + i * 10,
                "avg_invoice_value": 500.0,
                "completed_jobs": 2
            }
            for i in range(40)  # 40 days of data
        ])

        self.workload_df = pd.DataFrame([
            {
                "job_date": (base_date + timedelta(days=i)).strftime("%Y-%m-%d"),
                "job_count": 5 + (i % 7),
                "pending_count": 1,
                "active_count": 2,
                "completed_count": 3
            }
            for i in range(30)
        ])

        self.demand_df = pd.DataFrame([
            {
                "usage_date": (base_date + timedelta(weeks=i)).strftime("%Y-%m-%d"),
                "weekly_quantity": 4 + (i % 3),
                "part_id": "PART-001",
                "part_name": "Brake Pad",
                "garage_id": "GAR-001"
            }
            for i in range(25)
        ])

        self.stock_df = pd.DataFrame([
            {
                "part_id": "PART-001",
                "part_name": "Brake Pad",
                "garage_id": "GAR-001",
                "quantity_in_stock": 10,
                "reserved_quantity": 2,
                "reorder_level": 5
            }
        ])

    def test_check_and_clean_filters_negatives_and_nans(self):
        dirty_df = pd.DataFrame([
            {"val": 10.0, "date": "2026-01-01"},
            {"val": -5.0, "date": "2026-01-02"},  # Negative, should be removed
            {"val": None, "date": "2026-01-03"},  # Null, should be removed
            {"val": 15.0, "date": "invalid-date"}, # Bad date, should be removed
            {"val": 10.0, "date": "2026-01-01"},  # Duplicate, should be removed if enabled
        ])

        cleaned, report = check_and_clean(
            dirty_df,
            numeric_cols=["val"],
            non_negative_cols=["val"],
            date_col="date"
        )

        self.assertEqual(len(cleaned), 1)
        self.assertEqual(cleaned.iloc[0]["val"], 10.0)
        self.assertEqual(report["issues"]["negative_values"], 1)
        self.assertEqual(report["issues"]["missing_values"], 1)
        self.assertEqual(report["issues"]["invalid_timestamps"], 1)

    def test_revenue_forecast_falls_back_gracefully_to_baseline(self):
        # Test with insufficient data (< 7 rows)
        empty_res = predict_revenue(pd.DataFrame(), horizon=7, garage_id="GAR-001")
        self.assertEqual(empty_res["mode"], "NO_DATA")
        self.assertEqual(len(empty_res["forecast"]), 0)

        # Test with sufficient data but unregistered model -> should fall back to BASELINE
        res = predict_revenue(self.revenue_df, horizon=7, garage_id="GAR-001")
        self.assertEqual(res["mode"], "BASELINE")
        self.assertEqual(len(res["forecast"]), 7)
        self.assertIsNotNone(res["summary"]["total_predicted"])

    def test_workload_forecast_level_categorization(self):
        self.assertEqual(workload_level(15, 10), "HIGH")    # 1.5 ratio
        self.assertEqual(workload_level(10, 10), "MEDIUM")  # 1.0 ratio
        self.assertEqual(workload_level(5, 10), "LOW")      # 0.5 ratio
        self.assertEqual(workload_level(5, 0), "UNKNOWN")

    def test_workload_forecast_runs_fallback(self):
        res = predict_workload(self.workload_df, garage_id="GAR-001")
        self.assertEqual(res["mode"], "BASELINE")
        self.assertIsNotNone(res["tomorrow"])
        self.assertTrue(res["tomorrow"]["predicted_jobs"] > 0)

    def test_inventory_demand_runs_fallback(self):
        res = predict_inventory_demand(self.demand_df, self.stock_df, garage_id="GAR-001")
        self.assertEqual(res["mode"], "BASELINE")
        self.assertEqual(res["total_parts_analyzed"], 1)
        self.assertEqual(res["predictions"][0]["part_id"], "PART-001")
        self.assertIn(res["predictions"][0]["stockout_risk"], ["CRITICAL", "HIGH", "MEDIUM", "HEALTHY"])

    def test_duration_rule_based_estimates(self):
        self.assertEqual(rule_based_estimate("engine repair"), 480)
        self.assertEqual(rule_based_estimate("tire rotation"), 30)
        self.assertEqual(rule_based_estimate("unknown-random"), 120)  # Default

    def test_duration_prediction_fallback(self):
        res = predict_duration(
            service_type="oil_change",
            vehicle_type="sedan",
            mechanic_id="MEC-001",
            parts_count=1,
            garage_id="GAR-001"
        )
        self.assertEqual(res["mode"], "RULE_BASED")
        self.assertEqual(res["estimated_minutes"], 45)

    def test_all_model_registry_status(self):
        status = all_model_status()
        self.assertIn("revenue_model_v1", status)
        self.assertIn("workload_model_v1", status)
        self.assertIn("inventory_demand_model_v1", status)
        self.assertIn("duration_model_v1", status)


if __name__ == "__main__":
    unittest.main()
