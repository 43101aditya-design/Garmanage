USE svsms_db;

-- =================================================================================
-- PHASE 2: SAAS UPGRADE SCHEMA
-- =================================================================================

-- 1. Create Branch Table
CREATE TABLE IF NOT EXISTS Branch (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL
);

-- 2. Create Manager Table (Profile)
CREATE TABLE IF NOT EXISTS Manager (
    id VARCHAR(36) PRIMARY KEY,
    user_account_id VARCHAR(36) UNIQUE NOT NULL,
    branch_id VARCHAR(36) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    hire_date DATE NOT NULL,
    status ENUM('active', 'inactive', 'on_leave') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (user_account_id) REFERENCES User_Account(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES Branch(id) ON DELETE RESTRICT
);

-- 3. Modify Appointment (The Job Card)
-- First, add branch_id to link jobs to branches
ALTER TABLE Appointment ADD COLUMN branch_id VARCHAR(36);
-- Since some appointments already exist, we need to handle NULLs or set a default.
-- We'll leave it NULL-able but enforce it in logic.
ALTER TABLE Appointment ADD FOREIGN KEY (branch_id) REFERENCES Branch(id) ON DELETE RESTRICT;

-- Expand status ENUM
-- We cannot easily modify ENUM inline in older MySQL without rebuilding the column, so we do it via ALTER
ALTER TABLE Appointment MODIFY COLUMN status ENUM(
    'REQUESTED', 
    'DIAGNOSIS', 
    'ESTIMATE', 
    'PENDING_APPROVAL', 
    'APPROVED', 
    'SCHEDULED', 
    'ASSIGNED', 
    'IN_PROGRESS', 
    'QUALITY_CHECK', 
    'COMPLETED', 
    'INVOICED', 
    'PAID', 
    'DELIVERED', 
    'CANCELLED'
) DEFAULT 'REQUESTED';

-- Map legacy statuses
UPDATE Appointment SET status = 'REQUESTED' WHERE status = 'scheduled';
UPDATE Appointment SET status = 'IN_PROGRESS' WHERE status = 'in_progress';
UPDATE Appointment SET status = 'COMPLETED' WHERE status = 'completed';
UPDATE Appointment SET status = 'CANCELLED' WHERE status = 'cancelled';

-- 4. Modify Mechanic Table
ALTER TABLE Mechanic ADD COLUMN branch_id VARCHAR(36);
ALTER TABLE Mechanic ADD FOREIGN KEY (branch_id) REFERENCES Branch(id) ON DELETE RESTRICT;
ALTER TABLE Mechanic ADD COLUMN skill_level INT DEFAULT 1; -- 1 (Beginner) to 5 (Expert)
ALTER TABLE Mechanic ADD COLUMN active_jobs_count INT DEFAULT 0;

-- 5. Create Approval_Request Table
CREATE TABLE IF NOT EXISTS Approval_Request (
    id VARCHAR(36) PRIMARY KEY,
    entity_type ENUM('JOB', 'INVOICE', 'DISCOUNT') NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    requested_by VARCHAR(36) NOT NULL, -- Manager ID
    details JSON,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    resolved_by VARCHAR(36), -- Owner ID (User_Account)
    resolved_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requested_by) REFERENCES Manager(id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES User_Account(id) ON DELETE SET NULL
);

-- =================================================================================
-- PROCEDURES
-- =================================================================================

DELIMITER //

-- Procedure 1: Smart Assign Mechanic
DROP PROCEDURE IF EXISTS sp_smart_assign_mechanic //
CREATE PROCEDURE sp_smart_assign_mechanic(IN p_appointment_id VARCHAR(36), IN p_branch_id VARCHAR(36))
BEGIN
    DECLARE v_best_mechanic_id VARCHAR(36);
    
    -- Find mechanic in the same branch, who is active, sorted by fewest active jobs and highest skill
    SELECT id INTO v_best_mechanic_id
    FROM Mechanic
    WHERE branch_id = p_branch_id AND status = 'active' AND deleted_at IS NULL
    ORDER BY active_jobs_count ASC, skill_level DESC
    LIMIT 1;
    
    IF v_best_mechanic_id IS NOT NULL THEN
        UPDATE Appointment 
        SET mechanic_id = v_best_mechanic_id, status = 'ASSIGNED'
        WHERE id = p_appointment_id;
        
        -- Increment workload count
        UPDATE Mechanic 
        SET active_jobs_count = active_jobs_count + 1 
        WHERE id = v_best_mechanic_id;
    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No available mechanics found in this branch.';
    END IF;
END //

-- Procedure 2: Process Approval
DROP PROCEDURE IF EXISTS sp_process_approval //
CREATE PROCEDURE sp_process_approval(
    IN p_request_id VARCHAR(36), 
    IN p_status ENUM('APPROVED', 'REJECTED'), 
    IN p_owner_id VARCHAR(36)
)
BEGIN
    DECLARE v_entity_type VARCHAR(20);
    DECLARE v_entity_id VARCHAR(36);
    DECLARE v_current_status VARCHAR(20);
    
    -- Transaction to ensure atomic update
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
    
    -- Resolve Request
    UPDATE Approval_Request 
    SET status = p_status, resolved_by = p_owner_id, resolved_at = CURRENT_TIMESTAMP
    WHERE id = p_request_id;
    
    -- Apply side-effects based on entity
    IF p_status = 'APPROVED' THEN
        IF v_entity_type = 'JOB' THEN
            UPDATE Appointment SET status = 'APPROVED' WHERE id = v_entity_id;
        END IF;
    ELSE
        -- If rejected, revert job to previous state or a specific rejected state
        IF v_entity_type = 'JOB' THEN
            UPDATE Appointment SET status = 'ESTIMATE' WHERE id = v_entity_id;
        END IF;
    END IF;
    
    COMMIT;
END //

DELIMITER ;

-- =================================================================================
-- VIEWS
-- =================================================================================

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
