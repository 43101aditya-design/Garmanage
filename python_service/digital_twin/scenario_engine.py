"""
Scenario Engine for Digital Twin.
Transforms the baseline point-in-time snapshot into isolated hypothetical
operational scenarios without altering production data.
"""
from __future__ import annotations

import copy
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def apply_scenario(baseline_snapshot: Dict[str, Any], scenario_config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Clones the baseline snapshot and applies the scenario modifications.
    Guaranteed mutation-free on original snapshot.
    """
    sim_state = copy.deepcopy(baseline_snapshot)
    scenario_type = scenario_config.get("scenario_type", "JOB_SURGE")
    params = scenario_config.get("parameters", {})
    
    trace_events: List[str] = [
        f"Initialized isolated simulation state for garage {sim_state['garage']['garage_id']}",
        f"Scenario Type: {scenario_type}",
        f"Baseline: {len(sim_state['mechanics'])} mechanics, {len(sim_state['jobs'])} jobs, {len(sim_state['inventory'])} parts"
    ]
    
    # ── A. MECHANIC UNAVAILABLE ──────────────────────────────────────────────
    if scenario_type == "MECHANIC_UNAVAILABLE":
        target_mech_id = params.get("mechanic_id")
        unavailable_hours = float(params.get("unavailable_hours", 4.0))
        target_name = None
        
        # If no specific mechanic provided, pick the most utilized or first available
        if not target_mech_id:
            avail = [m for m in sim_state["mechanics"] if m["status"] == "AVAILABLE"]
            if avail:
                avail.sort(key=lambda x: -x.get("active_jobs", 0))
                target_mech_id = avail[0]["mechanic_id"]
        
        affected_jobs = []
        for m in sim_state["mechanics"]:
            if m["mechanic_id"] == target_mech_id:
                m["status"] = "UNAVAILABLE"
                m["max_daily_minutes"] = max(0, int(m["max_daily_minutes"] - (unavailable_hours * 60)))
                target_name = m["name"]
                trace_events.append(f"Mechanic {m['name']} ({m['mechanic_id']}) marked UNAVAILABLE for {unavailable_hours} hours")
        
        # Unassign jobs currently mapped to this mechanic
        for j in sim_state["jobs"]:
            if j.get("assigned_mechanic_id") == target_mech_id:
                j["status"] = "READY_FOR_ASSIGNMENT"
                j["assigned_mechanic_id"] = None
                affected_jobs.append(j["job_id"])
                trace_events.append(f"Job {j['job_number']} unassigned due to mechanic absence")
        
        sim_state["scenario_meta"] = {
            "type": "MECHANIC_UNAVAILABLE",
            "target_mechanic_id": target_mech_id,
            "target_mechanic_name": target_name or target_mech_id,
            "unavailable_hours": unavailable_hours,
            "affected_jobs_count": len(affected_jobs),
            "affected_job_ids": affected_jobs
        }

    # ── B. DEMAND INCREASE ───────────────────────────────────────────────────
    elif scenario_type == "DEMAND_INCREASE":
        surge_pct = float(params.get("increase_percentage", 30.0))  # e.g. 10, 30, 50
        multiplier = 1.0 + (surge_pct / 100.0)
        base_job_count = len(sim_state["jobs"])
        extra_jobs_count = max(1, int(round(base_job_count * (surge_pct / 100.0))))
        
        service_types = ["Periodic Maintenance", "Brake Overhaul", "Electrical Diagnostic", "AC Servicing", "Engine Tune-up"]
        for i in range(extra_jobs_count):
            new_job_id = f"SIM-SURGE-{i+1:03d}"
            stype = service_types[i % len(service_types)]
            sim_state["jobs"].append({
                "job_id": new_job_id,
                "job_number": f"SIM-WO-{i+1:03d}",
                "service_type": stype,
                "priority": "HIGH" if i % 3 == 0 else "NORMAL",
                "complexity": "HIGH" if "Engine" in stype else "MEDIUM",
                "status": "READY_FOR_ASSIGNMENT",
                "estimated_duration_mins": 90 + (i % 3) * 30,
                "assigned_mechanic_id": None,
                "price_inr": 3500.0 + (i % 4) * 1000.0,
                "required_skills": [stype.split()[0]]
            })
        
        trace_events.append(f"Injected +{surge_pct}% demand surge: added {extra_jobs_count} jobs (total: {len(sim_state['jobs'])})")
        sim_state["scenario_meta"] = {
            "type": "DEMAND_INCREASE",
            "increase_percentage": surge_pct,
            "added_jobs_count": extra_jobs_count
        }

    # ── C. ADDITIONAL MECHANIC ───────────────────────────────────────────────
    elif scenario_type == "ADDITIONAL_MECHANIC":
        added_count = int(params.get("mechanic_count", 1))
        specializations = params.get("specializations") or ["Master Diagnostics", "Brakes & Suspension", "Electrical & AC"]
        
        for i in range(added_count):
            new_mech_id = f"SIM-MECH-{i+1:03d}"
            spec = specializations[i % len(specializations)]
            sim_state["mechanics"].append({
                "mechanic_id": new_mech_id,
                "name": f"Additional Technician {i+1} ({spec.split()[0]})",
                "status": "AVAILABLE",
                "skills": ["Engine", "Brakes", "Diagnostics", "Electrical", "General"],
                "specialization": spec,
                "experience_years": 5,
                "active_jobs": 0,
                "current_workload_mins": 0,
                "max_daily_minutes": 480
            })
            trace_events.append(f"Allocated additional technician {new_mech_id} ({spec}) with 480 mins daily capacity")
            
        sim_state["scenario_meta"] = {
            "type": "ADDITIONAL_MECHANIC",
            "added_mechanic_count": added_count
        }

    # ── D. INVENTORY REDUCTION ───────────────────────────────────────────────
    elif scenario_type == "INVENTORY_REDUCTION":
        reduction_pct = float(params.get("reduction_percentage", 20.0))
        target_part_id = params.get("part_id")
        
        affected_parts = []
        for p in sim_state["inventory"]:
            if not target_part_id or p["part_id"] == target_part_id:
                old_qty = p["quantity_in_stock"]
                new_qty = max(0, int(round(old_qty * (1.0 - reduction_pct / 100.0))))
                p["quantity_in_stock"] = new_qty
                p["stockout_risk"] = "CRITICAL" if new_qty <= 1 else ("HIGH" if new_qty <= p["reorder_level"] else "MEDIUM")
                affected_parts.append(p["part_id"])
                trace_events.append(f"Reduced part {p['name']} stock from {old_qty} to {new_qty} (-{reduction_pct}%)")
        
        sim_state["scenario_meta"] = {
            "type": "INVENTORY_REDUCTION",
            "reduction_percentage": reduction_pct,
            "affected_parts_count": len(affected_parts)
        }

    # ── E. WORKING HOURS CHANGE ──────────────────────────────────────────────
    elif scenario_type == "WORKING_HOURS_CHANGE":
        delta_hours = float(params.get("delta_hours", -2.0))  # e.g. -2 for closing early, +2 for overtime
        current_hours = float(sim_state["garage"]["operating_hours"].get("total_hours", 10.0))
        new_hours = max(4.0, min(16.0, current_hours + delta_hours))
        
        sim_state["garage"]["operating_hours"]["total_hours"] = new_hours
        new_daily_mins = int(new_hours * 60 * 0.85)  # 85% effective utilization ceiling
        
        for m in sim_state["mechanics"]:
            if m["status"] == "AVAILABLE":
                m["max_daily_minutes"] = new_daily_mins
                
        trace_events.append(f"Adjusted workshop operating hours from {current_hours}h to {new_hours}h (delta: {delta_hours:+}h)")
        sim_state["scenario_meta"] = {
            "type": "WORKING_HOURS_CHANGE",
            "delta_hours": delta_hours,
            "new_total_hours": new_hours
        }

    # ── F. JOB SURGE ─────────────────────────────────────────────────────────
    elif scenario_type == "JOB_SURGE":
        surge_count = int(params.get("surge_job_count", 10))  # 10, 20, 50
        service_types = ["Rapid Brake Service", "Engine Diagnostics", "Battery & Electrical", "Suspension Strut", "AC Gas Refill"]
        
        for i in range(surge_count):
            jid = f"SURGE-JOB-{i+1:03d}"
            st = service_types[i % len(service_types)]
            sim_state["jobs"].append({
                "job_id": jid,
                "job_number": f"SURGE-WO-{i+1:03d}",
                "service_type": st,
                "priority": "HIGH" if i < 3 else "NORMAL",
                "complexity": "MEDIUM",
                "status": "READY_FOR_ASSIGNMENT",
                "estimated_duration_mins": 80 + (i % 4) * 25,
                "assigned_mechanic_id": None,
                "price_inr": 3200.0 + (i % 3) * 1200.0,
                "required_skills": [st.split()[0]]
            })
            
        trace_events.append(f"Injected sudden job surge: +{surge_count} incoming work orders")
        sim_state["scenario_meta"] = {
            "type": "JOB_SURGE",
            "surge_count": surge_count
        }

    # ── G. HIGH PRIORITY JOB INJECTION ───────────────────────────────────────
    elif scenario_type == "HIGH_PRIORITY_INJECTION":
        injected_count = int(params.get("priority_job_count", 2))
        for i in range(injected_count):
            jid = f"CRITICAL-INJ-{i+1:03d}"
            sim_state["jobs"].insert(0, {  # Front of queue
                "job_id": jid,
                "job_number": f"EMERGENCY-WO-{i+1:03d}",
                "service_type": "Emergency Brake & Steering Failure",
                "priority": "URGENT",
                "complexity": "CRITICAL",
                "status": "READY_FOR_ASSIGNMENT",
                "estimated_duration_mins": 120,
                "assigned_mechanic_id": None,
                "price_inr": 7500.0,
                "required_skills": ["Brakes", "Diagnostics"]
            })
            trace_events.append(f"Injected CRITICAL/URGENT priority job: {jid} into front of queue")
            
        sim_state["scenario_meta"] = {
            "type": "HIGH_PRIORITY_INJECTION",
            "injected_count": injected_count
        }

    # ── H. CUSTOM COMPOSITE ──────────────────────────────────────────────────
    else:
        # Allows arbitrary composite parameters
        if "mechanic_delta" in params:
            m_delta = int(params["mechanic_delta"])
            if m_delta > 0:
                for i in range(m_delta):
                    sim_state["mechanics"].append({
                        "mechanic_id": f"SIM-CUSTOM-{i+1}",
                        "name": f"Float Technician {i+1}",
                        "status": "AVAILABLE",
                        "skills": ["General", "Engine", "Brakes"],
                        "specialization": "Float Technician",
                        "experience_years": 4,
                        "active_jobs": 0,
                        "current_workload_mins": 0,
                        "max_daily_minutes": 480
                    })
            elif m_delta < 0:
                for m in sim_state["mechanics"][:abs(m_delta)]:
                    m["status"] = "UNAVAILABLE"
                    m["max_daily_minutes"] = 0
                    
        trace_events.append(f"Applied custom composite scenario parameters: {params}")
        sim_state["scenario_meta"] = {
            "type": "CUSTOM_COMPOSITE",
            "parameters": params
        }
        
    sim_state["trace_events"] = trace_events
    return sim_state
