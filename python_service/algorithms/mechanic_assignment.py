def run_mechanic_assignment(db_conn, data: dict):
    # data expects: {"branch_id": "...", "job_type": "Engine Repair", "priority": "High", "required_skill": 3}
    branch_id = data.get("branch_id")
    required_skill = data.get("required_skill", 1)
    
    cursor = db_conn.cursor(dictionary=True)
    
    # Check if active_jobs_count exists (fallback if it doesn't)
    try:
        cursor.execute("SELECT active_jobs_count FROM Mechanic LIMIT 1")
        has_active_jobs_col = True
    except:
        has_active_jobs_col = False
        db_conn.commit() # Clear error state

    # Fetch mechanics
    if has_active_jobs_col:
        query = """
            SELECT id, first_name, last_name, specialization, skill_level, active_jobs_count 
            FROM Mechanic 
            WHERE branch_id = %s AND status = 'active'
        """
    else:
        query = """
            SELECT m.id, m.first_name, m.last_name, m.specialization, m.skill_level, 
                   (SELECT COUNT(*) FROM Appointment a WHERE a.mechanic_id = m.id AND a.status NOT IN ('COMPLETED', 'CANCELLED')) as active_jobs_count
            FROM Mechanic m
            WHERE m.branch_id = %s AND m.status = 'active'
        """
    cursor.execute(query, (branch_id,))
    mechanics = cursor.fetchall()
    
    if not mechanics:
        return {"error": "No mechanics available"}

    candidates = []
    for m in mechanics:
        # Simple Scoring Model
        # Skill Match: up to 40% (max out if mechanic skill >= required)
        skill_diff = m['skill_level'] - required_skill
        skill_score = 40 if skill_diff >= 0 else max(0, 40 + (skill_diff * 10))
        
        # Workload Score: up to 40% (less active jobs = higher score)
        active_jobs = m['active_jobs_count'] or 0
        workload_score = max(0, 40 - (active_jobs * 10)) # Penalize 10 points per active job
        
        # Availability (assume 20% flat for now if 'active' status)
        availability_score = 20
        
        total_score = skill_score + workload_score + availability_score
        
        candidates.append({
            "mechanic_id": m['id'],
            "name": f"{m['first_name']} {m['last_name']}",
            "specialization": m['specialization'],
            "score": round(total_score, 1),
            "details": {
                "skill_match": skill_score,
                "workload": workload_score,
                "availability": availability_score,
                "active_jobs": active_jobs,
                "skill_level": m['skill_level']
            }
        })
        
    cursor.close()
    
    # Sort candidates by score descending
    candidates.sort(key=lambda x: x["score"], reverse=True)
    
    return {
        "recommended_mechanic": candidates[0] if candidates else None,
        "all_candidates": candidates
    }
