"""Inventory demand forecasting features."""
from __future__ import annotations
import pandas as pd
import numpy as np

FEATURE_NAMES = [
    "week_of_year",
    "month",
    "day_of_week",
    "lag_7d_qty",
    "lag_14d_qty",
    "rolling_7d_avg_qty",
    "rolling_14d_avg_qty",
    "rolling_7d_std_qty",
]


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """df must have: usage_date (datetime), weekly_quantity, part_id."""
    df = df.sort_values("usage_date").reset_index(drop=True)
    df["usage_date"] = pd.to_datetime(df["usage_date"])
    df["week_of_year"] = df["usage_date"].dt.isocalendar().week.astype(int)
    df["month"]        = df["usage_date"].dt.month
    df["day_of_week"]  = df["usage_date"].dt.dayofweek

    df["lag_7d_qty"]  = df["weekly_quantity"].shift(1)   # 1 week ago
    df["lag_14d_qty"] = df["weekly_quantity"].shift(2)   # 2 weeks ago

    df["rolling_7d_avg_qty"]  = df["weekly_quantity"].rolling(4, min_periods=1).mean()
    df["rolling_14d_avg_qty"] = df["weekly_quantity"].rolling(8, min_periods=1).mean()
    df["rolling_7d_std_qty"]  = df["weekly_quantity"].rolling(4, min_periods=1).std().fillna(0)

    for col in ["lag_7d_qty", "lag_14d_qty"]:
        df[col] = df[col].fillna(df["rolling_7d_avg_qty"])
    return df


def feature_matrix(df: pd.DataFrame) -> pd.DataFrame:
    return df[FEATURE_NAMES].astype(float)


def stockout_risk(demand_14d: float, current_stock: float, reserved: float) -> str:
    available = max(0, current_stock - reserved)
    if available <= 0:
        return "CRITICAL"
    if demand_14d <= 0:
        return "HEALTHY"
    days_cover = (available / demand_14d) * 14
    if days_cover <= 7:
        return "HIGH"
    elif days_cover <= 14:
        return "MEDIUM"
    return "HEALTHY"
