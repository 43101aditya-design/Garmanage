import unittest

from intelligence.core import recommend
from intelligence.features.candidate_filter import filter_eligible
from intelligence.ranking.ranker import ranker
from intelligence.training.train import train


def candidate(identifier, **overrides):
    base = {
        "mechanic_id": identifier, "display_name": identifier, "eligible": True,
        "hard_constraint_failures": [], "skill_match": True, "proficiency_score": 0.8,
        "experience_years": 4, "workload_minutes": 60, "availability_score": 1,
        "availability_known": True, "historical_completed_jobs": 0,
        "historical_success_rate": None,
    }
    base.update(overrides)
    return base


class AssignmentCoreTests(unittest.TestCase):
    def setUp(self):
        ranker._loaded = True
        ranker._model = None
        ranker._metadata = {}
        self.job = {"job_id": "j1", "priority": "HIGH", "complexity": "MEDIUM", "estimated_duration_minutes": 120}

    def test_hard_constraint_filter_excludes_ineligible_mechanic(self):
        eligible = filter_eligible([candidate("allowed"), candidate("leave", hard_constraint_failures=["ON_LEAVE"])])
        self.assertEqual([item["mechanic_id"] for item in eligible], ["allowed"])

    def test_cold_start_is_explicit_and_deterministic(self):
        payload = {"jobs": [self.job], "candidates_by_job": {"j1": [candidate("a"), candidate("b", workload_minutes=300)]}}
        first, second = recommend(payload), recommend(payload)
        self.assertEqual(first["engine_mode"], "COLD_START")
        self.assertEqual(first["recommendations"][0]["recommended_mechanic_id"], second["recommendations"][0]["recommended_mechanic_id"])

    def test_optimizer_does_not_assign_unavailable_candidate(self):
        payload = {"jobs": [self.job], "candidates_by_job": {"j1": [candidate("blocked", hard_constraint_failures=["SCHEDULE_CONFLICT"]), candidate("safe")]}}
        result = recommend(payload)["recommendations"][0]
        self.assertEqual(result["recommended_mechanic_id"], "safe")
        self.assertEqual(result["excluded_candidates"][0]["mechanic_id"], "blocked")

    def test_training_refuses_insufficient_snapshots(self):
        result = train([])
        self.assertFalse(result["trained"])
        self.assertIn("Insufficient historical data", result["reason"])


if __name__ == "__main__":
    unittest.main()
