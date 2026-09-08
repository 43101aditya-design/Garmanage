"""Service duration model training."""
from __future__ import annotations
import json, logging
from typing import Any, Dict
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from predictions.preprocessing.data_quality import check_and_clean, min_rows_check
from predictions.models.registry import save, DURATION_MODEL, _meta_path
from predictions.models.duration.features import build_encoders, build_features, FEATURE_NAMES

logger = logging.getLogger(__name__)
MIN_ROWS = 10


def train_duration_model(df: pd.DataFrame, mech_perf: pd.DataFrame) -> Dict[str, Any]:
    df, quality = check_and_clean(
        df,
        numeric_cols=["duration_minutes"],
        non_negative_cols=["duration_minutes"],
        outlier_cols=["duration_minutes"],
    )
    # Filter realistic durations (10 min – 24 hours)
    df = df[(df["duration_minutes"] >= 10) & (df["duration_minutes"] <= 1440)]
    err = min_rows_check(df, MIN_ROWS, "duration data")
    if err:
        return {"trained": False, "reason": err, "data_quality": quality}

    encoders = build_encoders(df)
    df_feat = build_features(df, encoders, mech_perf)
    df_feat = df_feat.dropna(subset=FEATURE_NAMES)
    err = min_rows_check(df_feat, 8, "duration features")
    if err:
        return {"trained": False, "reason": err}

    split = max(5, int(len(df_feat) * 0.8))
    train_df, val_df = df_feat.iloc[:split], df_feat.iloc[split:]
    X_train = train_df[FEATURE_NAMES].values.astype(float)
    y_train = train_df["duration_minutes"].values.astype(float)

    # Baseline: median per service type
    median_by_type = df_feat.groupby("service_type_enc")["duration_minutes"].median()
    baseline_preds = val_df["service_type_enc"].map(median_by_type).fillna(df_feat["duration_minutes"].median()).values
    y_val = val_df["duration_minutes"].values.astype(float)

    model = GradientBoostingRegressor(n_estimators=150, max_depth=3, learning_rate=0.08, random_state=42)
    model.fit(X_train, y_train)
    ml_preds = model.predict(val_df[FEATURE_NAMES].values.astype(float))

    ml_eval = {
        "MAE_minutes":  round(float(mean_absolute_error(y_val, ml_preds)), 2),
        "RMSE_minutes": round(float(np.sqrt(mean_squared_error(y_val, ml_preds))), 2),
        "validation_rows": len(y_val),
    }
    baseline_eval = {
        "MAE_minutes":  round(float(mean_absolute_error(y_val, baseline_preds)), 2),
        "RMSE_minutes": round(float(np.sqrt(mean_squared_error(y_val, baseline_preds))), 2),
    }

    metadata = {
        "version": "v1",
        "training_rows": int(len(train_df)),
        "features": FEATURE_NAMES,
        "evaluation": ml_eval,
        "baseline_evaluation": baseline_eval,
        "feature_importance": dict(zip(FEATURE_NAMES, model.feature_importances_.tolist())),
        "encoders": encoders,
        "data_quality": quality,
    }
    save(DURATION_MODEL, model, metadata)
    return {"trained": True, **metadata}
