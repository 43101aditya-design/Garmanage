"""
Multi-Scenario Comparison & Pareto Ranking Engine for Digital Twin.
Compares N hypothetical scenarios side-by-side against the baseline.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from digital_twin.constraints import validate_workshop_constraints
from digital_twin.optimization import optimize_workshop_configuration
from digital_twin.scenario_engine import apply_scenario
from digital_twin.simulation import simulate_workshop_dynamics

logger = logging.getLogger(__name__)


def compare_scenarios(
    baseline_snapshot: Dict[str, Any],
    scenarios: List[Dict[str, Any]],
    objective_weights: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Executes multiple scenarios against the baseline snapshot and ranks them.
    """
    weights = objective_weights or {
        "waiting_time": 0.40,
        "throughput": 0.30,
        "workload_balance": 0.20,
        "inventory_risk": 0.10
    }
    
    # 1. Evaluate baseline
    base_metrics = simulate_workshop_dynamics(baseline_snapshot)
    
    evaluated_scenarios = []
    
    for idx, scn in enumerate(scenarios):
        sim_state = apply_scenario(baseline_snapshot, scn)
        
        # Simulate
        metrics = simulate_workshop_dynamics(sim_state)
        
        # Validate constraints
        c_check = validate_workshop_constraints(sim_state, {})
        
        # Optimization recommendations for this scenario
        opt_res = optimize_workshop_configuration(sim_state, weights)
        rec = opt_res.get("recommended_configuration")
        
        # Calculate composite score
        wait_score = max(0.0, min(100.0, 100.0 - (metrics["avg_wait_mins"] * 0.8)))
        tp_score = max(0.0, min(100.0, (metrics["jobs_completed_projected"] / max(1, metrics["active_jobs"])) * 100.0))
        inv_score = max(0.0, 100.0 - metrics["inventory_risk_score"])
        utils = [m["utilization_pct"] for m in metrics.get("mechanic_workloads", [])]
        bal_score = max(0.0, 100.0 - (max(utils) - min(utils))) if utils else 100.0
        
        composite_score = round(
            (weights["waiting_time"] * wait_score) +
            (weights["throughput"] * tp_score) +
            (weights["workload_balance"] * bal_score) +
            (weights["inventory_risk"] * inv_score),
            2
        )
        
        # Calculate delta vs baseline
        wait_delta_mins = round(metrics["avg_wait_mins"] - base_metrics["avg_wait_mins"], 1)
        util_delta_pct = round(metrics["utilization_pct"] - base_metrics["utilization_pct"], 1)
        rev_delta_inr = round(
            metrics["financial_impact"]["realized_revenue_inr"] - base_metrics["financial_impact"]["realized_revenue_inr"],
            2
        )
        
        evaluated_scenarios.append({
            "scenario_index": idx + 1,
            "scenario_name": scn.get("name", f"Scenario {idx + 1}"),
            "scenario_type": scn.get("scenario_type", "CUSTOM"),
            "parameters": scn.get("parameters", {}),
            "is_feasible": c_check["is_feasible"],
            "composite_score": composite_score,
            "metrics": metrics,
            "delta_vs_baseline": {
                "wait_time_delta_mins": wait_delta_mins,
                "utilization_delta_pct": util_delta_pct,
                "realized_revenue_delta_inr": rev_delta_inr,
                "delayed_jobs_delta": metrics["delayed_jobs_count"] - base_metrics["delayed_jobs_count"]
            },
            "recommendation": {
                "title": rec.get("title") if rec else "Standard Dispatching",
                "composite_score": rec.get("composite_score") if rec else composite_score,
                "projected_wait_mins": rec["metrics"]["avg_wait_mins"] if rec else metrics["avg_wait_mins"]
            }
        })
        
    # Rank scenarios
    evaluated_scenarios.sort(key=lambda s: (1 if s["is_feasible"] else 0, s["composite_score"]), reverse=True)
    
    for rank, scn in enumerate(evaluated_scenarios, 1):
        scn["rank"] = rank
        
    return {
        "status": "COMPARISON_COMPLETE",
        "scenarios_evaluated_count": len(scenarios),
        "baseline_metrics": base_metrics,
        "ranked_scenarios": evaluated_scenarios,
        "best_scenario": evaluated_scenarios[0] if evaluated_scenarios else None,
        "objective_weights_applied": weights
    }
