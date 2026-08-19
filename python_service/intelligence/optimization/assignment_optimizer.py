"""Constrained multi-job assignment. OR-Tools is the production optimiser."""
from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, List, Tuple

from intelligence.config import MAX_WORKLOAD_MINUTES, OPTIMIZATION


def optimize(scored_by_job: Dict[str, List[Dict[str, Any]]], jobs: Dict[str, Dict[str, Any]]) -> Tuple[Dict[str, str], str]:
    pairs = [(job_id, candidate) for job_id, candidates in scored_by_job.items() for candidate in candidates if candidate.get("eligible")]
    if not pairs:
        return {}, "OR_TOOLS_CP_SAT"
    try:
        from ortools.sat.python import cp_model
        model = cp_model.CpModel()
        variables = {(job_id, c["mechanic_id"]): model.NewBoolVar(f"x_{job_id}_{c['mechanic_id']}") for job_id, c in pairs}
        for job_id in scored_by_job:
            model.Add(sum(var for (candidate_job, _), var in variables.items() if candidate_job == job_id) <= 1)
        mechanic_vars: Dict[str, List[Tuple[Any, Dict[str, Any], str]]] = defaultdict(list)
        for (job_id, mechanic_id), variable in variables.items():
            candidate = next(c for j, c in pairs if j == job_id and c["mechanic_id"] == mechanic_id)
            mechanic_vars[mechanic_id].append((variable, candidate, job_id))
        for assignments in mechanic_vars.values():
            base_workload = int(float(assignments[0][1].get("workload_minutes") or 0))
            model.Add(base_workload + sum(int(float(jobs[job_id].get("estimated_duration_minutes") or 0)) * variable for variable, _, job_id in assignments) <= MAX_WORKLOAD_MINUTES)
        objective = []
        for (job_id, mechanic_id), variable in variables.items():
            candidate = next(c for j, c in pairs if j == job_id and c["mechanic_id"] == mechanic_id)
            duration = int(float(jobs[job_id].get("estimated_duration_minutes") or 0))
            quality = int(round(float(candidate["suitability_score"]) * OPTIMIZATION["suitability_scale"]))
            objective.append((quality - duration * OPTIMIZATION["workload_penalty_per_minute"]) * variable)
        model.Maximize(sum(objective))
        solver = cp_model.CpSolver()
        solver.parameters.num_search_workers = 1
        solver.parameters.random_seed = 42
        solver.parameters.max_time_in_seconds = 5
        solver.Solve(model)
        return {job_id: mechanic_id for (job_id, mechanic_id), variable in variables.items() if solver.Value(variable)}, "OR_TOOLS_CP_SAT"
    except ImportError:
        # Development environments can omit optional native OR-Tools wheels. This
        # deterministic fallback is clearly labelled; requirements pin OR-Tools.
        assigned, used = {}, defaultdict(int)
        for job_id in sorted(scored_by_job):
            duration = int(float(jobs[job_id].get("estimated_duration_minutes") or 0))
            for candidate in sorted(
                (candidate for candidate in scored_by_job[job_id] if candidate.get("eligible") and candidate.get("suitability_score") is not None),
                key=lambda candidate: (-candidate["suitability_score"], candidate["mechanic_id"]),
            ):
                mechanic = candidate["mechanic_id"]
                if int(float(candidate.get("workload_minutes") or 0)) + used[mechanic] + duration <= MAX_WORKLOAD_MINUTES:
                    assigned[job_id], used[mechanic] = mechanic, used[mechanic] + duration
                    break
        return assigned, "DETERMINISTIC_FALLBACK_OR_TOOLS_UNAVAILABLE"
