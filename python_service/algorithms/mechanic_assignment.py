"""Isolated Engineering Lab scenario adapter for the shared assignment core."""
from intelligence.core import recommend


def run_mechanic_assignment(data: dict):
    scenario = data.get("scenario") or {}
    job = scenario.get("job") or {
        "job_id": "simulation-job-1",
        "service_type": data.get("job_type", "Engine Repair"),
        "priority": str(data.get("priority", "HIGH")).upper(),
        "complexity": "MEDIUM",
        "estimated_duration_minutes": 90,
        "required_skills": [],
    }
    job.setdefault("job_id", "simulation-job-1")
    candidates = scenario.get("candidates") or [
        {"mechanic_id": "simulation-mechanic-a", "display_name": "Scenario Mechanic A", "eligible": True, "skill_match": True, "proficiency_score": 0.9, "experience_years": 5, "workload_minutes": 80, "availability_score": 1.0, "availability_known": True, "historical_completed_jobs": 0, "historical_success_rate": None},
        {"mechanic_id": "simulation-mechanic-b", "display_name": "Scenario Mechanic B", "eligible": True, "skill_match": True, "proficiency_score": 0.65, "experience_years": 2, "workload_minutes": 30, "availability_score": 1.0, "availability_known": True, "historical_completed_jobs": 0, "historical_success_rate": None},
    ]
    result = recommend({"jobs": [job], "candidates_by_job": {job["job_id"]: candidates}})
    recommendation = result["recommendations"][0]
    def legacy_candidate(candidate):
        if not candidate:
            return None
        return {
            **candidate,
            "name": candidate.get("display_name"),
            "specialization": "Scenario candidate",
            "score": round(float(candidate.get("suitability_score") or 0) * 100, 1),
            "details": {
                "skill_match": round(float(candidate.get("feature_snapshot", {}).get("skill_match", 0)) * 40, 1),
                "workload": round(float(candidate.get("feature_snapshot", {}).get("workload_headroom", 0)) * 40, 1),
                "availability": round(float(candidate.get("feature_snapshot", {}).get("availability_score", 0)) * 20, 1),
                "active_jobs": candidate.get("active_job_count", 0),
                "skill_level": candidate.get("proficiency_score"),
            },
        }
    all_candidates = [recommendation.get("recommended_candidate"), *recommendation.get("alternatives", [])]
    return {"status": "SIMULATION_ONLY", "scenario": "isolated", "recommended_mechanic": legacy_candidate(recommendation.get("recommended_candidate")), "all_candidates": [legacy_candidate(candidate) for candidate in all_candidates if candidate], "recommendation": recommendation}
