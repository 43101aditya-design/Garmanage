"""Explicit offline training pipeline. It is not invoked by recommendation requests."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from intelligence.config import MIN_TRAINING_ROWS, MODEL_VERSION
from intelligence.features.assignment_features import FEATURE_NAMES, vector_from_feature_dict
from intelligence.ranking.ranker import ARTIFACT_DIR, METADATA_PATH, MODEL_PATH, ranker


def train(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    if len(rows) < MIN_TRAINING_ROWS:
        return {"trained": False, "reason": f"Insufficient historical data: need at least {MIN_TRAINING_ROWS} assignment-time snapshots."}
    ordered = sorted(rows, key=lambda row: str(row.get("completed_at") or row.get("created_at") or ""))
    labels = [int(row["label"]) for row in ordered]
    if len(set(labels)) < 2:
        return {"trained": False, "reason": "Insufficient outcome variation for an XGBoost suitability model."}
    split = max(1, int(len(ordered) * 0.8))
    if len(set(labels[:split])) < 2 or not labels[split:]:
        return {"trained": False, "reason": "Chronological train/validation split does not contain the required outcome variation."}
    try:
        from xgboost import XGBClassifier
    except ImportError:
        return {"trained": False, "reason": "XGBoost is not installed in the intelligence service environment."}
    train_x = [vector_from_feature_dict(row["feature_snapshot"]) for row in ordered[:split]]
    test_x = [vector_from_feature_dict(row["feature_snapshot"]) for row in ordered[split:]]
    model = XGBClassifier(n_estimators=100, max_depth=3, learning_rate=0.05, subsample=0.9, colsample_bytree=1.0, random_state=42, n_jobs=1, eval_metric="logloss")
    model.fit(train_x, labels[:split])
    probabilities = model.predict_proba(test_x)[:, 1]
    predictions = [int(value >= 0.5) for value in probabilities]
    accuracy = sum(prediction == label for prediction, label in zip(predictions, labels[split:])) / len(predictions)
    # Candidate-set membership is not collected by the legacy schema, therefore
    # ranking metrics are honestly reported as unavailable until such groups exist.
    evaluation = {"validation_rows": len(predictions), "classification_accuracy": accuracy, "ranking_metrics": None, "ranking_metrics_reason": "Candidate-set snapshots are required to calculate Precision@K, Recall@K, Top-K accuracy, or NDCG@K."}
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    model.save_model(str(MODEL_PATH))
    metadata = {"model_version": MODEL_VERSION, "training_rows": len(rows), "feature_names": FEATURE_NAMES, "trained_at": datetime.now(timezone.utc).isoformat(), "evaluation": evaluation}
    with METADATA_PATH.open("w") as handle:
        json.dump(metadata, handle)
    ranker._loaded = False
    ranker._model = None
    ranker._metadata = {}
    return {"trained": True, **metadata}
