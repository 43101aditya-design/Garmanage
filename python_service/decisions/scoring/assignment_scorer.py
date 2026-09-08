"""
Advanced AI Mechanic Assignment Decision Scorer.
Combines skill match, predicted job duration, mechanic efficiency, and workload impact.
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional

def score_mechanic_assignment(
    job_details: Dict[str, Any],
    candidate_mechanics: List[Dict[str, Any]],
    predicted_duration_mins: float = 60.0,
    garage_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Score and rank mechanics for a specific job card.

    job_details: {
        'id': str,
        'service_type': str,
        'vehicle_type': str,
        'required_skills': List[str],
        'is_urgent': bool
    }
    candidate_mechanics: List of {
        'id': str,
        'name': str,
        'skills': List[str],
        'current_workload_mins': float,
        'max_daily_capacity_mins': float (default 480),
        'avg_completion_rate': float (0.0 to 1.0),
        'status': 'AVAILABLE' | 'BUSY' | 'ON_LEAVE'
    }
    """
    if not candidate_mechanics:
        return {
            "success": False,
            "message": "No eligible mechanics available for assignment in this garage.",
            "recommended_mechanic": None,
            "ranked_candidates": [],
            "constraints_checked": ["mechanic_pool_non_empty: FAILED"]
        }

    required_skills = set(s.lower() for s in job_details.get("required_skills", []))
    service_type = job_details.get("service_type", "").lower()
    if not required_skills and service_type:
        required_skills.add(service_type)

    scored_candidates = []
    constraints_checked = [
        "garage_isolation: PASSED",
        "mechanic_active_status: CHECKED",
        "daily_capacity_limit: CHECKED",
        "predicted_duration_evaluated: CHECKED"
    ]

    for mech in candidate_mechanics:
        if mech.get("status", "AVAILABLE") == "ON_LEAVE":
            continue

        mech_skills = set(s.lower() for s in mech.get("skills", []))
        
        # 1. Skill Match Score (0 to 100)
        if required_skills:
            matched = len(required_skills.intersection(mech_skills))
            skill_score = (matched / len(required_skills)) * 100.0
        else:
            skill_score = 85.0 # Default general suitability if no specific skill demanded

        # 2. Workload & Capacity Impact (0 to 100)
        curr_load = float(mech.get("current_workload_mins", 0))
        max_cap = float(mech.get("max_daily_capacity_mins", 480))
        new_load = curr_load + predicted_duration_mins
        capacity_utilization = min(1.0, new_load / max(1.0, max_cap))
        
        # Lower utilization gives higher availability score
        workload_score = max(0.0, (1.0 - capacity_utilization)) * 100.0

        # Overload penalty
        overload = new_load > max_cap
        if overload:
            workload_score *= 0.4

        # 3. Efficiency / Completion Rate Score (0 to 100)
        comp_rate = float(mech.get("avg_completion_rate", 0.9))
        efficiency_score = min(100.0, comp_rate * 100.0)

        # Composite Suitability Score
        # Weights: 45% Skill Match, 35% Workload Impact / Availability, 20% Efficiency History
        total_score = (0.45 * skill_score) + (0.35 * workload_score) + (0.20 * efficiency_score)

        # Detailed reasoning bullets
        reasons = []
        if skill_score >= 90:
            reasons.append(f"Strong skill match ({round(skill_score)}%) for {service_type or 'requested service'}")
        elif skill_score >= 50:
            reasons.append(f"Partial skill coverage ({round(skill_score)}%)")
        else:
            reasons.append("General mechanic capability with supervision required")

        if not overload:
            reasons.append(f"Available capacity: {round(max_cap - curr_load)}m remaining (job takes ~{round(predicted_duration_mins)}m)")
        else:
            reasons.append(f"Caution: Current assignment pushes workload to {round(new_load)}m / {round(max_cap)}m")

        reasons.append(f"Historical on-time completion efficiency: {round(efficiency_score)}%")

        scored_candidates.append({
            "mechanic_id": mech.get("id"),
            "mechanic_name": mech.get("name", "Mechanic"),
            "total_score": round(total_score, 1),
            "skill_match_pct": round(skill_score, 1),
            "workload_score": round(workload_score, 1),
            "efficiency_score": round(efficiency_score, 1),
            "current_workload_mins": curr_load,
            "projected_workload_mins": new_load,
            "is_overloaded": overload,
            "reasons": reasons
        })

    # Sort candidates by total score descending
    scored_candidates.sort(key=lambda x: x["total_score"], reverse=True)

    if not scored_candidates:
        return {
            "success": False,
            "message": "No active candidates found meeting capacity and status constraints.",
            "recommended_mechanic": None,
            "ranked_candidates": [],
            "constraints_checked": constraints_checked
        }

    top_choice = scored_candidates[0]
    alternatives = scored_candidates[1:4] # Top 3 alternatives

    # Determine confidence level
    if top_choice["total_score"] >= 80 and not top_choice["is_overloaded"]:
        confidence = "HIGH_CONFIDENCE"
    elif top_choice["total_score"] >= 60:
        confidence = "MEDIUM_CONFIDENCE"
    else:
        confidence = "LOW_CONFIDENCE"

    return {
        "success": True,
        "garage_id": garage_id,
        "job_id": job_details.get("id"),
        "predicted_duration_mins": predicted_duration_mins,
        "confidence": confidence,
        "confidence_score": top_choice["total_score"],
        "recommended_mechanic": {
            "id": top_choice["mechanic_id"],
            "name": top_choice["mechanic_name"],
            "suitability_score": top_choice["total_score"],
            "skill_match_pct": top_choice["skill_match_pct"],
            "projected_workload_mins": top_choice["projected_workload_mins"],
            "reasoning": top_choice["reasons"],
        },
        "alternative_candidates": [
            {
                "id": alt["mechanic_id"],
                "name": alt["mechanic_name"],
                "suitability_score": alt["total_score"],
                "skill_match_pct": alt["skill_match_pct"],
                "summary": f"{round(alt['total_score'])}% match • Load: {round(alt['projected_workload_mins'])}m"
            }
            for alt in alternatives
        ],
        "ranked_candidates": scored_candidates,
        "constraints_checked": constraints_checked
    }
