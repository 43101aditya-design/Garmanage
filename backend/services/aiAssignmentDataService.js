const crypto = require('crypto');

const MAX_WORKLOAD_MINUTES = 480;
const PROFICIENCY = { BEGINNER: 0.25, INTERMEDIATE: 0.5, ADVANCED: 0.75, EXPERT: 1 };
const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const rows = async (db, sql, params = []) => (await db.query(sql, params))[0];
const parseDateTime = (date, time) => date && time ? new Date(`${String(date).slice(0, 10)}T${String(time).slice(0, 8)}`) : null;
const timeMinutes = (value) => {
  if (!value) return null;
  const [hours, minutes] = String(value).slice(0, 8).split(':').map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
};
const overlap = (startA, endA, startB, endB) => startA < endB && startB < endA;

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function fingerprint(input) {
  return crypto.createHash('sha256').update(stableStringify(input)).digest('hex');
}

async function getJob(db, jobId, lock = false) {
  const jobs = await rows(db, `
    SELECT jc.id AS job_id, jc.garage_id, jc.status, jc.service_type, jc.priority, jc.complexity,
           jc.estimated_duration_minutes, jc.appointment_id, v.vehicle_type,
           DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointment_date,
           TIME_FORMAT(a.appointment_time, '%H:%i:%s') AS appointment_time,
           TIME_FORMAT(a.end_time, '%H:%i:%s') AS end_time
    FROM Job_Card jc
    LEFT JOIN Vehicle v ON v.id = jc.vehicle_id
    LEFT JOIN Appointment a ON a.id = jc.appointment_id
    WHERE jc.id = ? ${lock ? 'FOR UPDATE' : ''}`, [jobId]);
  return jobs[0] || null;
}

async function assertGarageManager(db, userId, garageId) {
  const memberships = await rows(db, `
    SELECT gm.id FROM Garage_Membership gm
    JOIN Role r ON r.id = gm.role_id
    WHERE gm.user_id = ? AND gm.garage_id = ? AND gm.status = 'ACTIVE' AND r.name IN ('manager', 'owner')`, [userId, garageId]);
  return memberships.length > 0;
}

async function buildAssignmentInput(db, jobId, { lockJob = false } = {}) {
  const jobRecord = await getJob(db, jobId, lockJob);
  if (!jobRecord) return null;
  const requiredSkills = await rows(db, `
    SELECT s.id, s.name, jrs.is_mandatory FROM Job_Required_Skill jrs
    JOIN Skill s ON s.id = jrs.skill_id WHERE jrs.job_card_id = ?`, [jobId]);
  const mechanics = await rows(db, `
    SELECT mp.id, mp.garage_id, mp.employment_status, mp.experience_years, ua.name
    FROM Mechanic_Profile mp JOIN User_Account ua ON ua.id = mp.user_id`);
  const mechanicIds = mechanics.map(mechanic => mechanic.id);
  const placeholders = mechanicIds.map(() => '?').join(',');
  const skills = mechanicIds.length ? await rows(db, `
    SELECT ms.mechanic_id, s.id AS skill_id, s.name, ms.proficiency_level
    FROM Mechanic_Skill ms JOIN Skill s ON s.id = ms.skill_id WHERE ms.mechanic_id IN (${placeholders})`, mechanicIds) : [];
  const availability = mechanicIds.length ? await rows(db, `SELECT mechanic_id, day_of_week, start_time, end_time, is_available FROM Mechanic_Availability WHERE mechanic_id IN (${placeholders})`, mechanicIds) : [];
  const leaves = mechanicIds.length ? await rows(db, `SELECT mechanic_id, start_datetime, end_datetime FROM Mechanic_Unavailability WHERE status = 'APPROVED' AND mechanic_id IN (${placeholders})`, mechanicIds) : [];
  const assignments = mechanicIds.length ? await rows(db, `
    SELECT ja.mechanic_id, jc.id AS job_card_id, jc.estimated_duration_minutes,
      DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointment_date,
      TIME_FORMAT(a.appointment_time, '%H:%i:%s') AS appointment_time,
      TIME_FORMAT(a.end_time, '%H:%i:%s') AS end_time
    FROM Job_Assignment ja JOIN Job_Card jc ON jc.id = ja.job_card_id
    LEFT JOIN Appointment a ON a.id = jc.appointment_id
    WHERE ja.status IN ('PENDING', 'ACCEPTED', 'ACTIVE') AND ja.mechanic_id IN (${placeholders})`, mechanicIds) : [];
  const history = mechanicIds.length ? await rows(db, `
    SELECT ja.mechanic_id, COUNT(*) AS completed_jobs, AVG(jc.actual_duration_minutes) AS average_duration,
      AVG(CASE WHEN jc.actual_duration_minutes IS NOT NULL AND jc.estimated_duration_minutes > 0
        THEN jc.actual_duration_minutes <= jc.estimated_duration_minutes * 1.25 ELSE NULL END) AS success_rate
    FROM Job_Assignment ja JOIN Job_Card jc ON jc.id = ja.job_card_id
    WHERE ja.status = 'COMPLETED' AND jc.status = 'COMPLETED' AND ja.mechanic_id IN (${placeholders})
    GROUP BY ja.mechanic_id`, mechanicIds) : [];

  const byMechanic = (collection) => collection.reduce((result, item) => ((result[item.mechanic_id] ||= []).push(item), result), {});
  const skillMap = byMechanic(skills), availabilityMap = byMechanic(availability), leaveMap = byMechanic(leaves), assignmentMap = byMechanic(assignments);
  const historyMap = Object.fromEntries(history.map(item => [item.mechanic_id, item]));
  const requestedStart = parseDateTime(jobRecord.appointment_date, jobRecord.appointment_time);
  const requestedEnd = requestedStart ? new Date(requestedStart.getTime() + ((timeMinutes(jobRecord.end_time) !== null && timeMinutes(jobRecord.appointment_time) !== null) ? Math.max(0, timeMinutes(jobRecord.end_time) - timeMinutes(jobRecord.appointment_time)) : Number(jobRecord.estimated_duration_minutes || 0)) * 60000) : null;
  const day = requestedStart ? WEEKDAYS[requestedStart.getDay()] : null;
  const mandatorySkills = requiredSkills.filter(skill => Boolean(skill.is_mandatory));
  const candidates = mechanics.map(mechanic => {
    const failures = [];
    if (mechanic.garage_id !== jobRecord.garage_id) failures.push('CROSS_GARAGE');
    if (mechanic.employment_status !== 'ACTIVE') failures.push(mechanic.employment_status === 'ON_LEAVE' ? 'ON_LEAVE' : 'INACTIVE');
    const mechanicSkills = skillMap[mechanic.id] || [];
    const missingSkills = mandatorySkills.filter(required => !mechanicSkills.some(skill => skill.skill_id === required.id));
    if (missingSkills.length) failures.push('MISSING_MANDATORY_SKILL');
    const assigned = assignmentMap[mechanic.id] || [];
    const workload = assigned.reduce((total, assignment) => total + Number(assignment.estimated_duration_minutes || 0), 0);
    if (workload + Number(jobRecord.estimated_duration_minutes || 0) > MAX_WORKLOAD_MINUTES) failures.push('IMPOSSIBLE_WORKLOAD');
    let availabilityKnown = false, availabilityScore = 0.5;
    if (requestedStart && requestedEnd) {
      const schedule = availabilityMap[mechanic.id] || [];
      if (schedule.length) {
        availabilityKnown = true;
        const withinSlot = schedule.some(slot => slot.day_of_week === day && Boolean(slot.is_available) && timeMinutes(slot.start_time) <= timeMinutes(jobRecord.appointment_time) && timeMinutes(slot.end_time) >= timeMinutes(jobRecord.appointment_time) + (requestedEnd.getTime() - requestedStart.getTime()) / 60000);
        availabilityScore = withinSlot ? 1 : 0;
        if (!withinSlot) failures.push('UNAVAILABLE');
      }
      if ((leaveMap[mechanic.id] || []).some(leave => overlap(requestedStart, requestedEnd, new Date(leave.start_datetime), new Date(leave.end_datetime)))) failures.push('ON_LEAVE');
      if (assigned.some(assignment => {
        const start = parseDateTime(assignment.appointment_date, assignment.appointment_time);
        if (!start || assignment.job_card_id === jobId) return false;
        const duration = (timeMinutes(assignment.end_time) !== null && timeMinutes(assignment.appointment_time) !== null) ? Math.max(0, timeMinutes(assignment.end_time) - timeMinutes(assignment.appointment_time)) : Number(assignment.estimated_duration_minutes || 0);
        return overlap(requestedStart, requestedEnd, start, new Date(start.getTime() + duration * 60000));
      })) failures.push('SCHEDULE_CONFLICT');
    }
    const matchingSkills = mandatorySkills.length ? mechanicSkills.filter(skill => mandatorySkills.some(required => required.id === skill.skill_id)) : [];
    const proficiency = matchingSkills.length ? Math.min(...matchingSkills.map(skill => PROFICIENCY[skill.proficiency_level] || 0)) : null;
    const historyItem = historyMap[mechanic.id];
    return {
      mechanic_id: mechanic.id, display_name: mechanic.name || mechanic.id, eligible: failures.length === 0,
      hard_constraint_failures: [...new Set(failures)], skill_match: mandatorySkills.length ? missingSkills.length === 0 : null,
      proficiency_score: proficiency, experience_years: mechanic.experience_years, certification_match: null,
      workload_minutes: workload, active_job_count: assigned.length, availability_score: availabilityScore,
      availability_known: availabilityKnown, historical_completed_jobs: historyItem ? Number(historyItem.completed_jobs) : 0,
      historical_average_duration: historyItem?.average_duration === null || !historyItem ? null : Number(historyItem.average_duration),
      historical_success_rate: historyItem?.success_rate === null || !historyItem ? null : Number(historyItem.success_rate),
    };
  });
  const job = { ...jobRecord, required_skills: requiredSkills.map(skill => ({ id: skill.id, name: skill.name, mandatory: Boolean(skill.is_mandatory) })) };
  const input = { jobs: [job], candidates_by_job: { [jobId]: candidates } };
  return { job, input, input_fingerprint: fingerprint(input) };
}

async function trainingRows(db) {
  const completed = await rows(db, `
    SELECT r.id, r.reasoning_data, r.manager_choice_mechanic_id, r.recommended_mechanic_id,
      jc.actual_duration_minutes, jc.estimated_duration_minutes, jc.completed_at, r.created_at
    FROM AI_Job_Recommendation r JOIN Job_Card jc ON jc.id = r.job_card_id
    WHERE r.status = 'APPROVED' AND jc.status = 'COMPLETED'
      AND jc.actual_duration_minutes IS NOT NULL AND jc.estimated_duration_minutes > 0`);
  return completed.map(record => {
    const reasoning = typeof record.reasoning_data === 'string' ? JSON.parse(record.reasoning_data) : record.reasoning_data;
    const selected = reasoning?.recommended_candidate?.mechanic_id === record.manager_choice_mechanic_id
      ? reasoning.recommended_candidate
      : (reasoning?.alternatives || []).find(candidate => candidate.mechanic_id === record.manager_choice_mechanic_id);
    return {
      recommendation_id: record.id, created_at: record.created_at, completed_at: record.completed_at,
      // Overrides are valuable data, but their actual selected candidate—not the
      // original AI choice—must supply the feature snapshot to avoid label drift.
      feature_snapshot: selected?.feature_snapshot,
      label: Number(record.actual_duration_minutes) <= Number(record.estimated_duration_minutes) * 1.25 ? 1 : 0,
    };
  }).filter(row => row.feature_snapshot);
}

module.exports = { assertGarageManager, buildAssignmentInput, fingerprint, getJob, trainingRows };
