const mysql = require('mysql2/promise');
const fs = require('fs');
async function run(){
    const c = await mysql.createConnection({host:'b4eturwt8cnf3b4gqngb-mysql.services.clever-cloud.com',user:'un9gagdyqj29naam',password:'FTasnXdDXtYM64i89fOK',database:'b4eturwt8cnf3b4gqngb',port:3306, multipleStatements: true});
    const sql = `
-- View: Branch Performance
DROP VIEW IF EXISTS View_Branch_Performance;
CREATE VIEW View_Branch_Performance AS
SELECT 
    b.id AS branch_id,
    b.name AS branch_name,
    COUNT(a.id) AS total_jobs,
    SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_jobs,
    COALESCE(SUM(i.total_amount), 0) AS total_revenue
FROM Branch b
LEFT JOIN Appointment a ON b.id = a.branch_id AND a.deleted_at IS NULL
LEFT JOIN Invoice i ON a.id = i.appointment_id AND i.status IN ('paid', 'partial') AND i.deleted_at IS NULL
WHERE b.deleted_at IS NULL
GROUP BY b.id;
`;
    await c.query(sql);
    console.log("View Created");

    const sp1 = `
DROP PROCEDURE IF EXISTS sp_smart_assign_mechanic;
CREATE PROCEDURE sp_smart_assign_mechanic(IN p_appointment_id VARCHAR(36), IN p_branch_id VARCHAR(36))
BEGIN
    DECLARE v_best_mechanic_id VARCHAR(36);
    
    SELECT id INTO v_best_mechanic_id
    FROM Mechanic
    WHERE branch_id = p_branch_id AND status = 'active' AND deleted_at IS NULL
    ORDER BY active_jobs_count ASC, skill_level DESC
    LIMIT 1;
    
    IF v_best_mechanic_id IS NOT NULL THEN
        UPDATE Appointment 
        SET mechanic_id = v_best_mechanic_id, status = 'ASSIGNED'
        WHERE id = p_appointment_id;
        
        UPDATE Mechanic 
        SET active_jobs_count = active_jobs_count + 1 
        WHERE id = v_best_mechanic_id;
    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No available mechanics found in this branch.';
    END IF;
END;
`;
    await c.query(sp1);
    console.log("SP1 Created");

    const sp2 = `
DROP PROCEDURE IF EXISTS sp_process_approval;
CREATE PROCEDURE sp_process_approval(
    IN p_request_id VARCHAR(36), 
    IN p_status ENUM('APPROVED', 'REJECTED'), 
    IN p_owner_id VARCHAR(36)
)
BEGIN
    DECLARE v_entity_type VARCHAR(20);
    DECLARE v_entity_id VARCHAR(36);
    DECLARE v_current_status VARCHAR(20);
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    
    SELECT entity_type, entity_id, status INTO v_entity_type, v_entity_id, v_current_status
    FROM Approval_Request 
    WHERE id = p_request_id FOR UPDATE;
    
    IF v_current_status != 'PENDING' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Request is already resolved.';
    END IF;
    
    UPDATE Approval_Request 
    SET status = p_status, resolved_by = p_owner_id, resolved_at = CURRENT_TIMESTAMP
    WHERE id = p_request_id;
    
    IF p_status = 'APPROVED' THEN
        IF v_entity_type = 'JOB' THEN
            UPDATE Appointment SET status = 'APPROVED' WHERE id = v_entity_id;
        END IF;
    ELSE
        IF v_entity_type = 'JOB' THEN
            UPDATE Appointment SET status = 'ESTIMATE' WHERE id = v_entity_id;
        END IF;
    END IF;
    
    COMMIT;
END;
`;
    await c.query(sp2);
    console.log("SP2 Created");
    
    c.end();
}
run().catch(console.error);
