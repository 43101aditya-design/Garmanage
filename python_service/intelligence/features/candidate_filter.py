"""Deterministic hard-constraint filtering for already-authorized structured data."""
from __future__ import annotations

from typing import Any, Dict, Iterable, List


def filter_eligible(candidates: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Return candidates that passed all hard constraints supplied by the adapter.

    Adapters are responsible for deriving activity, garage, leave, availability,
    scheduling, skill, and workload facts from their own data source. This pure
    function has no database assumptions and can be shared by simulation.
    """
    return [candidate for candidate in candidates if bool(candidate.get("eligible", True)) and not candidate.get("hard_constraint_failures", [])]
