"""
Model registry: save, load, version, and report on trained prediction models.
Models are stored in python_service/model_artifacts/.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

ARTIFACT_DIR = Path(__file__).parent.parent.parent / "model_artifacts"
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

# Supported model names
REVENUE_MODEL     = "revenue_model_v1"
WORKLOAD_MODEL    = "workload_model_v1"
INV_DEMAND_MODEL  = "inventory_demand_model_v1"
DURATION_MODEL    = "duration_model_v1"

ALL_MODELS = [REVENUE_MODEL, WORKLOAD_MODEL, INV_DEMAND_MODEL, DURATION_MODEL]


def _meta_path(model_name: str) -> Path:
    return ARTIFACT_DIR / f"{model_name}.meta.json"


def _model_path(model_name: str) -> Path:
    return ARTIFACT_DIR / f"{model_name}.joblib"


def save(model_name: str, model: Any, metadata: Dict[str, Any]) -> Path:
    """Persist model + metadata. Returns the model path."""
    import joblib
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    model_path = _model_path(model_name)
    joblib.dump(model, model_path)
    metadata["model_name"] = model_name
    metadata["saved_at"] = datetime.now(timezone.utc).isoformat()
    with _meta_path(model_name).open("w") as f:
        json.dump(metadata, f, indent=2)
    logger.info("Saved model '%s' → %s", model_name, model_path)
    return model_path


def load(model_name: str) -> tuple[Any, Dict[str, Any]]:
    """Load model + metadata. Raises FileNotFoundError if not trained yet."""
    import joblib
    model_path = _model_path(model_name)
    meta_path = _meta_path(model_name)
    if not model_path.exists():
        raise FileNotFoundError(f"Model '{model_name}' not found — run training first")
    model = joblib.load(model_path)
    metadata: Dict[str, Any] = {}
    if meta_path.exists():
        with meta_path.open() as f:
            metadata = json.load(f)
    return model, metadata


def status(model_name: str) -> Dict[str, Any]:
    """Return registry status for a model."""
    meta_path = _meta_path(model_name)
    model_path = _model_path(model_name)
    if not model_path.exists():
        return {
            "model_name": model_name,
            "trained": False,
            "mode": "COLD_START",
            "message": "Model not trained yet — predictions use baseline fallback",
        }
    meta: Dict[str, Any] = {}
    if meta_path.exists():
        with meta_path.open() as f:
            meta = json.load(f)
    return {
        "model_name": model_name,
        "trained": True,
        "mode": "ML",
        "version": meta.get("version", "v1"),
        "trained_at": meta.get("saved_at"),
        "training_rows": meta.get("training_rows"),
        "data_period_start": meta.get("data_period_start"),
        "data_period_end": meta.get("data_period_end"),
        "features": meta.get("features", []),
        "evaluation": meta.get("evaluation", {}),
        "baseline_evaluation": meta.get("baseline_evaluation", {}),
    }


def all_model_status() -> Dict[str, Any]:
    """Status for all registered prediction models."""
    return {m: status(m) for m in ALL_MODELS}
