"""
Bottleneck Discovery & Root-Cause Diagnostic Engine for Digital Twin.
Analyzes queue buildup, bay congestion, skill shortages, and inventory stockouts.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def diagnose_workshop_bottleneck(
    state: Dict[str, Any],
    simulation_metrics: Dict[str, Any],
    constraint_results: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Identifies the primary operational bottleneck and provides clear root-cause evidence.
    """
    utilization = simulation_metrics.get("utilization_pct", 0.0)
    queue_backlog = simulation_metrics.get("queue_backlog_length", 0)
    avail_mechanics = simulation_metrics.get("available_mechanics", 1)
    bays_count = simulation_metrics.get("service_bays", 6)
    active_jobs = simulation_metrics.get("active_jobs", 0)
    inv_risk = simulation_metrics.get("inventory_risk_level", "LOW")
    critical_parts = simulation_metrics.get("critical_parts_depleted_count", 0)
    
    violations = (constraint_results or {}).get("violations", [])
    
    # 1. Check Inventory Stockout first (hard blocker)
    if critical_parts > 0 or inv_risk == "CRITICAL":
        depleted_parts = [p["name"] for p in state["inventory"] if p.get("quantity_in_stock", 0) <= 1]
        return {
            "bottleneck_type": "INVENTORY_STOCKOUT",
            "severity": "CRITICAL",
            "title": "Critical Spare Parts Depleted",
            "root_cause": f"{len(depleted_parts)} critical inventory item(s) are at zero or near-zero stock level.",
            "evidence": {
                "depleted_parts": depleted_parts,
                "inventory_risk_score": simulation_metrics.get("inventory_risk_score", 85.0),
                "delayed_jobs_impact": simulation_metrics.get("delayed_jobs_count", 2)
            },
            "affected_entities": {
                "parts": depleted_parts,
                "impacted_jobs_count": min(active_jobs, critical_parts * 2)
            },
            "remediation": "Initiate emergency supplier replenishment order for critical part batches."
        }

    # 2. Check Skill Deficit
    skill_violations = [v for v in violations if v.get("constraint") == "SKILL_REQUIREMENT"]
    if skill_violations:
        missing_skills = list(set([str(v.get("required_skills", [])) for v in skill_violations]))
        return {
            "bottleneck_type": "SKILL_DEFICIT",
            "severity": "HIGH",
            "title": "Specialized Skill Shortage",
            "root_cause": f"No available technician possesses specialized certifications: {', '.join(missing_skills)}.",
            "evidence": {
                "unmatched_work_orders": len(skill_violations),
                "required_specializations": missing_skills
            },
            "affected_entities": {
                "impacted_jobs": [v.get("job_id") for v in skill_violations]
            },
            "remediation": "Cross-train existing personnel in diagnostics or bring in float master technician."
        }

    # 3. Check Bay Saturation
    if active_jobs > (bays_count * 1.5):
        return {
            "bottleneck_type": "BAY_SATURATION",
            "severity": "HIGH",
            "title": "Physical Service Bay Saturation",
            "root_cause": f"Job volume ({active_jobs}) significantly exceeds physical workshop bay capacity ({bays_count} bays).",
            "evidence": {
                "service_bays": bays_count,
                "concurrent_jobs_seeking_bay": active_jobs,
                "bay_occupancy_ratio": round(active_jobs / max(1, bays_count), 2)
            },
            "affected_entities": {
                "service_bays": bays_count,
                "bay_backlog": active_jobs - bays_count
            },
            "remediation": "Stagger scheduled customer intake times across morning and afternoon shifts."
        }

    # 4. Check Mechanic Workforce Capacity
    if utilization >= 90.0 or queue_backlog >= (avail_mechanics * 2):
        return {
            "bottleneck_type": "MECHANIC_CAPACITY",
            "severity": "HIGH" if utilization < 100.0 else "CRITICAL",
            "title": "Workforce Labor Capacity Exhaustion",
            "root_cause": f"Technician pool ({avail_mechanics} active) operating at {utilization}% utilization with {queue_backlog} jobs queued.",
            "evidence": {
                "active_mechanics": avail_mechanics,
                "workload_utilization_pct": utilization,
                "avg_customer_wait_mins": simulation_metrics.get("avg_wait_mins", 45.0),
                "delayed_work_orders": simulation_metrics.get("delayed_jobs_count", 0)
            },
            "affected_entities": {
                "queued_jobs_count": queue_backlog,
                "active_mechanics_count": avail_mechanics
            },
            "remediation": "Deploy +1 on-call technician or authorize overtime shift to drain queue backlog."
        }

    # 5. Check Moderate Queue Congestion
    if utilization >= 75.0:
        return {
            "bottleneck_type": "QUEUE_CONGESTION",
            "severity": "MEDIUM",
            "title": "Elevated Queue Congestion",
            "root_cause": "Workshop operating close to saturation threshold (75-85% utilization).",
            "evidence": {
                "utilization_pct": utilization,
                "queue_backlog": queue_backlog,
                "avg_wait_mins": simulation_metrics.get("avg_wait_mins", 30.0)
            },
            "affected_entities": {
                "queued_jobs": queue_backlog
            },
            "remediation": "Prioritize high-value & urgent work orders; defer minor aesthetic jobs."
        }

    # 6. Nominal State
    return {
        "bottleneck_type": "NONE",
        "severity": "NOMINAL",
        "title": "Workshop Operating Within Nominal Parameters",
        "root_cause": f"Healthy workload distribution at {utilization}% utilization with sufficient buffer.",
        "evidence": {
            "utilization_pct": utilization,
            "avg_wait_mins": simulation_metrics.get("avg_wait_mins", 18.0),
            "sla_compliance_pct": simulation_metrics.get("sla_compliance_pct", 100.0)
        },
        "affected_entities": {},
        "remediation": "Maintain standard operating procedures and queue monitoring."
    }
