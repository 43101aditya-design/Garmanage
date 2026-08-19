"""Pure feature helpers. No database access or production mutations live here."""
from __future__ import annotations

from typing import Any, Dict, List

from intelligence.config import MAX_WORKLOAD_MINUTES

FEATURE_NAMES = [
    "skill_match",
    "proficiency_score",
    "experience_years",
    "availability_score",
    "workload_headroom",
    "historical_success_rate",
    "historical_completed_jobs",
    "priority_score",
    "complexity_score",
]


def _number(value: Any, fallback: float) -> float:
    return fallback if value is None else float(value)


def job_priority_score(job: Dict[str, Any]) -> float:
    return {"LOW": 0.25, "NORMAL": 0.5, "HIGH": 0.75, "URGENT": 1.0}.get(
        str(job.get("priority", "NORMAL")).upper(), 0.5
    )


def job_complexity_score(job: Dict[str, Any]) -> float:
    return {"LOW": 0.25, "MEDIUM": 0.5, "HIGH": 0.75, "CRITICAL": 1.0}.get(
        str(job.get("complexity", "MEDIUM")).upper(), 0.5
    )


def feature_dict(job: Dict[str, Any], candidate: Dict[str, Any]) -> Dict[str, float]:
    """Return inference-time features only; actual completion duration is excluded."""
    workload = max(0.0, _number(candidate.get("workload_minutes"), 0.0))
    return {
        "skill_match": 1.0 if candidate.get("skill_match") is True else (0.5 if candidate.get("skill_match") is None else 0.0),
        "proficiency_score": min(1.0, max(0.0, _number(candidate.get("proficiency_score"), 0.5))),
        "experience_years": min(1.0, max(0.0, _number(candidate.get("experience_years"), 0.0) / 10.0)),
        "availability_score": min(1.0, max(0.0, _number(candidate.get("availability_score"), 0.5))),
        "workload_headroom": min(1.0, max(0.0, 1.0 - workload / MAX_WORKLOAD_MINUTES)),
        "historical_success_rate": min(1.0, max(0.0, _number(candidate.get("historical_success_rate"), 0.5))),
        "historical_completed_jobs": min(1.0, max(0.0, _number(candidate.get("historical_completed_jobs"), 0.0) / 50.0)),
        "priority_score": job_priority_score(job),
        "complexity_score": job_complexity_score(job),
    }


def vector_from_feature_dict(features: Dict[str, Any]) -> List[float]:
    return [_number(features.get(name), 0.5) for name in FEATURE_NAMES]
