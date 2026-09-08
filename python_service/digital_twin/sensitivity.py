"""
Sensitivity Analysis Engine for Digital Twin.
Performs parameter variation sweeps to identify operational inflection points,
capacity saturation thresholds, and ROI plateaus.
"""
from __future__ import annotations

import copy
import logging
from typing import Any, Dict, List, Optional

from digital_twin.simulation import simulate_workshop_dynamics

logger = logging.getLogger(__name__)


def run_sensitivity_analysis(
    baseline_snapshot: Dict[str, Any],
    sweep_type: str = "DEMAND_VARIATION",  # DEMAND_VARIATION, MECHANIC_COUNT, WORKING_HOURS
    custom_range: Optional[List[float]] = None
) -> Dict[str, Any]:
    """
    Executes a parameter sweep and records resulting KPI curves.
    """
    results: List[Dict[str, Any]] = []
    
    # ── 1. Demand Variation Sweep (0% to +100% in 10% steps) ───────────────────
    if sweep_type == "DEMAND_VARIATION":
        steps = custom_range or [0.0, 10.0, 20.0, 30.0, 40.0, 50.0, 75.0, 100.0]
        base_jobs = baseline_snapshot["jobs"]
        
        for pct in steps:
            sim_state = copy.deepcopy(baseline_snapshot)
            extra_count = int(round(len(base_jobs) * (pct / 100.0)))
            for i in range(extra_count):
                sim_state["jobs"].append({
                    "job_id": f"SWEEP-J-{i+1}",
                    "service_type": "Periodic Service",
                    "priority": "NORMAL",
                    "status": "READY_FOR_ASSIGNMENT",
                    "estimated_duration_mins": 90,
                    "price_inr": 3500.0
                })
            metrics = simulate_workshop_dynamics(sim_state)
            results.append({
                "parameter_value": pct,
                "parameter_label": f"+{int(pct)}% Demand",
                "active_jobs": len(sim_state["jobs"]),
                "utilization_pct": metrics["utilization_pct"],
                "avg_wait_mins": metrics["avg_wait_mins"],
                "delayed_jobs": metrics["delayed_jobs_count"],
                "throughput_jobs_day": metrics["jobs_completed_projected"],
                "realized_revenue_inr": metrics["financial_impact"]["realized_revenue_inr"]
            })
            
        inflection_point = next((r for r in results if r["utilization_pct"] >= 85.0), None)
        insight = f"Workshop crosses 85% bottleneck threshold at +{inflection_point['parameter_value']}% demand" if inflection_point else "Workshop operates below 85% across tested range"

    # ── 2. Mechanic Count Sweep (1 to 10 mechanics) ──────────────────────────
    elif sweep_type == "MECHANIC_COUNT":
        steps = custom_range or [2, 3, 4, 5, 6, 7, 8, 10]
        
        for count in steps:
            sim_state = copy.deepcopy(baseline_snapshot)
            current_count = len(sim_state["mechanics"])
            if int(count) > current_count:
                for i in range(int(count) - current_count):
                    sim_state["mechanics"].append({
                        "mechanic_id": f"SWEEP-M-{i+1}",
                        "name": f"Technician {current_count + i + 1}",
                        "status": "AVAILABLE",
                        "skills": ["General", "Engine", "Brakes"],
                        "specialization": "General Technician",
                        "experience_years": 4,
                        "active_jobs": 0,
                        "current_workload_mins": 0,
                        "max_daily_minutes": 480
                    })
            elif int(count) < current_count:
                sim_state["mechanics"] = sim_state["mechanics"][:int(count)]
                
            metrics = simulate_workshop_dynamics(sim_state)
            results.append({
                "parameter_value": int(count),
                "parameter_label": f"{int(count)} Mechanics",
                "available_mechanics": metrics["available_mechanics"],
                "utilization_pct": metrics["utilization_pct"],
                "avg_wait_mins": metrics["avg_wait_mins"],
                "delayed_jobs": metrics["delayed_jobs_count"],
                "throughput_jobs_day": metrics["jobs_completed_projected"],
                "realized_revenue_inr": metrics["financial_impact"]["realized_revenue_inr"]
            })
            
        diminishing_returns = next((r for r in results if r["utilization_pct"] <= 50.0), None)
        insight = f"Adding more than {diminishing_returns['parameter_value']} mechanics yields diminishing returns (utilization < 50%)" if diminishing_returns else "Workforce additions steadily improve throughput"

    # ── 3. Operating Hours Sweep (6h to 12h) ─────────────────────────────────
    else:
        steps = custom_range or [6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0]
        for hours in steps:
            sim_state = copy.deepcopy(baseline_snapshot)
            sim_state["garage"]["operating_hours"]["total_hours"] = float(hours)
            new_mins = int(hours * 60 * 0.85)
            for m in sim_state["mechanics"]:
                if m.get("status") == "AVAILABLE":
                    m["max_daily_minutes"] = new_mins
                    
            metrics = simulate_workshop_dynamics(sim_state)
            results.append({
                "parameter_value": float(hours),
                "parameter_label": f"{float(hours)}h Shift",
                "operating_hours": float(hours),
                "utilization_pct": metrics["utilization_pct"],
                "avg_wait_mins": metrics["avg_wait_mins"],
                "delayed_jobs": metrics["delayed_jobs_count"],
                "throughput_jobs_day": metrics["jobs_completed_projected"],
                "realized_revenue_inr": metrics["financial_impact"]["realized_revenue_inr"]
            })
        insight = "Extending hours directly relieves queue backlogs without adding headcount."

    return {
        "sweep_type": sweep_type,
        "data_points": results,
        "key_insight": insight,
        "baseline_parameter": results[0] if results else None
    }
