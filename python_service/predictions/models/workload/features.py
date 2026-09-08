"""Workload forecasting feature engineering."""
from __future__ import annotations
import pandas as pd
import numpy as np

FEATURE_NAMES = [
    "day_of_week",
    "week_of_year",
    "month",
    "lag_7d_jobs",
    "lag_14d_jobs",
    "rolling_7d_avg_jobs",
    "rolling_7d_std_jobs",
    "pending_ratio",   # pending / total on that day
]


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values("job_date").reset_index(drop=True)
    df["job_date"] = pd.to_datetime(df["job_date"])
    df["day_of_week"]   = df["job_date"].dt.dayofweek
    df["week_of_year"]  = df["job_date"].dt.isocalendar().week.astype(int)
    df["month"]         = df["job_date"].dt.month

    df["lag_7d_jobs"]   = df["job_count"].shift(7)
    df["lag_14d_jobs"]  = df["job_count"].shift(14)
    df["rolling_7d_avg_jobs"] = df["job_count"].rolling(7, min_periods=1).mean()
    df["rolling_7d_std_jobs"] = df["job_count"].rolling(7, min_periods=1).std().fillna(0)

    for col in ["lag_7d_jobs", "lag_14d_jobs"]:
        df[col] = df[col].fillna(df["rolling_7d_avg_jobs"])

    if "pending_count" not in df.columns:
        df["pending_count"] = 0
    df["pending_ratio"] = df["pending_count"] / df["job_count"].clip(lower=1)

    return df


def feature_matrix(df: pd.DataFrame) -> pd.DataFrame:
    return df[FEATURE_NAMES].astype(float)


def workload_level(predicted_jobs: float, avg_jobs: float) -> str:
    if avg_jobs <= 0:
        return "UNKNOWN"
    ratio = predicted_jobs / avg_jobs
    if ratio >= 1.3:
        return "HIGH"
    elif ratio >= 0.85:
        return "MEDIUM"
    return "LOW"


def build_forecast_row(last_date: pd.Timestamp, recent_df: pd.DataFrame, offset_days: int) -> dict:
    target = last_date + pd.Timedelta(days=offset_days)
    avg = float(recent_df["job_count"].tail(7).mean())
    std = float(recent_df["job_count"].tail(7).std(ddof=0)) if len(recent_df) > 1 else 0.0

    def lag(n):
        idx = len(recent_df) - n
        return float(recent_df["job_count"].iloc[idx]) if idx >= 0 else avg

    return {
        "day_of_week":         target.dayofweek,
        "week_of_year":        int(target.isocalendar()[1]),
        "month":               target.month,
        "lag_7d_jobs":         lag(7),
        "lag_14d_jobs":        lag(14),
        "rolling_7d_avg_jobs": avg,
        "rolling_7d_std_jobs": std,
        "pending_ratio":       float(recent_df["pending_count"].tail(3).mean() / max(avg, 1)) if "pending_count" in recent_df.columns else 0.0,
    }
