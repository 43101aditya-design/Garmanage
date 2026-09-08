"""
Workload Capacity Decision Scorer.
Converts Phase 7 predicted daily jobs & garage capacity into actionable mitigation strategies.
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional

def evaluate_workload_decisions(
    predicted_jobs: float,
    active_mechanics: int,
    avg_jobs_per_mechanic_day: float = 3.0,
    pending_appointments: List[Dict[str, Any]] = None,
    garage_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Calculates operational capacity vs predicted job intake and returns
    structured recommendations with expected overload reduction impact.
    """
    if pending_appointments is None:
        pending_appointments = []

    daily_capacity = active_mechanics * avg_jobs_per_mechanic_day
    utilization_rate = (predicted_jobs / max(1.0, daily_capacity)) * 100.0

    if utilization_rate > 120.0:
        risk_level = "HIGH"
        overload_jobs = max(1, round(predicted_jobs - daily_capacity))
    elif utilization_rate >= 95.0:
        risk_level = "MEDIUM"
        overload_jobs = 0
    else:
        risk_level = "LOW"
        overload_jobs = 0

    recommended_actions = []
    expected_impact = ""

    if risk_level == "HIGH":
        needed_mechanics = max(1, round((predicted_jobs - daily_capacity) / avg_jobs_per_mechanic_day))
        recommended_actions = [
            {
                "action_id": "REBALANCE_ROSTER",
                "title": f"Assign {needed_mechanics} additional mechanic to peak hours",
                "impact": f"Expands bay capacity by ~{needed_mechanics * round(avg_jobs_per_mechanic_day)} jobs",
                "priority": "HIGH"
            },
            {
                "action_id": "RESCHEDULE_ROUTINE",
                "title": "Shift 2 flexible routine maintenance appointments to following day",
                "impact": "Reduces queue congestion by ~15%",
                "priority": "MEDIUM"
            },
            {
                "action_id": "PRESTAGE_PARTS",
                "title": "Pre-stage fast-moving service parts in main repair bay",
                "impact": "Saves ~15 mins per job intake",
                "priority": "LOW"
            }
        ]
        expected_impact = f"Overload index reduced from {round(utilization_rate)}% to ~92% (Normal operating threshold)."

    elif risk_level == "MEDIUM":
        recommended_actions = [
            {
                "action_id": "MONITOR_INTAKE",
                "title": "Maintain standard staffing and monitor walk-in requests closely",
                "impact": "Maintains 95-100% capacity balance without extra labor overhead",
                "priority": "LOW"
            }
        ]
        expected_impact = "Workshop operates at optimal ~95% utilization."

    else:
        recommended_actions = [
            {
                "action_id": "OFFER_PROMOTION",
                "title": "Underutilized capacity available: Accept emergency drive-ins or schedule overdue vehicle follow-ups",
                "impact": "Increases daily revenue potential",
                "priority": "LOW"
            }
        ]
        expected_impact = "Fills idle repair bays."

    return {
        "garage_id": garage_id,
        "predicted_jobs": round(predicted_jobs, 1),
        "active_mechanics": active_mechanics,
        "daily_capacity_jobs": round(daily_capacity, 1),
        "utilization_rate_pct": round(utilization_rate, 1),
        "workload_risk_level": risk_level,
        "recommended_actions": recommended_actions,
        "expected_impact": expected_impact,
        "confidence": "HIGH_CONFIDENCE" if active_mechanics > 0 else "MEDIUM_CONFIDENCE"
    }
