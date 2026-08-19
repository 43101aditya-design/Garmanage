"""Cached XGBoost inference with an explicit deterministic cold-start fallback."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Iterable, Tuple

from intelligence.config import COLD_START_WEIGHTS, MODEL_VERSION
from intelligence.features.assignment_features import FEATURE_NAMES, feature_dict, vector_from_feature_dict

ARTIFACT_DIR = Path(__file__).resolve().parents[1] / "models" / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "assignment_model.json"
METADATA_PATH = ARTIFACT_DIR / "assignment_model_metadata.json"


class AssignmentRanker:
    def __init__(self) -> None:
        self._model = None
        self._metadata: Dict[str, Any] = {}
        self._loaded = False

    def _load(self) -> None:
        if self._loaded:
            return
        self._loaded = True
        if not MODEL_PATH.exists() or not METADATA_PATH.exists():
            return
        try:
            from xgboost import XGBClassifier
            with METADATA_PATH.open() as handle:
                self._metadata = json.load(handle)
            model = XGBClassifier()
            model.load_model(str(MODEL_PATH))
            self._model = model
        except Exception:
            # A missing/corrupt optional model must never turn into a fictional
            # ML recommendation. The caller will see COLD_START instead.
            self._model = None

    def status(self) -> Dict[str, Any]:
        self._load()
        return {
            "model_version": self._metadata.get("model_version", MODEL_VERSION),
            "mode": "ML_RANKING" if self._model is not None else "COLD_START",
            "trained": self._model is not None,
            "training_rows": self._metadata.get("training_rows", 0),
            "evaluation": self._metadata.get("evaluation"),
        }

    def score(self, job: Dict[str, Any], candidate: Dict[str, Any]) -> Tuple[float, str, Dict[str, float], float | None]:
        features = feature_dict(job, candidate)
        self._load()
        if self._model is not None:
            try:
                probability = float(self._model.predict_proba([vector_from_feature_dict(features)])[0][1])
                return probability, "ML_RANKING", features, probability
            except Exception:
                # Stale/incompatible models are treated as unavailable, never as
                # a successful ML prediction.
                self._model = None
        score = sum(features[name] * weight for name, weight in COLD_START_WEIGHTS.items())
        return round(score, 6), "COLD_START", features, None


ranker = AssignmentRanker()
