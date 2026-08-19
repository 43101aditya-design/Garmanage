"""Reusable production/simulation intelligence core; it never reads or mutates MySQL."""
from __future__ import annotations

from typing import Any, Dict, List

from intelligence.explanations.explain import build_explanation
from intelligence.features.candidate_filter import filter_eligible
from intelligence.optimization.assignment_optimizer import optimize
from intelligence.ranking.ranker import ranker


def recommend(payload: Dict[str, Any]) -> Dict[str, Any]:
    jobs = {job["job_id"]: job for job in payload.get("jobs", [])}
    candidates_by_job = payload.get("candidates_by_job", {})
    scored_by_job: Dict[str, List[Dict[str, Any]]] = {}
    modes = set()
    for job_id, job in jobs.items():
        scored: List[Dict[str, Any]] = []
        raw_candidates = [dict(raw) for raw in candidates_by_job.get(job_id, [])]
        eligible_ids = {candidate["mechanic_id"] for candidate in filter_eligible(raw_candidates)}
        for candidate in raw_candidates:
            candidate["eligible"] = candidate["mechanic_id"] in eligible_ids
            if candidate["eligible"]:
                score, mode, features, probability = ranker.score(job, candidate)
                candidate.update({"suitability_score": score, "feature_snapshot": features, "probability": probability})
                modes.add(mode)
            else:
                candidate.update({"suitability_score": None, "feature_snapshot": None, "probability": None})
            scored.append(candidate)
        scored_by_job[job_id] = sorted(scored, key=lambda c: (c["suitability_score"] is not None, c["suitability_score"] or -1, c["mechanic_id"]), reverse=True)
    selected, optimizer = optimize(scored_by_job, jobs)
    recommendations = []
    for job_id, candidates in scored_by_job.items():
        eligible = [candidate for candidate in candidates if candidate["eligible"]]
        selected_id = selected.get(job_id)
        selected_candidate = next((candidate for candidate in eligible if candidate["mechanic_id"] == selected_id), None)
        if selected_candidate is None:
            recommendations.append({"job_id": job_id, "status": "NO_ELIGIBLE_CANDIDATE", "candidates": candidates, "constraints_applied": True})
            continue
        alternatives = [candidate for candidate in eligible if candidate["mechanic_id"] != selected_id]
        recommendations.append({
            "job_id": job_id,
            "status": "PENDING",
            "mode": "ML_RANKING" if selected_candidate["probability"] is not None else "COLD_START",
            "model_version": ranker.status()["model_version"],
            "optimizer": optimizer,
            "recommended_mechanic_id": selected_id,
            "suitability_score": selected_candidate["suitability_score"],
            "probability": selected_candidate["probability"],
            "recommended_candidate": selected_candidate,
            "alternatives": alternatives[:3],
            "excluded_candidates": [candidate for candidate in candidates if not candidate["eligible"]],
            "explanation": build_explanation(jobs[job_id], selected_candidate, alternatives),
        })
    return {"recommendations": recommendations, "engine_mode": "ML_RANKING" if modes == {"ML_RANKING"} else "COLD_START", "optimizer": optimizer}
