"""
Revenue forecasting training pipeline.
Trains a GradientBoostingRegressor and compares against a 7-day MA baseline.
"""
from __future__ import annotations

import logging
from typing import Any, Dict

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

from predictions.preprocessing.data_quality import check_and_clean, min_rows_check
from predictions.models.registry import save, REVENUE_MODEL
from predictions.models.revenue.features import build_features, feature_matrix, FEATURE_NAMES

logger = logging.getLogger(__name__)

MIN_ROWS = 30  # Need at least 30 daily records to train


def _mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    mask = y_true != 0
    if not mask.any():
        return float("nan")
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def train_revenue_model(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Train revenue forecasting model.
    df must have: invoice_date, daily_revenue, avg_invoice_value, completed_jobs
    Returns training result dict.
    """
    # --- Data quality ---
    df, quality = check_and_clean(
        df,
        numeric_cols=["daily_revenue"],
        non_negative_cols=["daily_revenue"],
        date_col="invoice_date",
        outlier_cols=["daily_revenue"],
    )

    err = min_rows_check(df, MIN_ROWS, "revenue data")
    if err:
        return {"trained": False, "reason": err, "data_quality": quality}

    # --- Feature engineering ---
    df = build_features(df)
    df = df.dropna(subset=FEATURE_NAMES)

    err = min_rows_check(df, 20, "revenue features")
    if err:
        return {"trained": False, "reason": err, "data_quality": quality}

    # Chronological train/validation split (80/20)
    split = max(10, int(len(df) * 0.8))
    train_df = df.iloc[:split]
    val_df   = df.iloc[split:]

    X_train = feature_matrix(train_df).values
    y_train = train_df["daily_revenue"].values.astype(float)

    # --- Baseline: 7-day moving average ---
    baseline_preds = val_df["rolling_7d_avg"].values.astype(float)

    # --- ML model ---
    model = GradientBoostingRegressor(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        min_samples_leaf=2,
        random_state=42,
    )
    model.fit(X_train, y_train)

    y_val = val_df["daily_revenue"].values.astype(float)
    ml_preds = model.predict(feature_matrix(val_df).values)

    # --- Evaluation ---
    ml_eval = {
        "MAE":  round(float(mean_absolute_error(y_val, ml_preds)), 2),
        "RMSE": round(float(np.sqrt(mean_squared_error(y_val, ml_preds))), 2),
        "MAPE": round(_mape(y_val, ml_preds), 2),
        "validation_rows": len(y_val),
    }
    baseline_eval = {
        "MAE":  round(float(mean_absolute_error(y_val, baseline_preds)), 2),
        "RMSE": round(float(np.sqrt(mean_squared_error(y_val, baseline_preds))), 2),
        "MAPE": round(_mape(y_val, baseline_preds), 2),
    }

    # Feature importance
    importances = dict(zip(FEATURE_NAMES, model.feature_importances_.tolist()))

    # --- Persist ---
    metadata = {
        "version": "v1",
        "training_rows": int(len(train_df)),
        "data_period_start": str(df["invoice_date"].min().date()),
        "data_period_end":   str(df["invoice_date"].max().date()),
        "features": FEATURE_NAMES,
        "evaluation": ml_eval,
        "baseline_evaluation": baseline_eval,
        "feature_importance": importances,
        "data_quality": quality,
    }
    save(REVENUE_MODEL, model, metadata)
    logger.info("Revenue model trained. ML MAE=%.2f vs Baseline MAE=%.2f", ml_eval["MAE"], baseline_eval["MAE"])

    return {"trained": True, **metadata}
