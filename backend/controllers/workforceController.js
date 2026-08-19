const pool = require('../config/db');
const { logAudit } = require('../utils/auditLogger');
const { v4: uuidv4 } = require('uuid');

const getGarageMechanics = async (req, res) => {
  const garageId = req.params.id;
  try {
    // Current workload (sum of estimated_duration_minutes of ACTIVE assignments)
    const [mechanics] = await pool.query(`
      SELECT m.*, u.first_name, u.last_name, u.email, u.phone_number,
      COALESCE(
        (SELECT SUM(jc.estimated_duration_minutes) 
         FROM Job_Assignment ja 
         JOIN Job_Card jc ON ja.job_card_id = jc.id 
         WHERE ja.mechanic_id = m.id AND ja.status = 'ACTIVE'
        ), 0) AS currentWorkload
      FROM Mechanic_Profile m
      JOIN User_Account u ON m.user_id = u.id
      WHERE m.garage_id = ?
    `, [garageId]);

    // get skills for each
    for (let mechanic of mechanics) {
      const [skills] = await pool.query(`
        SELECT s.name, s.category, ms.proficiency_level, ms.years_experience
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

const getMechanicDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT m.*, u.first_name, u.last_name, u.email, u.phone_number
      FROM Mechanic_Profile m
      JOIN User_Account u ON m.user_id = u.id
      WHERE m.id = ?
    `, [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Mechanic not found' });
    const mechanic = rows[0];

    const [skills] = await pool.query(`
      SELECT s.id as skill_id, s.name, s.category, ms.id as mechanic_skill_id, ms.proficiency_level, ms.years_experience, ms.verified
      FROM Mechanic_Skill ms
      JOIN Skill s ON ms.skill_id = s.id
      WHERE ms.mechanic_id = ?
    `, [id]);
    mechanic.skills = skills;

    const [availability] = await pool.query('SELECT * FROM Mechanic_Availability WHERE mechanic_id = ?', [id]);
    mechanic.availability = availability;

    const [certifications] = await pool.query('SELECT * FROM Certification WHERE mechanic_id = ?', [id]);
    mechanic.certifications = certifications;

    res.json(mechanic);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const addMechanicSkill = async (req, res) => {
  const { id } = req.params;
  const { skill_id, proficiency_level, years_experience } = req.body;
  try {
    const mechanic_skill_id = uuidv4();
    await pool.query(
      'INSERT INTO Mechanic_Skill (id, mechanic_id, skill_id, proficiency_level, years_experience) VALUES (?, ?, ?, ?, ?)',
      [mechanic_skill_id, id, skill_id, proficiency_level, years_experience || 0]
    );
    res.status(201).json({ id: mechanic_skill_id, message: 'Skill added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateAvailability = async (req, res) => {
  const { id } = req.params;
  const { availabilities } = req.body; // array of {day_of_week, start_time, end_time, is_available}
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Clear existing
    await connection.query('DELETE FROM Mechanic_Availability WHERE mechanic_id = ?', [id]);
    for (let av of availabilities) {
      await connection.query(
        'INSERT INTO Mechanic_Availability (id, mechanic_id, day_of_week, start_time, end_time, is_available) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), id, av.day_of_week, av.start_time, av.end_time, av.is_available !== false]
      );
    }
    await connection.commit();
    res.json({ message: 'Availability updated' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

const listAllSkills = async (req, res) => {
  try {
    const [skills] = await pool.query("SELECT * FROM Skill WHERE status = 'ACTIVE'");
    res.json(skills);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getGarageMechanics, getMechanicDetails, addMechanicSkill, updateAvailability, listAllSkills };
