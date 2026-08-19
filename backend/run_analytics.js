const mysql = require('mysql2/promise');
async function run(){
    const c = await mysql.createConnection({host:'b4eturwt8cnf3b4gqngb-mysql.services.clever-cloud.com',user:'un9gagdyqj29naam',password:'FTasnXdDXtYM64i89fOK',database:'b4eturwt8cnf3b4gqngb',port:3306, multipleStatements: true});
    
    const sql = `
-- 1. Manager Contribution View
DROP VIEW IF EXISTS View_Manager_Contribution;
CREATE VIEW View_Manager_Contribution AS
SELECT 
    m.id AS manager_id,
    CONCAT(m.first_name, ' ', m.last_name) AS manager_name,
    b.name AS branch_name,
    COUNT(a.id) AS jobs_managed,
    SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_jobs,
    COALESCE(SUM(i.total_amount), 0) AS revenue_generated,
    IFNULL(SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0) * 100, 0) AS completion_rate
FROM Manager m
JOIN Branch b ON m.branch_id = b.id
LEFT JOIN Appointment a ON m.branch_id = a.branch_id AND a.deleted_at IS NULL
LEFT JOIN Invoice i ON a.id = i.appointment_id AND i.status IN ('paid', 'partial') AND i.deleted_at IS NULL
WHERE m.deleted_at IS NULL
GROUP BY m.id;

-- 2. Mechanic Workload View
DROP VIEW IF EXISTS View_Mechanic_Workload;
CREATE VIEW View_Mechanic_Workload AS
SELECT 
    mech.id AS mechanic_id,
    CONCAT(mech.first_name, ' ', mech.last_name) AS mechanic_name,
    b.name AS branch_name,
    mech.active_jobs_count,
    COUNT(a.id) AS total_jobs_assigned,
    SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_jobs
FROM Mechanic mech
LEFT JOIN Branch b ON mech.branch_id = b.id
LEFT JOIN Appointment a ON mech.id = a.mechanic_id AND a.deleted_at IS NULL
WHERE mech.deleted_at IS NULL
GROUP BY mech.id;

-- 3. Month Over Month Growth View
DROP VIEW IF EXISTS View_MoM_Revenue;
CREATE VIEW View_MoM_Revenue AS
SELECT 
    DATE_FORMAT(issue_date, '%Y-%m') AS month,
    SUM(total_amount) AS revenue,
    LAG(SUM(total_amount)) OVER (ORDER BY DATE_FORMAT(issue_date, '%Y-%m')) AS prev_month_revenue,
    (SUM(total_amount) - LAG(SUM(total_amount)) OVER (ORDER BY DATE_FORMAT(issue_date, '%Y-%m'))) / 
    NULLIF(LAG(SUM(total_amount)) OVER (ORDER BY DATE_FORMAT(issue_date, '%Y-%m')), 0) * 100 AS growth_percentage
FROM Invoice
WHERE status IN ('paid', 'partial') AND deleted_at IS NULL
GROUP BY DATE_FORMAT(issue_date, '%Y-%m');
`;
    await c.query(sql);
    console.log("Analytics Views Created");
    c.end();
}
run().catch(console.error);
