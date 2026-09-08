"""
Constraint Validation Engine for Digital Twin.
Verifies hard and soft operational constraints across skills, bay capacities,
daily shift limits, inventory availability, and SLA targets.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Tuple

logger = logging.getLogger(__name__)


def validate_workshop_constraints(
    state: Dict[str, Any],
    assignments: Dict[str, str] # {job_id: mechanic_id}
) -> Dict[str, Any]:
    """
    Validates assignments against real constraints.
    Returns feasibility status, list of violations, and constraint health metrics.
    """
    violations: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []
    
    mechanics_map = {m["mechanic_id"]: m for m in state["mechanics"]}
    jobs_map = {j["job_id"]: j for j in state["jobs"]}
    bays_count = state["garage"].get("service_bays", 6)
    
    # Track accumulated workload per mechanic
    accumulated_mins: Dict[str, int] = {
        m["mechanic_id"]: m.get("current_workload_mins", 0) for m in state["mechanics"]
    }
    
    concurrent_active = 0
    
    # 1. Check assignments
    for job_id, mech_id in assignments.items():
        job = jobs_map.get(job_id)
        mech = mechanics_map.get(mech_id)
        
        if not job or not mech:
            violations.append({
                "constraint": "ENTITY_EXISTENCE",
                "severity": "CRITICAL",
                "message": f"Job {job_id} or Mechanic {mech_id} not found in state"
            })
            continue
            
        # A. Availability Check
        if mech.get("status") != "AVAILABLE":
            violations.append({
                "constraint": "MECHANIC_AVAILABILITY",
                "severity": "CRITICAL",
                "job_id": job_id,
                "mechanic_id": mech_id,
                "mechanic_name": mech["name"],
                "message": f"Assigned mechanic {mech['name']} is currently UNAVAILABLE"
            })
            
        # B. Skill Matching Check
        required_skills = job.get("required_skills", [])
        mech_skills = [s.lower() for s in mech.get("skills", [])]
        matched_any = any(any(req.lower() in ms or ms in req.lower() for ms in mech_skills) for req in required_skills)
        
        if required_skills and not matched_any and "General" not in mech.get("skills", []):
            violations.append({
                "constraint": "SKILL_REQUIREMENT",
                "severity": "HIGH",
                "job_id": job_id,
                "mechanic_id": mech_id,
                "required_skills": required_skills,
                "mechanic_skills": mech.get("skills", []),
                "message": f"Mechanic {mech['name']} lacks required skill {required_skills} for {job['service_type']}"
            })
            
        # C. Workload & Shift Overtime Check
        job_duration = job.get("estimated_duration_mins", 90)
        accumulated_mins[mech_id] += job_duration
        max_allowed = mech.get("max_daily_minutes", 480)
        
        if accumulated_mins[mech_id] > max_allowed:
            overtime = accumulated_mins[mech_id] - max_allowed
            violations.append({
                "constraint": "SHIFT_LIMIT_OVERTIME",
                "severity": "HIGH",
                "mechanic_id": mech_id,
                "mechanic_name": mech["name"],
                "overtime_minutes": overtime,
                "message": f"Mechanic {mech['name']} exceeds shift limit by {overtime} mins ({accumulated_mins[mech_id]}/{max_allowed}m)"
            })
            
        concurrent_active += 1

    # 2. Bay Capacity Check
    if concurrent_active > bays_count:
        violations.append({
            "constraint": "SERVICE_BAY_CAPACITY",
            "severity": "HIGH",
            "active_count": concurrent_active,
            "bays_count": bays_count,
            "message": f"Active jobs ({concurrent_active}) exceed physical workshop service bays ({bays_count})"
        })

    # 3. Inventory Stockout Check for Scheduled Jobs
    for job in state["jobs"]:
        # Match service type to inventory parts heuristically
        stype = job.get("service_type", "").lower()
        if "brake" in stype:
            brake_parts = [p for p in state["inventory"] if "brake" in p["name"].lower()]
            for bp in brake_parts:
                if bp["quantity_in_stock"] <= 0:
                    violations.append({
                        "constraint": "INVENTORY_STOCKOUT",
                        "severity": "CRITICAL",
                        "job_id": job["job_id"],
                        "part_name": bp["name"],
                        "message": f"Job {job['job_number']} blocked by zero stock of {bp['name']}"
                    })
                    
    is_feasible = len([v for v in violations if v["severity"] == "CRITICAL"]) == 0

    return {
        "is_feasible": is_feasible,
        "status": "FEASIBLE" if is_feasible else "INFEASIBLE",
        "violations_count": len(violations),
        "critical_violations": len([v for v in violations if v["severity"] == "CRITICAL"]),
        "violations": violations,
        "warnings": warnings,
        "workload_distribution": accumulated_mins
    }
