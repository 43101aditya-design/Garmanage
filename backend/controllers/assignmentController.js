const pool = require('../config/db');
const { logAudit } = require('../utils/auditLogger');
const { v4: uuidv4 } = require('uuid');

const getEligibleMechanics = async (req, res) => {
  const { id } = req.params; // job id
  try {
    const [jobs] = await pool.query('SELECT garage_id FROM Job_Card WHERE id = ?', [id]);
    if (jobs.length === 0) return res.status(404).json({ message: 'Job not found' });
    const garageId = jobs[0].garage_id;

    const [mechanics] = await pool.query(`
      SELECT m.id, u.first_name, u.last_name, m.employment_status,
      COALESCE(
        (SELECT SUM(jc.estimated_duration_minutes) 
         FROM Job_Assignment ja 
         JOIN Job_Card jc ON ja.job_card_id = jc.id 
         WHERE ja.mechanic_id = m.id AND ja.status = 'ACTIVE'
        ), 0) AS currentWorkload
      FROM Mechanic_Profile m
      JOIN User_Account u ON m.user_id = u.id
      WHERE m.garage_id = ? AND m.employment_status = 'ACTIVE'
    `, [garageId]);

    // Include basic skills for matching logic on frontend
    for (let mechanic of mechanics) {
      const [skills] = await pool.query(`
        SELECT s.name, ms.proficiency_level
        FROM Mechanic_Skill ms
        JOIN Skill s ON ms.skill_id = s.id
        WHERE ms.mechanic_id = ?
      `, [mechanic.id]);
      mechanic.skills = skills;
    }

    res.json(mechanics);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const assignJob = async (req, res) => {
  const { id } = req.params; // job card id
  const { mechanic_id, assignment_type = 'MANUAL' } = req.body;
  const assigned_by = req.user.id;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [jobRows] = await connection.query('SELECT status FROM Job_Card WHERE id = ? FOR UPDATE', [id]);
    if (jobRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Job not found' });
    }

    const assignmentId = uuidv4();
    await connection.query(
      `INSERT INTO Job_Assignment (id, job_card_id, mechanic_id, assigned_by, assignment_type, status)
       VALUES (?, ?, ?, ?, ?, 'PENDING')`,
      [assignmentId, id, mechanic_id, assigned_by, assignment_type]
    );

    await connection.query("UPDATE Job_Card SET status = 'ASSIGNED' WHERE id = ?", [id]);

    await logAudit(assigned_by, 'JOB_ASSIGNED', 'Job_Card', id, 'MANUAL', null, { mechanic_id });

    await connection.commit();
    res.status(201).json({ message: 'Job assigned', assignment_id: assignmentId });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

const acceptAssignment = async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [assignments] = await connection.query('SELECT * FROM Job_Assignment WHERE id = ? FOR UPDATE', [id]);
    if (assignments.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Assignment not found' });
    }

    await connection.query(
      "UPDATE Job_Assignment SET status = 'ACTIVE', accepted_at = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );
    await connection.query("UPDATE Job_Card SET status = 'IN_PROGRESS' WHERE id = ?", [assignments[0].job_card_id]);
    
    await logAudit(req.user.id, 'JOB_ACCEPTED', 'Job_Assignment', id, 'MANUAL', null, null);
    
    await connection.commit();
    res.json({ message: 'Assignment accepted' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

const rejectAssignment = async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [assignments] = await connection.query('SELECT * FROM Job_Assignment WHERE id = ? FOR UPDATE', [id]);
    if (assignments.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Assignment not found' });
    }

    await connection.query(
      "UPDATE Job_Assignment SET status = 'REJECTED' WHERE id = ?",
      [id]
    );
    await connection.query("UPDATE Job_Card SET status = 'READY_FOR_ASSIGNMENT' WHERE id = ?", [assignments[0].job_card_id]);
    
    await logAudit(req.user.id, 'JOB_REJECTED', 'Job_Assignment', id, 'MANUAL', null, null);

    await connection.commit();
    res.json({ message: 'Assignment rejected' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

const getMechanicAssignments = async (req, res) => {
  const { id } = req.params; // mechanic_id
  try {
    const [assignments] = await pool.query(`
      SELECT ja.*, jc.job_number, jc.service_type, jc.estimated_duration_minutes, jc.priority, jc.status as job_status 
      FROM Job_Assignment ja
      JOIN Job_Card jc ON ja.job_card_id = jc.id
      WHERE ja.mechanic_id = ?
      ORDER BY ja.created_at DESC
    `, [id]);
    res.json(assignments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getEligibleMechanics, assignJob, acceptAssignment, rejectAssignment, getMechanicAssignments };
