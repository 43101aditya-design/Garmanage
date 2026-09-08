"""Service duration prediction features."""
from __future__ import annotations
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder

FEATURE_NAMES = [
    "service_type_enc",
    "vehicle_type_enc",
    "parts_count",
    "mechanic_avg_duration",
    "mechanic_completion_rate",
]

# Rule-based fallback estimates (minutes) by service type
RULE_BASED_ESTIMATES = {
    "oil_change": 45,
    "tire_rotation": 30,
    "brake_service": 120,
    "engine_repair": 480,
    "transmission": 360,
    "electrical": 180,
    "ac_service": 90,
    "general_inspection": 60,
    "bodywork": 300,
    "default": 120,
}


def safe_encode(value: str, mapping: dict, default: int = 0) -> int:
    return mapping.get(str(value).lower().strip(), default)


def build_encoders(df: pd.DataFrame) -> dict:
    """Build label-encoding mappings from training data."""
    encoders = {}
    for col, key in [("service_type", "service_type"), ("vehicle_type", "vehicle_type")]:
        if col in df.columns:
            vals = df[col].dropna().unique().tolist()
            encoders[key] = {str(v).lower().strip(): i for i, v in enumerate(sorted(vals))}
    return encoders


def build_features(df: pd.DataFrame, encoders: dict, mech_perf: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    st_enc = encoders.get("service_type", {})
    vt_enc = encoders.get("vehicle_type", {})

    df["service_type_enc"] = df["service_type"].apply(lambda x: safe_encode(x, st_enc))
    df["vehicle_type_enc"] = df["vehicle_type"].apply(lambda x: safe_encode(x, vt_enc))
    df["parts_count"] = pd.to_numeric(df.get("parts_count", 0), errors="coerce").fillna(0)

    # Merge mechanic performance
    if not mech_perf.empty and "mechanic_id" in df.columns:
        df = df.merge(
            mech_perf[["mechanic_id", "avg_duration_minutes", "completion_rate"]],
            on="mechanic_id", how="left"
        )
        df["mechanic_avg_duration"]     = df["avg_duration_minutes"].fillna(df["duration_minutes"].mean() if "duration_minutes" in df.columns else 120)
        df["mechanic_completion_rate"]  = df["completion_rate"].fillna(0.8)
    else:
        df["mechanic_avg_duration"]    = df["duration_minutes"].mean() if "duration_minutes" in df.columns else 120
        df["mechanic_completion_rate"] = 0.8

    return df


def rule_based_estimate(service_type: str) -> int:
    """Fallback estimate in minutes."""
    key = str(service_type).lower().strip().replace(" ", "_").replace("-", "_")
    for pattern, val in RULE_BASED_ESTIMATES.items():
        if pattern in key:
            return val
    return RULE_BASED_ESTIMATES["default"]
