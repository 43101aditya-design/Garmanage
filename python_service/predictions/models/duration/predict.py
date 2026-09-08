"""Service duration prediction inference."""
from __future__ import annotations
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
import numpy as np
import pandas as pd
from predictions.models.registry import load, status, DURATION_MODEL
from predictions.models.duration.features import (
    build_features, FEATURE_NAMES, rule_based_estimate, safe_encode
)

logger = logging.getLogger(__name__)


def predict_duration(
    service_type: str,
    vehicle_type: str,
    mechanic_id: Optional[str],
    parts_count: int = 0,
    mech_perf_df: Optional[pd.DataFrame] = None,
    garage_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Predict how long a job will take.
    Falls back to rule-based estimate if insufficient data.
    """
    model_status = status(DURATION_MODEL)

    # Always compute rule-based fallback
    rule_minutes = rule_based_estimate(service_type)

    if not model_status["trained"]:
        return _rule_response(service_type, vehicle_type, mechanic_id, rule_minutes, garage_id, model_status)

    try:
        model, meta = load(DURATION_MODEL)
        encoders = meta.get("encoders", {})

        st_enc = encoders.get("service_type", {})
        vt_enc = encoders.get("vehicle_type", {})

        # Build mechanic stats
        mech_avg = rule_minutes  # default
        mech_rate = 0.8
        if mech_perf_df is not None and not mech_perf_df.empty and mechanic_id:
            row = mech_perf_df[mech_perf_df["mechanic_id"] == str(mechanic_id)]
            if not row.empty:
                mech_avg  = float(row["avg_duration_minutes"].iloc[0]) if not pd.isna(row["avg_duration_minutes"].iloc[0]) else rule_minutes
                mech_rate = float(row["completion_rate"].iloc[0]) if not pd.isna(row["completion_rate"].iloc[0]) else 0.8

        X = np.array([[
            safe_encode(service_type, st_enc),
            safe_encode(vehicle_type, vt_enc),
            float(parts_count),
            mech_avg,
            mech_rate,
        ]])

        pred_minutes = float(max(10, model.predict(X)[0]))
        pred_hours   = round(pred_minutes / 60, 1)
        completion   = datetime.now() + timedelta(minutes=pred_minutes)

        importance = meta.get("feature_importance", {})
        top_factors = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:3]

        return {
            "mode": "ML",
            "model_name": DURATION_MODEL,
            "model_version": meta.get("version", "v1"),
            "garage_id": garage_id,
            "estimated_minutes": round(pred_minutes, 0),
            "estimated_hours": pred_hours,
            "estimated_completion": completion.strftime("%Y-%m-%d %H:%M"),
            "inputs": {
                "service_type": service_type,
                "vehicle_type": vehicle_type,
                "mechanic_id": mechanic_id,
                "parts_count": parts_count,
            },
            "contributing_factors": [
                {"feature": k, "importance": round(v, 4)} for k, v in top_factors
            ],
            "evaluation": meta.get("evaluation", {}),
            "message": None,
        }
    except Exception as e:
        logger.error("Duration prediction error: %s", e)
        return _rule_response(service_type, vehicle_type, mechanic_id, rule_minutes, garage_id, model_status)


def _rule_response(service_type, vehicle_type, mechanic_id, rule_minutes, garage_id, model_status):
    completion = datetime.now() + timedelta(minutes=rule_minutes)
    return {
        "mode": "RULE_BASED",
        "garage_id": garage_id,
        "estimated_minutes": rule_minutes,
        "estimated_hours": round(rule_minutes / 60, 1),
        "estimated_completion": completion.strftime("%Y-%m-%d %H:%M"),
        "inputs": {
            "service_type": service_type,
            "vehicle_type": vehicle_type,
            "mechanic_id": mechanic_id,
        },
        "message": "Using rule-based estimate — insufficient historical data for ML prediction.",
        "model_status": model_status,
        "contributing_factors": [
            {"feature": "service_type", "note": "Primary driver of rule-based estimate"}
        ],
    }
