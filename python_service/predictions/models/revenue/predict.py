"""
Revenue forecasting inference.
Produces 7-day and 30-day daily forecasts with confidence bounds.
Falls back to baseline (moving average) when model is not trained.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from predictions.models.registry import load, status, REVENUE_MODEL
from predictions.models.revenue.features import (
    build_features,
    build_forecast_row,
    FEATURE_NAMES,
)

logger = logging.getLogger(__name__)


def _baseline_forecast(df: pd.DataFrame, horizon: int) -> List[Dict]:
    """7-day moving average baseline forecast."""
    last_date = pd.to_datetime(df["invoice_date"].max())
    ma7 = float(df["daily_revenue"].tail(7).mean())
    std7 = float(df["daily_revenue"].tail(7).std(ddof=0)) if len(df) >= 2 else 0.0
    results = []
    for i in range(1, horizon + 1):
        d = last_date + pd.Timedelta(days=i)
        results.append({
            "date": str(d.date()),
            "predicted_revenue": round(ma7, 2),
            "lower_bound": round(max(0, ma7 - std7), 2),
            "upper_bound": round(ma7 + std7, 2),
        })
    return results


def predict_revenue(
    df: pd.DataFrame,
    horizon: int = 7,
    garage_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Produce a revenue forecast for the next `horizon` days (7 or 30).

    Args:
        df: Historical revenue DataFrame from data_loader
        horizon: Number of days to forecast
        garage_id: For labelling purposes

    Returns:
        Prediction dict with forecast, model info, contributing factors.
    """
    if df.empty or len(df) < 7:
        return {
            "mode": "NO_DATA",
            "garage_id": garage_id,
            "horizon_days": horizon,
            "message": "Insufficient historical data to forecast revenue.",
            "forecast": [],
            "summary": None,
        }

    df = df.copy()
    df["invoice_date"] = pd.to_datetime(df["invoice_date"])
    df = df.sort_values("invoice_date").reset_index(drop=True)

    reg_status = status(REVENUE_MODEL)

    # --- Baseline always computed ---
    baseline = _baseline_forecast(df, horizon)
    ma7 = float(df["daily_revenue"].tail(7).mean())
    std7 = float(df["daily_revenue"].tail(7).std(ddof=0)) if len(df) >= 2 else 0.0
    total_baseline = sum(d["predicted_revenue"] for d in baseline)

    # --- Try ML model ---
    if not reg_status["trained"]:
        return {
            "mode": "BASELINE",
            "baseline": "7-Day Moving Average",
            "garage_id": garage_id,
            "horizon_days": horizon,
            "data_period": f"{df['invoice_date'].min().date()} → {df['invoice_date'].max().date()}",
            "data_rows": len(df),
            "message": "Model not trained yet — using 7-day moving average baseline.",
            "forecast": baseline,
            "summary": {
                "total_predicted": round(total_baseline, 2),
                "avg_daily": round(ma7, 2),
                "lower_bound": round(max(0, total_baseline - std7 * horizon**0.5), 2),
                "upper_bound": round(total_baseline + std7 * horizon**0.5, 2),
            },
            "model_status": reg_status,
        }

    try:
        model, meta = load(REVENUE_MODEL)
        df_feat = build_features(df)
        last_date = df_feat["invoice_date"].max()

        forecast = []
        rolling_df = df_feat.copy()

        for i in range(1, horizon + 1):
            row_dict = build_forecast_row(last_date, rolling_df, i)
            X = np.array([[row_dict[f] for f in FEATURE_NAMES]])
            pred = float(model.predict(X)[0])
            pred = max(0, pred)

            # Confidence bounds from validation residuals
            mae = meta.get("evaluation", {}).get("MAE", std7)
            forecast.append({
                "date": str((last_date + pd.Timedelta(days=i)).date()),
                "predicted_revenue": round(pred, 2),
                "lower_bound": round(max(0, pred - mae), 2),
                "upper_bound": round(pred + mae, 2),
            })

        total_ml = sum(d["predicted_revenue"] for d in forecast)
        mae = meta.get("evaluation", {}).get("MAE", 0)

        # Feature importance → contributing factors description
        importance = meta.get("feature_importance", {})
        top_factors = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:3]
        factors = [{"feature": k, "importance": round(v, 4)} for k, v in top_factors]

        return {
            "mode": "ML",
            "model_name": REVENUE_MODEL,
            "model_version": meta.get("version", "v1"),
            "trained_at": meta.get("saved_at"),
            "garage_id": garage_id,
            "horizon_days": horizon,
            "data_period": f"{df['invoice_date'].min().date()} → {df['invoice_date'].max().date()}",
            "data_rows": len(df),
            "forecast": forecast,
            "summary": {
                "total_predicted": round(total_ml, 2),
                "avg_daily": round(total_ml / horizon, 2),
                "lower_bound": round(max(0, total_ml - mae * horizon**0.5), 2),
                "upper_bound": round(total_ml + mae * horizon**0.5, 2),
            },
            "evaluation": meta.get("evaluation", {}),
            "baseline_evaluation": meta.get("baseline_evaluation", {}),
            "contributing_factors": factors,
            "message": None,
        }

    except FileNotFoundError:
        logger.warning("Revenue model artifact missing, falling back to baseline")
        return {
            "mode": "BASELINE",
            "baseline": "7-Day Moving Average",
            "garage_id": garage_id,
            "horizon_days": horizon,
            "data_rows": len(df),
            "message": "Model artifact not found — using baseline.",
            "forecast": baseline,
            "summary": {
                "total_predicted": round(total_baseline, 2),
                "avg_daily": round(ma7, 2),
                "lower_bound": round(max(0, total_baseline - std7 * horizon**0.5), 2),
                "upper_bound": round(total_baseline + std7 * horizon**0.5, 2),
            },
        }
    except Exception as e:
        logger.error("Revenue prediction error: %s", e)
        return {
            "mode": "ERROR",
            "garage_id": garage_id,
            "horizon_days": horizon,
            "message": f"Prediction error: {str(e)}",
            "forecast": baseline,
            "summary": None,
        }
