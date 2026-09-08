import unittest
from unittest.mock import MagicMock
from predictions.anomaly_detection_pipeline import (
    detect_invoice_anomalies,
    detect_inventory_anomalies,
    detect_duration_anomalies,
    detect_cancellation_anomalies,
    detect_garage_anomalies,
    run_all_detections
)

class AnomaliesTests(unittest.TestCase):
    def setUp(self):
        # Set up a mock database connection and cursor
        self.mock_conn = MagicMock()
        self.mock_cursor = MagicMock()
        self.mock_conn.cursor.return_value = self.mock_cursor

    def test_detect_invoice_anomalies_empty(self):
        # Empty rows should return no anomalies
        self.mock_cursor.fetchall.return_value = []
        res = detect_invoice_anomalies(self.mock_conn)
        self.assertEqual(res, [])

    def test_detect_invoice_anomalies_outlier(self):
        # Build 10 normal rows + 1 outlier row
        normal_rows = [
            {"id": f"INV-{i}", "total_amount": 1000.0, "discount": 50.0, "created_by": "M1", "garage_id": "G1", "invoice_date": "2026-08-01"}
            for i in range(15)
        ]
        # Outlier with huge discount (80% rate)
        anomaly_row = {"id": "INV-ANOM", "total_amount": 100.0, "discount": 400.0, "created_by": "M1", "garage_id": "G1", "invoice_date": "2026-08-02"}
        self.mock_cursor.fetchall.return_value = normal_rows + [anomaly_row]

        res = detect_invoice_anomalies(self.mock_conn)
        self.assertTrue(len(res) > 0)
        self.assertEqual(res[0]["entity_id"], "INV-ANOM")
        self.assertEqual(res[0]["entity_type"], "invoice")

    def test_detect_inventory_anomalies_spike(self):
        # Normal usage: 10 per week. Spike: 80 in recent week
        normal_weeks = [
            {"part_id": "P1", "part_name": "Spark Plug", "garage_id": "G1", "weekly_quantity": 10.0, "year_week": 202601 + i}
            for i in range(12)
        ]
        spike_week = {"part_id": "P1", "part_name": "Spark Plug", "garage_id": "G1", "weekly_quantity": 80.0, "year_week": 202613}
        self.mock_cursor.fetchall.return_value = normal_weeks + [spike_week]

        res = detect_inventory_anomalies(self.mock_conn)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["entity_id"], "P1")
        self.assertTrue("Spike" in res[0]["reason"] or "spike" in res[0]["reason"])

    def test_detect_duration_anomalies(self):
        # Median is around 60 mins. Outlier: 360 mins.
        normal_jobs = [
            {"job_id": f"J-{i}", "garage_id": "G1", "service_type": "Engine Repair", "duration_minutes": 60.0}
            for i in range(10)
        ]
        long_job = {"job_id": "J-LONG", "garage_id": "G1", "service_type": "Engine Repair", "duration_minutes": 360.0}
        self.mock_cursor.fetchall.return_value = normal_jobs + [long_job]

        res = detect_duration_anomalies(self.mock_conn)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["entity_id"], "J-LONG")

    def test_detect_cancellation_anomalies(self):
        # High cancellations for a customer: 5 total, 4 cancelled
        self.mock_cursor.fetchall.return_value = [
            {"customer_id": "CUST1", "garage_id": "G1", "total_appts": 5, "cancelled_appts": 4}
        ]
        res = detect_cancellation_anomalies(self.mock_conn)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["entity_id"], "CUST1")
        self.assertEqual(res[0]["entity_type"], "cancellation")

    def test_detect_garage_anomalies(self):
        # Isolation Forest needs some data. Build 25 daily records. One massive revenue spike.
        normal_days = [
            {"garage_id": "G1", "op_date": f"2026-08-{i:02d}", "jobs_count": 5.0, "cancelled_count": 0.0, "daily_revenue": 5000.0}
            for i in range(1, 25)
        ]
        outlier_day = {"garage_id": "G1", "op_date": "2026-08-25", "jobs_count": 30.0, "cancelled_count": 8.0, "daily_revenue": 150000.0}
        self.mock_cursor.fetchall.return_value = normal_days + [outlier_day]

        res = detect_garage_anomalies(self.mock_conn)
        # Should execute successfully without throwing errors
        self.assertIsInstance(res, list)

if __name__ == "__main__":
    unittest.main()
