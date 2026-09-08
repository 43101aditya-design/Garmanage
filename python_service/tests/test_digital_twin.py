"""
Test Suite for Phase 9 Digital Twin + Advanced Optimization + What-If Intelligence.
Tests snapshots, 7 scenario types, OR-Tools optimization, constraints,
bottlenecks, multi-scenario comparisons, sensitivity sweeps, and zero-mutation guarantee.
"""
import copy
import hashlib
import json
import unittest

from digital_twin.snapshot import load_garage_snapshot, create_snapshot_hash
from digital_twin.scenario_engine import apply_scenario
from digital_twin.simulation import simulate_workshop_dynamics
from digital_twin.constraints import validate_workshop_constraints
from digital_twin.optimization import optimize_workshop_configuration
from digital_twin.bottlenecks import diagnose_workshop_bottleneck
from digital_twin.comparison import compare_scenarios
from digital_twin.sensitivity import run_sensitivity_analysis
from digital_twin.phase8_adapter import Phase8DecisionAdapter


class DigitalTwinTests(unittest.TestCase):
    def setUp(self):
        self.baseline_snapshot = load_garage_snapshot(db=None, garage_id="GAR-TEST-001")

    # ── Test 1: Snapshot Loading & Immutability ───────────────────────────────

    def test_snapshot_generation(self):
        self.assertEqual(self.baseline_snapshot["garage"]["garage_id"], "GAR-TEST-001")
        self.assertGreaterEqual(len(self.baseline_snapshot["mechanics"]), 4)
        self.assertGreaterEqual(len(self.baseline_snapshot["jobs"]), 5)
        self.assertGreaterEqual(len(self.baseline_snapshot["inventory"]), 4)
        self.assertEqual(self.baseline_snapshot["revenue_context"]["currency"], "INR")
        self.assertIn("snapshot_hash", self.baseline_snapshot)

    def test_zero_mutation_guarantee(self):
        """Verifies that running scenarios and simulations leaves original snapshot completely identical."""
        original_checksum = hashlib.sha256(json.dumps(self.baseline_snapshot, sort_keys=True).encode()).hexdigest()
        
        scenarios = [
            {"scenario_type": "MECHANIC_UNAVAILABLE", "parameters": {"unavailable_hours": 4}},
            {"scenario_type": "DEMAND_INCREASE", "parameters": {"increase_percentage": 50}},
            {"scenario_type": "ADDITIONAL_MECHANIC", "parameters": {"mechanic_count": 2}},
            {"scenario_type": "INVENTORY_REDUCTION", "parameters": {"reduction_percentage": 40}},
            {"scenario_type": "WORKING_HOURS_CHANGE", "parameters": {"delta_hours": -2}},
            {"scenario_type": "JOB_SURGE", "parameters": {"surge_job_count": 20}},
            {"scenario_type": "HIGH_PRIORITY_INJECTION", "parameters": {"priority_job_count": 3}},
        ]
        
        for scn in scenarios:
            sim_state = apply_scenario(self.baseline_snapshot, scn)
            metrics = simulate_workshop_dynamics(sim_state)
            self.assertGreater(metrics["utilization_pct"], 0)
            
        post_checksum = hashlib.sha256(json.dumps(self.baseline_snapshot, sort_keys=True).encode()).hexdigest()
        self.assertEqual(original_checksum, post_checksum, "Original snapshot was mutated during simulation!")

    # ── Test 2: Scenario Types ───────────────────────────────────────────────

    def test_scenario_mechanic_unavailable(self):
        sim_state = apply_scenario(self.baseline_snapshot, {
            "scenario_type": "MECHANIC_UNAVAILABLE",
            "parameters": {"unavailable_hours": 4.0}
        })
        meta = sim_state["scenario_meta"]
        self.assertEqual(meta["type"], "MECHANIC_UNAVAILABLE")
        self.assertEqual(meta["unavailable_hours"], 4.0)
        
        metrics = simulate_workshop_dynamics(sim_state)
        base_metrics = simulate_workshop_dynamics(self.baseline_snapshot)
        self.assertLess(metrics["available_mechanics"], base_metrics["available_mechanics"])

    def test_scenario_demand_increase(self):
        sim_state = apply_scenario(self.baseline_snapshot, {
            "scenario_type": "DEMAND_INCREASE",
            "parameters": {"increase_percentage": 50.0}
        })
        base_jobs = len(self.baseline_snapshot["jobs"])
        sim_jobs = len(sim_state["jobs"])
        self.assertGreater(sim_jobs, base_jobs)
        
        metrics = simulate_workshop_dynamics(sim_state)
        self.assertGreater(metrics["utilization_pct"], 0)

    def test_scenario_additional_mechanic(self):
        sim_state = apply_scenario(self.baseline_snapshot, {
            "scenario_type": "ADDITIONAL_MECHANIC",
            "parameters": {"mechanic_count": 2}
        })
        self.assertEqual(len(sim_state["mechanics"]), len(self.baseline_snapshot["mechanics"]) + 2)
        
        metrics = simulate_workshop_dynamics(sim_state)
        base_metrics = simulate_workshop_dynamics(self.baseline_snapshot)
        self.assertLessEqual(metrics["avg_wait_mins"], base_metrics["avg_wait_mins"])

    def test_scenario_inventory_reduction(self):
        sim_state = apply_scenario(self.baseline_snapshot, {
            "scenario_type": "INVENTORY_REDUCTION",
            "parameters": {"reduction_percentage": 80.0}
        })
        metrics = simulate_workshop_dynamics(sim_state)
        self.assertIn(metrics["inventory_risk_level"], ("HIGH", "CRITICAL"))

    def test_scenario_working_hours_change(self):
        sim_state = apply_scenario(self.baseline_snapshot, {
            "scenario_type": "WORKING_HOURS_CHANGE",
            "parameters": {"delta_hours": -3.0}
        })
        self.assertEqual(sim_state["garage"]["operating_hours"]["total_hours"], 7.0)
        metrics = simulate_workshop_dynamics(sim_state)
        self.assertEqual(metrics["operating_hours"], 7.0)

    def test_scenario_job_surge(self):
        sim_state = apply_scenario(self.baseline_snapshot, {
            "scenario_type": "JOB_SURGE",
            "parameters": {"surge_job_count": 15}
        })
        self.assertEqual(len(sim_state["jobs"]), len(self.baseline_snapshot["jobs"]) + 15)

    def test_scenario_high_priority_injection(self):
        sim_state = apply_scenario(self.baseline_snapshot, {
            "scenario_type": "HIGH_PRIORITY_INJECTION",
            "parameters": {"priority_job_count": 2}
        })
        self.assertEqual(sim_state["jobs"][0]["priority"], "URGENT")

    # ── Test 3: Constraint Enforcement & Infeasibility ───────────────────────

    def test_constraints_skill_and_availability(self):
        valid_assignments = {"JOB-101": "MEC-001"}
        c_res = validate_workshop_constraints(self.baseline_snapshot, valid_assignments)
        self.assertTrue(c_res["is_feasible"])

        mutated_state = copy.deepcopy(self.baseline_snapshot)
        mutated_state["mechanics"][0]["status"] = "UNAVAILABLE"
        infeasible_res = validate_workshop_constraints(mutated_state, {"JOB-101": mutated_state["mechanics"][0]["mechanic_id"]})
        self.assertFalse(infeasible_res["is_feasible"])
        self.assertTrue(any(v["constraint"] == "MECHANIC_AVAILABILITY" for v in infeasible_res["violations"]))

    # ── Test 4: OR-Tools CP-SAT Optimization ─────────────────────────────────

    def test_multi_objective_optimization(self):
        weights = {"waiting_time": 0.50, "throughput": 0.30, "workload_balance": 0.10, "inventory_risk": 0.10}
        opt_res = optimize_workshop_configuration(self.baseline_snapshot, objective_weights=weights)
        
        self.assertEqual(opt_res["status"], "OPTIMIZATION_COMPLETE")
        self.assertIsNotNone(opt_res["recommended_configuration"])
        self.assertGreater(opt_res["recommended_configuration"]["composite_score"], 0)
        self.assertGreaterEqual(len(opt_res["all_evaluated_alternatives"]), 3)

    # ── Test 5: Bottleneck Discovery ─────────────────────────────────────────

    def test_bottleneck_discovery_labor_exhaustion(self):
        sim_state = apply_scenario(self.baseline_snapshot, {
            "scenario_type": "JOB_SURGE",
            "parameters": {"surge_job_count": 30}
        })
        metrics = simulate_workshop_dynamics(sim_state)
        b_res = diagnose_workshop_bottleneck(sim_state, metrics)
        
        self.assertIn(b_res["bottleneck_type"], ("MECHANIC_CAPACITY", "BAY_SATURATION", "QUEUE_CONGESTION"))
        self.assertIn(b_res["severity"], ("HIGH", "CRITICAL"))
        self.assertIn("remediation", b_res)

    # ── Test 6: Multi-Scenario Comparison & Pareto Ranking ───────────────────

    def test_multi_scenario_comparison(self):
        scenarios = [
            {"name": "Scenario 1: Demand Surge", "scenario_type": "DEMAND_INCREASE", "parameters": {"increase_percentage": 40}},
            {"name": "Scenario 2: Add Float Tech", "scenario_type": "ADDITIONAL_MECHANIC", "parameters": {"mechanic_count": 1}},
            {"name": "Scenario 3: Short Shift", "scenario_type": "WORKING_HOURS_CHANGE", "parameters": {"delta_hours": -2}},
        ]
        comp_res = compare_scenarios(self.baseline_snapshot, scenarios)
        
        self.assertEqual(comp_res["status"], "COMPARISON_COMPLETE")
        self.assertEqual(len(comp_res["ranked_scenarios"]), 3)
        self.assertEqual([s["rank"] for s in comp_res["ranked_scenarios"]], [1, 2, 3])

    # ── Test 7: Sensitivity Analysis Sweeps ──────────────────────────────────

    def test_sensitivity_analysis_demand_sweep(self):
        sens_res = run_sensitivity_analysis(self.baseline_snapshot, sweep_type="DEMAND_VARIATION")
        
        self.assertEqual(sens_res["sweep_type"], "DEMAND_VARIATION")
        self.assertGreaterEqual(len(sens_res["data_points"]), 5)
        first_pt = sens_res["data_points"][0]
        last_pt = sens_res["data_points"][-1]
        self.assertGreaterEqual(last_pt["utilization_pct"], first_pt["utilization_pct"])
        self.assertIn("key_insight", sens_res)

    # ── Test 8: Phase 8 Decision Bridge Adapter ──────────────────────────────

    def test_phase8_decision_bridge(self):
        sim_metrics = {
            "utilization_pct": 92.5,
            "sla_compliance_pct": 85.0,
            "avg_wait_mins": 55.0,
            "sla_violations_count": 3,
            "financial_impact": {"realized_revenue_inr": 45000.0}
        }
        bottleneck = {"title": "Workforce Labor Capacity Exhaustion"}
        recommendation = {
            "title": "Deploy +1 On-Call Technician",
            "description": "Restores SLA compliance to 98%",
            "is_feasible": True,
            "metrics": {"utilization_pct": 74.0, "avg_wait_mins": 22.0}
        }
        
        bridge_payload = Phase8DecisionAdapter.bridge_simulation_to_decision_payload(
            scenario_type="JOB_SURGE",
            sim_metrics=sim_metrics,
            bottleneck=bottleneck,
            recommendation=recommendation
        )
        
        self.assertEqual(bridge_payload["integration_status"], "INTEGRATION_READY")
        self.assertEqual(bridge_payload["confidence_level"], "HIGH_CONFIDENCE")
        self.assertEqual(bridge_payload["confidence_score"], 92.0)
        self.assertGreaterEqual(len(bridge_payload["rationale"]), 3)


if __name__ == "__main__":
    unittest.main()
