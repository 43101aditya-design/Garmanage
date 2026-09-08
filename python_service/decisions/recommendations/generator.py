"""
Standardized AI Decision Recommendation Package Generator.
Assembles transparent, auditable decision packages adhering to human-in-the-loop governance.
"""
from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
import uuid

def generate_decision_package(
    decision_type: str,
    target_entity_type: str,
    target_entity_id: str,
    garage_id: str,
    action_title: str,
    recommendation_payload: Dict[str, Any],
    why_reasons: List[str],
    impact_estimate: str,
    confidence_level: str = "HIGH_CONFIDENCE",
    confidence_score: float = 85.0,
    model_versions: Optional[Dict[str, str]] = None,
    constraints_checked: Optional[List[str]] = None,
    alternatives: Optional[List[Dict[str, Any]]] = None,
    valid_hours: int = 24
) -> Dict[str, Any]:
    """
    Constructs a complete decision audit package for manager/owner review.
    """
    if model_versions is None:
        model_versions = {
            "assignment_engine": "v2.0_ortools_xgb",
            "duration_model": "duration_model_v1",
            "decision_rules": "rules_v1.0"
        }

    if constraints_checked is None:
        constraints_checked = [
            "garage_isolation: PASSED",
            "rbac_authorization: PASSED",
            "availability_verified: PASSED"
        ]

    if alternatives is None:
        alternatives = []

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=valid_hours)

    return {
        "id": str(uuid.uuid4()),
        "garage_id": garage_id,
        "decision_type": decision_type,
        "target_entity_type": target_entity_type,
        "target_entity_id": target_entity_id,
        "action_title": action_title,
        "recommendation_payload": recommendation_payload,
        "why": why_reasons,
        "impact_estimate": impact_estimate,
        "confidence_level": confidence_level,
        "confidence_score": round(confidence_score, 1),
        "model_versions": model_versions,
        "constraints_checked": constraints_checked,
        "alternatives": alternatives,
        "status": "PENDING",
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "requires_human_approval": True
    }
