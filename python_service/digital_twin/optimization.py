"""
Advanced Multi-Objective Optimization Engine for Digital Twin.
Evaluates alternative operational configurations using OR-Tools CP-SAT
and finds the optimal configuration balancing waiting time, throughput,
workload distribution, and inventory risk.
"""
from __future__ import annotations

import copy
import logging
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

from digital_twin.constraints import validate_workshop_constraints
from digital_twin.simulation import simulate_workshop_dynamics

logger = logging.getLogger(__name__)


def optimize_workshop_configuration(
    state: Dict[str, Any],
    objective_weights: Optional[Dict[str, float]] = None,
    candidate_alternatives: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Evaluates alternative operational interventions and solves for the optimal configuration.
    """
    weights = {
        "waiting_time": 0.40,
        "throughput": 0.30,
        "workload_balance": 0.20,
        "inventory_risk": 0.10
    }
    if objective_weights:
        total = sum(objective_weights.values())
        if total > 0:
            weights = {k: v / total for k, v in objective_weights.items()}

    # 1. Generate candidate operational alternatives if not supplied
    if not candidate_alternatives:
        candidate_alternatives = generate_feasible_alternatives(state)

    evaluated_candidates = []
    
    for alt in candidate_alternatives:
        alt_state = copy.deepcopy(state)
        # Apply intervention
        if alt.get("action_type") == "ADD_FLOAT_MECHANIC":
            count = alt.get("count", 1)
            for i in range(count):
                alt_state["mechanics"].append({
                    "mechanic_id": f"REC-FLOAT-{i+1}",
                    "name": f"Master Float Technician {i+1}",
                    "status": "AVAILABLE",
                    "skills": ["Engine", "Brakes", "Diagnostics", "Electrical", "General"],
                    "specialization": "Master Diagnostics",
                    "experience_years": 8,
                    "active_jobs": 0,
                    "current_workload_mins": 0,
                    "max_daily_minutes": 480
                })
        elif alt.get("action_type") == "OVERTIME_EXTENSION":
            hours = alt.get("hours", 2.0)
            for m in alt_state["mechanics"]:
                if m.get("status") == "AVAILABLE":
                    m["max_daily_minutes"] += int(hours * 60)
            alt_state["garage"]["operating_hours"]["total_hours"] += hours
        elif alt.get("action_type") == "RESTAGE_SCHEDULE":
            # Sort jobs by priority first (URGENT -> HIGH -> NORMAL -> LOW)
            prio_map = {"URGENT": 0, "HIGH": 1, "NORMAL": 2, "LOW": 3}
            alt_state["jobs"].sort(key=lambda j: prio_map.get(j.get("priority", "NORMAL"), 2))
        elif alt.get("action_type") == "EXPEDITED_PARTS_ORDER":
            for p in alt_state["inventory"]:
                if p.get("quantity_in_stock", 0) <= p.get("reorder_level", 5):
                    p["quantity_in_stock"] += 15
                    p["stockout_risk"] = "LOW"
                    
        # Solve assignments using OR-Tools CP-SAT
        best_assignments, solver_type = solve_assignment_cp_sat(alt_state, weights)
        
        # Validate constraints
        c_check = validate_workshop_constraints(alt_state, best_assignments)
        
        # Simulate outcome
        metrics = simulate_workshop_dynamics(alt_state, best_assignments)
        
        # Calculate composite objective score (0 to 100, higher is better)
        # Components:
        # wait score: 100 - (wait_mins / 2.0)
        # throughput score: min(100, throughput * 50)
        # workload balance score: 100 - (max_util - min_util)
        # inventory score: 100 - inv_risk_score
        wait_score = max(0.0, min(100.0, 100.0 - (metrics["avg_wait_mins"] * 0.8)))
        tp_score = max(0.0, min(100.0, (metrics["jobs_completed_projected"] / max(1, metrics["active_jobs"])) * 100.0))
        inv_score = max(0.0, 100.0 - metrics["inventory_risk_score"])
        
        # Workload variance
        utils = [m["utilization_pct"] for m in metrics.get("mechanic_workloads", [])]
        bal_score = max(0.0, 100.0 - (max(utils) - min(utils))) if utils else 100.0
        
        composite_score = round(
            (weights["waiting_time"] * wait_score) +
            (weights["throughput"] * tp_score) +
            (weights["workload_balance"] * bal_score) +
            (weights["inventory_risk"] * inv_score),
            2
        )
        
        evaluated_candidates.append({
            "action_id": alt.get("action_id", "ALT-001"),
            "action_type": alt.get("action_type", "OPTIMIZED_BASELINE"),
            "title": alt.get("title", "Optimal Dispatching & Sequencing"),
            "description": alt.get("description", "Rebalance job assignments without additional capital outlay"),
            "is_feasible": c_check["is_feasible"],
            "composite_score": composite_score,
            "metrics": metrics,
            "solver_engine": solver_type,
            "assignments": best_assignments,
            "constraint_summary": c_check
        })

    # Sort evaluated candidates by composite score descending (feasible first)
    evaluated_candidates.sort(key=lambda x: (1 if x["is_feasible"] else 0, x["composite_score"]), reverse=True)
    
    top_recommendation = evaluated_candidates[0] if evaluated_candidates else None
    
    return {
        "status": "OPTIMIZATION_COMPLETE",
        "solver": top_recommendation["solver_engine"] if top_recommendation else "OR_TOOLS_CP_SAT",
        "objective_weights_used": weights,
        "recommended_configuration": top_recommendation,
        "all_evaluated_alternatives": evaluated_candidates
    }


def generate_feasible_alternatives(state: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generates standard feasible management options for evaluation."""
    return [
        {
            "action_id": "ALT-01-DYNAMIC-DISPATCH",
            "action_type": "RESTAGE_SCHEDULE",
            "title": "Smart Priority Sequencing & Dynamic Dispatch",
            "description": "Reorder queued jobs by strict SLA urgency and skill matching without extra cost."
        },
        {
            "action_id": "ALT-02-FLOAT-TECHNICIAN",
            "action_type": "ADD_FLOAT_MECHANIC",
            "count": 1,
            "title": "Engage +1 Master Float Technician",
            "description": "Deploy an on-call diagnostic specialist to expand workshop capacity by 480 mins."
        },
        {
            "action_id": "ALT-03-OVERTIME-WINDOW",
            "action_type": "OVERTIME_EXTENSION",
            "hours": 2.0,
            "title": "Authorize 2-Hour Evening Overtime Shift",
            "description": "Extend daily operating window by 2 hours to clear backlogged work orders."
        },
        {
            "action_id": "ALT-04-EXPEDITE-PARTS",
            "action_type": "EXPEDITED_PARTS_ORDER",
            "title": "Trigger Emergency Parts Delivery (15 Units)",
            "description": "Replenish brake and electrical parts immediately to prevent bay blockages."
        }
    ]


def solve_assignment_cp_sat(state: Dict[str, Any], weights: Dict[str, float]) -> Tuple[Dict[str, str], str]:
    """
    CP-SAT formulation for optimal mechanic-to-job matching.
    """
    mechanics = [m for m in state["mechanics"] if m.get("status") == "AVAILABLE"]
    jobs = state["jobs"]
    
    if not mechanics or not jobs:
        return {}, "DETERMINISTIC_EMPTY"
        
    try:
        from ortools.sat.python import cp_model
        model = cp_model.CpModel()
        
        # Decision variables: x[j, m] = 1 if job j assigned to mechanic m
        x = {}
        for j_idx, job in enumerate(jobs):
            for m_idx, mech in enumerate(mechanics):
                x[j_idx, m_idx] = model.NewBoolVar(f"x_{j_idx}_{m_idx}")
                
        # 1. Each job assigned to at most 1 mechanic
        for j_idx in range(len(jobs)):
            model.Add(sum(x[j_idx, m_idx] for m_idx in range(len(mechanics))) <= 1)
            
        # 2. Mechanic daily workload limit
        for m_idx, mech in enumerate(mechanics):
            max_mins = mech.get("max_daily_minutes", 480)
            cur_workload = mech.get("current_workload_mins", 0)
            model.Add(
                cur_workload + sum(x[j_idx, m_idx] * jobs[j_idx].get("estimated_duration_mins", 90) for j_idx in range(len(jobs))) <= max_mins
            )
            
        # 3. Objective: Maximize priority coverage and skill affinity
        objective_terms = []
        for j_idx, job in enumerate(jobs):
            prio_weight = 40 if job.get("priority") == "URGENT" else (25 if job.get("priority") == "HIGH" else 10)
            req_skills = [s.lower() for s in job.get("required_skills", [])]
            for m_idx, mech in enumerate(mechanics):
                mech_skills = [s.lower() for s in mech.get("skills", [])]
                has_skill = 1 if any(any(req in ms or ms in req for ms in mech_skills) for req in req_skills) else 0
                term_score = prio_weight + (has_skill * 30) - int(jobs[j_idx].get("estimated_duration_mins", 90) * 0.05)
                objective_terms.append(x[j_idx, m_idx] * term_score)
                
        model.Maximize(sum(objective_terms))
        
        solver = cp_model.CpSolver()
        solver.parameters.num_search_workers = 1
        solver.parameters.random_seed = 42
        solver.parameters.max_time_in_seconds = 2.0
        
        status = solver.Solve(model)
        
        assignments = {}
        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            for j_idx, job in enumerate(jobs):
                for m_idx, mech in enumerate(mechanics):
                    if solver.Value(x[j_idx, m_idx]) == 1:
                        assignments[job["job_id"]] = mech["mechanic_id"]
                        break
            return assignments, "OR_TOOLS_CP_SAT"
            
    except Exception as e:
        logger.debug("OR-Tools solver exception or unavailable, using deterministic solver fallback: %s", e)
        
    # Deterministic Greedy Fallback
    assignments = {}
    used_minutes = defaultdict(int)
    for job in sorted(jobs, key=lambda j: 0 if j.get("priority") == "URGENT" else (1 if j.get("priority") == "HIGH" else 2)):
        dur = job.get("estimated_duration_mins", 90)
        reqs = [s.lower() for s in job.get("required_skills", [])]
        
        best_m = None
        best_score = -9999
        for m in mechanics:
            m_id = m["mechanic_id"]
            if (used_minutes[m_id] + m.get("current_workload_mins", 0) + dur) <= m.get("max_daily_minutes", 480):
                m_skills = [s.lower() for s in m.get("skills", [])]
                skill_match = 1 if any(any(req in ms or ms in req for ms in m_skills) for req in reqs) else 0
                score = (skill_match * 50) - used_minutes[m_id]
                if score > best_score:
                    best_score = score
                    best_m = m_id
                    
        if best_m:
            assignments[job["job_id"]] = best_m
            used_minutes[best_m] += dur
            
    return assignments, "DETERMINISTIC_GREEDY_SOLVER"
