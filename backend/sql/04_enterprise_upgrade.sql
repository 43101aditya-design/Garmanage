USE svsms_db;

-- 1. Create User_Account Table for Auth and RBAC
CREATE TABLE IF NOT EXISTS User_Account (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'mechanic', 'customer') NOT NULL DEFAULT 'customer',
    reference_id VARCHAR(36), -- Links to Customer.id or Mechanic.id, NULL for admin
    refresh_token VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL
);

-- 2. Create Login_History Table
CREATE TABLE IF NOT EXISTS Login_History (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status ENUM('success', 'failed') NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES User_Account(id) ON DELETE CASCADE
);

-- 3. Create Audit_Log Table
CREATE TABLE IF NOT EXISTS Audit_Log (
    id VARCHAR(36) PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id VARCHAR(36) NOT NULL,
    action ENUM('INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE') NOT NULL,
    old_value JSON,
    new_value JSON,
    user_id VARCHAR(36), -- Who made the change (from JWT)
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Add Soft Delete (deleted_at) to all main tables
ALTER TABLE Customer ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE Vehicle ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE Mechanic ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE Appointment ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE Service ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE Inventory ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE Service_Record ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE Spare_Part ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE Invoice ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE Payment ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- 5. Drop old views and recreate with Soft Delete filter
DROP VIEW IF EXISTS Customer_Vehicle_Summary;
CREATE VIEW Customer_Vehicle_Summary AS
SELECT 
    c.id AS customer_id,
    c.first_name,
    c.last_name,
    COUNT(v.id) AS total_vehicles,
    MAX(a.appointment_date) AS last_visit
FROM Customer c
LEFT JOIN Vehicle v ON c.id = v.customer_id AND v.deleted_at IS NULL
LEFT JOIN Appointment a ON c.id = a.customer_id AND a.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id;

DROP VIEW IF EXISTS Mechanic_Performance;
CREATE VIEW Mechanic_Performance AS
SELECT 
    m.id AS mechanic_id,
    m.first_name,
    m.last_name,
    COUNT(sr.id) AS total_services_completed,
    SUM(sr.labor_hours) AS total_labor_hours
FROM Mechanic m
LEFT JOIN Service_Record sr ON m.id = sr.mechanic_id AND sr.status = 'completed' AND sr.deleted_at IS NULL
WHERE m.deleted_at IS NULL
GROUP BY m.id;

DROP VIEW IF EXISTS Revenue_Summary;
CREATE VIEW Revenue_Summary AS
SELECT 
    DATE_FORMAT(issue_date, '%Y-%m') AS revenue_month,
    SUM(total_amount) AS total_billed,
    SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) AS total_collected
FROM Invoice
WHERE deleted_at IS NULL
GROUP BY revenue_month;

-- 6. Insert Default Admin Account
-- Password is 'admin123' (we'll hash this in JS or just provide a pre-hashed bcrypt string here)
-- bcrypt hash for 'admin123' with salt rounds 10
INSERT INTO User_Account (id, username, email, password_hash, role)
VALUES ('admin-uuid-1', 'admin', 'admin@svsms.com', '$2a$10$wN305nMyu3aRXX0.PZJjQukQc.sN/t8C./D2B7q5hPOnm.XlC.y4y', 'admin')
ON DUPLICATE KEY UPDATE id=id;
