"""
Smart Job Prioritization Decision Scorer.
Evaluates appointment urgency, customer wait time, service complexity, duration, and parts readiness.
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

def score_job_priority(
    job_details: Dict[str, Any],
    hours_until_scheduled: Optional[float] = None,
    customer_wait_hours: float = 0.0,
    parts_available: bool = True,
    predicted_duration_mins: float = 60.0,
    is_vip_customer: bool = False,
) -> Dict[str, Any]:
    """
    Computes a grounded priority score (0-100) and priority category:
    CRITICAL (80-100), HIGH (60-79), MEDIUM (40-59), LOW (0-39)

    Returns score, tier, and explicit reason bullet points.
    """
    reasons: List[str] = []
    base_score = 30.0 # Standard baseline for incoming requests

    # 1. Schedule Urgency Factor
    if hours_until_scheduled is not None:
        if hours_until_scheduled < 0: # Overdue appointment
            urgency_points = 35.0
            reasons.append(f"Overdue schedule: Appointment passed by {abs(round(hours_until_scheduled, 1))} hours")
        elif hours_until_scheduled <= 2:
            urgency_points = 30.0
            reasons.append(f"Imminent start: Scheduled within {round(hours_until_scheduled, 1)} hours")
        elif hours_until_scheduled <= 6:
            urgency_points = 20.0
            reasons.append(f"Scheduled today within {round(hours_until_scheduled, 1)} hours")
        elif hours_until_scheduled <= 24:
            urgency_points = 10.0
            reasons.append("Scheduled tomorrow")
        else:
            urgency_points = 0.0
    else:
        urgency_points = 10.0

    # 2. Customer Wait Duration Factor
    if customer_wait_hours >= 48: # 2+ days waiting
        wait_points = 25.0
        reasons.append(f"Extended wait: Customer has been in queue for {round(customer_wait_hours / 24, 1)} days")
    elif customer_wait_hours >= 24:
        wait_points = 15.0
        reasons.append(f"Customer has been waiting {round(customer_wait_hours, 1)} hours")
    elif customer_wait_hours >= 6:
        wait_points = 8.0
        reasons.append(f"Intake pending for {round(customer_wait_hours, 1)} hours")
    else:
        wait_points = 0.0

    # 3. Service Severity & Duration Complexity
    service_type = job_details.get("service_type", "").lower()
    if any(s in service_type for s in ["brake", "steering", "engine_overhaul", "transmission", "safety"]):
        service_points = 15.0
        reasons.append(f"Critical safety system service ({service_type.replace('_', ' ')})")
    elif any(s in service_type for s in ["oil_change", "filter", "tire_rotation", "inspection"]):
        service_points = 5.0
    else:
        service_points = 8.0

    # 4. VIP / Fleet Customer Tier
    customer_points = 0.0
    if is_vip_customer or job_details.get("is_fleet", False):
        customer_points = 15.0
        reasons.append("High-priority enterprise fleet / VIP account agreement")

    # 5. Parts Readiness Deduction or Boost
    parts_points = 0.0
    if not parts_available:
        parts_points = -10.0
        reasons.append("Hold condition: Required replacement parts pending restock")
    else:
        parts_points = 5.0

    total_score = max(5.0, min(100.0, base_score + urgency_points + wait_points + service_points + customer_points + parts_points))

    # Priority Classification
    if total_score >= 80.0:
        priority_level = "CRITICAL"
    elif total_score >= 60.0:
        priority_level = "HIGH"
    elif total_score >= 40.0:
        priority_level = "MEDIUM"
    else:
        priority_level = "LOW"

    if not reasons:
        reasons.append("Standard service workflow with normal operational queue priority")

    return {
        "job_id": job_details.get("id"),
        "priority_level": priority_level,
        "priority_score": round(total_score, 1),
        "score_breakdown": {
            "base_score": base_score,
            "urgency_points": urgency_points,
            "wait_points": wait_points,
            "service_points": service_points,
            "customer_points": customer_points,
            "parts_points": parts_points
        },
        "reasons": reasons,
        "recommended_queue_action": {
            "CRITICAL": "Expedite immediately — allocate primary bay and alert lead mechanic.",
            "HIGH": "Queue in next available repair bay ahead of routine inspections.",
            "MEDIUM": "Maintain standard scheduled workflow queue.",
            "LOW": "Flexible timing — can be adjusted to fill capacity gaps or accommodate emergencies."
        }.get(priority_level, "Maintain standard queue.")
    }
