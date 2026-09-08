"""Workload forecasting inference — tomorrow + next 7 days."""
from __future__ import annotations
import logging
from typing import Any, Dict, Optional
import numpy as np
import pandas as pd
from predictions.models.registry import load, status, WORKLOAD_MODEL
from predictions.models.workload.features import (
    build_features, feature_matrix, FEATURE_NAMES,
    workload_level, build_forecast_row,
)

logger = logging.getLogger(__name__)


def predict_workload(df: pd.DataFrame, garage_id: Optional[str] = None) -> Dict[str, Any]:
    if df.empty or len(df) < 5:
        return {
            "mode": "NO_DATA",
            "garage_id": garage_id,
            "message": "Insufficient historical data to forecast workload.",
            "tomorrow": None,
        }

    df = df.copy()
    df["job_date"] = pd.to_datetime(df["job_date"])
    df = df.sort_values("job_date").reset_index(drop=True)

    avg_jobs = float(df["job_count"].tail(14).mean())
    std_jobs = float(df["job_count"].tail(14).std(ddof=0)) if len(df) > 1 else 0.0
    last_date = df["job_date"].max()

    # Baseline for tomorrow
    baseline_tomorrow = avg_jobs
    level = workload_level(baseline_tomorrow, avg_jobs)

    model_status = status(WORKLOAD_MODEL)
    if not model_status["trained"]:
        return _baseline_response(df, garage_id, last_date, avg_jobs, std_jobs, level, model_status)

    try:
        model, meta = load(WORKLOAD_MODEL)
        df_feat = build_features(df)
        row = build_forecast_row(last_date, df_feat, 1)
        X = np.array([[row[f] for f in FEATURE_NAMES]])
        pred_tomorrow = float(max(0, model.predict(X)[0]))
        level = workload_level(pred_tomorrow, avg_jobs)

        # Next 7 days
        week_forecast = []
        for i in range(1, 8):
            r = build_forecast_row(last_date, df_feat, i)
            X_i = np.array([[r[f] for f in FEATURE_NAMES]])
            p = float(max(0, model.predict(X_i)[0]))
            d = last_date + pd.Timedelta(days=i)
            week_forecast.append({
                "date": str(d.date()),
                "predicted_jobs": round(p, 1),
                "workload_level": workload_level(p, avg_jobs),
            })

        mae = meta.get("evaluation", {}).get("MAE", std_jobs)
        importance = meta.get("feature_importance", {})
        top_factors = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:3]

        return {
            "mode": "ML",
            "model_name": WORKLOAD_MODEL,
            "model_version": meta.get("version", "v1"),
            "garage_id": garage_id,
            "data_rows": len(df),
            "tomorrow": {
                "date": str((last_date + pd.Timedelta(days=1)).date()),
                "predicted_jobs": round(pred_tomorrow, 1),
                "lower_bound": round(max(0, pred_tomorrow - mae), 1),
                "upper_bound": round(pred_tomorrow + mae, 1),
                "workload_level": level,
                "bottleneck_risk": level == "HIGH",
                "recommended_action": _recommendation(level),
            },
            "week_forecast": week_forecast,
            "historical_avg_14d": round(avg_jobs, 1),
            "evaluation": meta.get("evaluation", {}),
            "contributing_factors": [{"feature": k, "importance": round(v, 4)} for k, v in top_factors],
        }
    except Exception as e:
        logger.error("Workload prediction error: %s", e)
        return _baseline_response(df, garage_id, last_date, avg_jobs, std_jobs, level, model_status)


def _baseline_response(df, garage_id, last_date, avg_jobs, std_jobs, level, model_status):
    return {
        "mode": "BASELINE",
        "baseline": "14-Day Moving Average",
        "garage_id": garage_id,
        "data_rows": len(df),
        "message": "Using baseline forecast.",
        "tomorrow": {
            "date": str((last_date + pd.Timedelta(days=1)).date()),
            "predicted_jobs": round(avg_jobs, 1),
            "lower_bound": round(max(0, avg_jobs - std_jobs), 1),
            "upper_bound": round(avg_jobs + std_jobs, 1),
            "workload_level": level,
            "bottleneck_risk": level == "HIGH",
            "recommended_action": _recommendation(level),
        },
        "model_status": model_status,
    }


def _recommendation(level: str) -> str:
    return {
        "HIGH":    "Review mechanic availability and consider scheduling additional shifts.",
        "MEDIUM":  "Normal staffing levels should be sufficient. Monitor incoming requests.",
        "LOW":     "Light workload expected. Good time for preventive maintenance or training.",
        "UNKNOWN": "Insufficient data to generate a recommendation.",
    }.get(level, "Monitor the workshop schedule.")
