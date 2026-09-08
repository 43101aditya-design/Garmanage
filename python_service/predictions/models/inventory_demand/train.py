"""Inventory demand model training — one global GBR model across all parts."""
from __future__ import annotations
import logging
from typing import Any, Dict
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from predictions.preprocessing.data_quality import check_and_clean, min_rows_check
from predictions.models.registry import save, INV_DEMAND_MODEL
from predictions.models.inventory_demand.features import build_features, feature_matrix, FEATURE_NAMES

logger = logging.getLogger(__name__)
MIN_ROWS = 20


def train_inventory_demand_model(df: pd.DataFrame) -> Dict[str, Any]:
    """
    df must have: usage_date, weekly_quantity, part_id, garage_id
    """
    df, quality = check_and_clean(
        df,
        numeric_cols=["weekly_quantity"],
        non_negative_cols=["weekly_quantity"],
        date_col="usage_date",
        outlier_cols=["weekly_quantity"],
    )
    err = min_rows_check(df, MIN_ROWS, "inventory demand data")
    if err:
        return {"trained": False, "reason": err, "data_quality": quality}

    df = build_features(df)
    df = df.dropna(subset=FEATURE_NAMES)
    err = min_rows_check(df, 12, "inventory demand features")
    if err:
        return {"trained": False, "reason": err}

    split = max(8, int(len(df) * 0.8))
    train_df, val_df = df.iloc[:split], df.iloc[split:]
    X_train = feature_matrix(train_df).values
    y_train = train_df["weekly_quantity"].values.astype(float)

    baseline_preds = val_df["rolling_14d_avg_qty"].values.astype(float)
    y_val = val_df["weekly_quantity"].values.astype(float)

    model = GradientBoostingRegressor(n_estimators=150, max_depth=3, learning_rate=0.08, random_state=42)
    model.fit(X_train, y_train)
    ml_preds = model.predict(feature_matrix(val_df).values)

    ml_eval = {
        "MAE":  round(float(mean_absolute_error(y_val, ml_preds)), 3),
        "RMSE": round(float(np.sqrt(mean_squared_error(y_val, ml_preds))), 3),
        "validation_rows": len(y_val),
    }
    baseline_eval = {
        "MAE":  round(float(mean_absolute_error(y_val, baseline_preds)), 3),
        "RMSE": round(float(np.sqrt(mean_squared_error(y_val, baseline_preds))), 3),
    }

    metadata = {
        "version": "v1",
        "training_rows": int(len(train_df)),
        "data_period_start": str(df["usage_date"].min().date()),
        "data_period_end":   str(df["usage_date"].max().date()),
        "features": FEATURE_NAMES,
        "evaluation": ml_eval,
        "baseline_evaluation": baseline_eval,
        "feature_importance": dict(zip(FEATURE_NAMES, model.feature_importances_.tolist())),
        "data_quality": quality,
    }
    save(INV_DEMAND_MODEL, model, metadata)
    return {"trained": True, **metadata}
