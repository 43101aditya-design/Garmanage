"""
Unit tests for Phase 8 Decision Intelligence modules.
Tests scoring algorithms, constraint checking, and recommendation generation.
"""
import unittest
from decisions.scoring.assignment_scorer import score_mechanic_assignment
from decisions.scoring.priority_scorer import score_job_priority
from decisions.scoring.slot_scorer import optimize_appointment_slots
from decisions.scoring.workload_action_scorer import evaluate_workload_decisions
from decisions.scoring.inventory_action_scorer import score_inventory_restock_decision
from decisions.recommendations.generator import generate_decision_package

class TestDecisionScorers(unittest.TestCase):

    def test_mechanic_assignment_ranking(self):
        job = {
            "id": "JOB-101",
            "service_type": "brake_replacement",
            "vehicle_type": "sedan",
            "required_skills": ["brakes", "hydraulics"],
            "is_urgent": True
        }
        candidates = [
            {
                "id": "MEC-01",
                "name": "Rahul Sharma",
                "skills": ["brakes", "hydraulics", "engine"],
                "current_workload_mins": 60,
                "max_daily_capacity_mins": 480,
                "avg_completion_rate": 0.95,
                "status": "AVAILABLE"
            },
            {
                "id": "MEC-02",
                "name": "Arjun Kumar",
                "skills": ["oil_change", "tires"],
                "current_workload_mins": 120,
                "max_daily_capacity_mins": 480,
                "avg_completion_rate": 0.85,
                "status": "AVAILABLE"
            }
        ]

        result = score_mechanic_assignment(job, candidates, predicted_duration_mins=90.0, garage_id="GAR-001")
        self.assertTrue(result["success"])
        self.assertEqual(result["recommended_mechanic"]["id"], "MEC-01")
        self.assertGreater(result["recommended_mechanic"]["suitability_score"], 80)
        self.assertEqual(result["confidence"], "HIGH_CONFIDENCE")
        self.assertIn("garage_isolation: PASSED", result["constraints_checked"])

    def test_mechanic_assignment_no_candidates(self):
        job = {"id": "JOB-102", "service_type": "engine_repair"}
        result = score_mechanic_assignment(job, [], predicted_duration_mins=120.0)
        self.assertFalse(result["success"])
        self.assertIsNone(result["recommended_mechanic"])

    def test_job_priority_critical_overdue(self):
        job = {"id": "JOB-103", "service_type": "brake_service"}
        result = score_job_priority(
            job_details=job,
            hours_until_scheduled=-3.0, # 3 hours overdue
            customer_wait_hours=50.0,
            parts_available=True,
            predicted_duration_mins=120.0,
            is_vip_customer=True
        )
        self.assertEqual(result["priority_level"], "CRITICAL")
        self.assertGreaterEqual(result["priority_score"], 80.0)
        self.assertTrue(any("Overdue" in r for r in result["reasons"]))

    def test_job_priority_routine_low(self):
        job = {"id": "JOB-104", "service_type": "routine_inspection"}
        result = score_job_priority(
            job_details=job,
            hours_until_scheduled=48.0,
            customer_wait_hours=2.0,
            parts_available=True,
            predicted_duration_mins=30.0,
            is_vip_customer=False
        )
        self.assertIn(result["priority_level"], ["MEDIUM", "LOW"])

    def test_appointment_slot_optimizer(self):
        existing = [
            {"scheduled_date": "2026-09-10 10:00", "estimated_duration_minutes": 60}
        ]
        result = optimize_appointment_slots(
            service_type="oil_change",
            vehicle_type="sedan",
            predicted_duration_mins=45.0,
            existing_appointments=existing,
            target_date="2026-09-10"
        )
        self.assertTrue(result["success"])
        self.assertIsNotNone(result["recommended_slot"])
        self.assertGreater(len(result["all_evaluated_slots"]), 0)

    def test_workload_action_scorer(self):
        result = evaluate_workload_decisions(
            predicted_jobs=25.0,
            active_mechanics=4, # Capacity = 12 jobs
            avg_jobs_per_mechanic_day=3.0,
            garage_id="GAR-001"
        )
        self.assertEqual(result["workload_risk_level"], "HIGH")
        self.assertGreater(len(result["recommended_actions"]), 0)
        self.assertIn("Overload index", result["expected_impact"])

    def test_inventory_action_scorer(self):
        part = {"id": "PART-001", "name": "Ceramic Brake Pads", "part_number": "BP-2026"}
        result = score_inventory_restock_decision(
            part_details=part,
            predicted_14d_demand=20.0,
            current_stock=5.0,
            reserved_quantity=2.0, # Available = 3.0 (Net deficit = 17)
            reorder_level=5.0,
            unit_cost=1200.0,
            garage_id="GAR-001"
        )
        self.assertTrue(result["action_required"])
        self.assertIn(result["stockout_risk"], ["CRITICAL", "HIGH"])
        self.assertGreaterEqual(result["recommended_quantity"], 20)
        self.assertGreater(result["estimated_order_cost"], 0)

    def test_decision_package_generation(self):
        pkg = generate_decision_package(
            decision_type="MECHANIC_ASSIGNMENT",
            target_entity_type="job_card",
            target_entity_id="JOB-105",
            garage_id="GAR-001",
            action_title="Assign Job #JOB-105 to Rahul",
            recommendation_payload={"mechanic_id": "MEC-01"},
            why_reasons=["Top skill match", "Low current workload"],
            impact_estimate="Reduces repair duration by 20%",
            confidence_level="HIGH_CONFIDENCE",
            confidence_score=92.5
        )
        self.assertEqual(pkg["status"], "PENDING")
        self.assertTrue(pkg["requires_human_approval"])
        self.assertIn("constraints_checked", pkg)
        self.assertIsNotNone(pkg["id"])

    def test_digital_twin_simulation_sandbox(self):
        from algorithms.digital_twin import run_digital_twin_simulation
        res = run_digital_twin_simulation({"scenario_type": "job_surge_30pct", "custom_jobs": 20, "custom_mechanics": 8})
        self.assertIn("baseline", res)
        self.assertIn("simulated", res)
        self.assertIn("recommended_action", res)
        self.assertEqual(res["simulated"]["predicted_jobs"], 26)
        self.assertEqual(res["baseline"]["active_jobs"], 20)
        self.assertIn("100% in isolated memory sandbox", res["isolation_guarantee"])
        self.assertGreater(res["recommended_action"]["confidence_score"], 80)

if __name__ == "__main__":
    unittest.main()
