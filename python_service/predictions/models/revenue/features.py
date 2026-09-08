"""Revenue forecasting feature engineering."""
from __future__ import annotations
import pandas as pd
import numpy as np

FEATURE_NAMES = [
    "day_of_week",       # 0=Mon … 6=Sun
    "week_of_year",
    "month",
    "year",
    "lag_7d_revenue",    # revenue 7 days ago
    "lag_14d_revenue",   # revenue 14 days ago
    "lag_30d_revenue",   # revenue 30 days ago
    "rolling_7d_avg",    # 7-day rolling mean
    "rolling_7d_std",    # 7-day rolling std (volatility)
    "avg_invoice_value", # average invoice that day
    "completed_jobs",    # number of completed invoices
]


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Input df must have columns: invoice_date (datetime), daily_revenue,
    avg_invoice_value, completed_jobs.
    Returns df with feature columns added.
    """
    df = df.sort_values("invoice_date").reset_index(drop=True)
    df["invoice_date"] = pd.to_datetime(df["invoice_date"])

    df["day_of_week"]    = df["invoice_date"].dt.dayofweek
    df["week_of_year"]   = df["invoice_date"].dt.isocalendar().week.astype(int)
    df["month"]          = df["invoice_date"].dt.month
    df["year"]           = df["invoice_date"].dt.year

    df["lag_7d_revenue"]  = df["daily_revenue"].shift(7)
    df["lag_14d_revenue"] = df["daily_revenue"].shift(14)
    df["lag_30d_revenue"] = df["daily_revenue"].shift(30)

    df["rolling_7d_avg"] = df["daily_revenue"].rolling(7, min_periods=1).mean()
    df["rolling_7d_std"] = df["daily_revenue"].rolling(7, min_periods=1).std().fillna(0)

    # Fill lag NaNs with rolling mean (reasonable for early rows)
    for col in ["lag_7d_revenue", "lag_14d_revenue", "lag_30d_revenue"]:
        df[col] = df[col].fillna(df["rolling_7d_avg"])

    if "avg_invoice_value" not in df.columns:
        df["avg_invoice_value"] = df["daily_revenue"] / df["completed_jobs"].clip(lower=1)
    if "completed_jobs" not in df.columns:
        df["completed_jobs"] = 1

    df["avg_invoice_value"] = pd.to_numeric(df["avg_invoice_value"], errors="coerce").fillna(0)
    df["completed_jobs"]    = pd.to_numeric(df["completed_jobs"],    errors="coerce").fillna(0)

    return df


def feature_matrix(df: pd.DataFrame) -> pd.DataFrame:
    return df[FEATURE_NAMES].astype(float)


def build_forecast_row(last_date: pd.Timestamp, recent_df: pd.DataFrame, offset_days: int) -> dict:
    """Build a single feature row for a future date offset_days from last_date."""
    target_date = last_date + pd.Timedelta(days=offset_days)
    rolling_avg = float(recent_df["daily_revenue"].tail(7).mean())
    rolling_std = float(recent_df["daily_revenue"].tail(7).std(ddof=0)) if len(recent_df) > 1 else 0.0

    def lag_val(n: int) -> float:
        idx = len(recent_df) - n
        if idx >= 0:
            return float(recent_df["daily_revenue"].iloc[idx])
        return rolling_avg

    avg_inv = float(recent_df["avg_invoice_value"].tail(7).mean()) if "avg_invoice_value" in recent_df.columns else 0.0
    avg_jobs = float(recent_df["completed_jobs"].tail(7).mean()) if "completed_jobs" in recent_df.columns else 1.0

    return {
        "day_of_week":       target_date.dayofweek,
        "week_of_year":      int(target_date.isocalendar()[1]),
        "month":             target_date.month,
        "year":              target_date.year,
        "lag_7d_revenue":    lag_val(7),
        "lag_14d_revenue":   lag_val(14),
        "lag_30d_revenue":   lag_val(30),
        "rolling_7d_avg":    rolling_avg,
        "rolling_7d_std":    rolling_std,
        "avg_invoice_value": avg_inv,
        "completed_jobs":    avg_jobs,
    }
