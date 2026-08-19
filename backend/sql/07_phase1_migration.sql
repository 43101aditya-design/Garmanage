-- ============================================================
-- PHASE 1 MIGRATION: Multi-Garage + Firebase Auth + RBAC
-- ============================================================
-- Run this ONCE against the production database.
-- Backs up Branch data, renames to Garage, adds new tables.
-- ============================================================

-- 1. RENAME Branch → Garage
RENAME TABLE Branch TO Garage;

-- 2. ADD NEW COLUMNS to Garage
ALTER TABLE Garage
  ADD COLUMN description TEXT NULL AFTER name,
  ADD COLUMN email VARCHAR(100) NULL AFTER phone,
  ADD COLUMN city VARCHAR(100) NULL AFTER address,
  ADD COLUMN state VARCHAR(100) NULL AFTER city,
  ADD COLUMN postal_code VARCHAR(20) NULL AFTER state,
  ADD COLUMN latitude DECIMAL(10, 8) NULL AFTER postal_code,
  ADD COLUMN longitude DECIMAL(11, 8) NULL AFTER latitude,
  ADD COLUMN logo_url VARCHAR(500) NULL AFTER longitude,
  ADD COLUMN status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE' AFTER logo_url;

-- Migrate is_active boolean → status enum
UPDATE Garage SET status = CASE WHEN is_active = TRUE THEN 'ACTIVE' ELSE 'INACTIVE' END;
ALTER TABLE Garage DROP COLUMN is_active;

-- Indexes on Garage
CREATE INDEX idx_garage_status ON Garage(status);
CREATE INDEX idx_garage_city ON Garage(city);

-- 3. MODIFY User_Account for Firebase
ALTER TABLE User_Account
  ADD COLUMN firebase_uid VARCHAR(128) NULL AFTER id,
  ADD COLUMN name VARCHAR(100) NULL AFTER firebase_uid,
  ADD COLUMN phone VARCHAR(20) NULL AFTER email;

-- Make password_hash nullable (Firebase handles auth)
ALTER TABLE User_Account MODIFY COLUMN password_hash VARCHAR(255) NULL;

-- Update role enum to include 'owner' instead of 'admin'
ALTER TABLE User_Account MODIFY COLUMN role ENUM('admin', 'owner', 'manager', 'mechanic', 'customer') NOT NULL DEFAULT 'customer';

-- Migrate admin → owner
UPDATE User_Account SET role = 'owner' WHERE role = 'admin';

-- Now remove 'admin' from enum (keep owner)
ALTER TABLE User_Account MODIFY COLUMN role ENUM('owner', 'manager', 'mechanic', 'customer') NOT NULL DEFAULT 'customer';

-- Unique index on firebase_uid
CREATE UNIQUE INDEX idx_user_firebase_uid ON User_Account(firebase_uid);

-- 4. CREATE Role table (normalized)
CREATE TABLE IF NOT EXISTS Role (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed roles
INSERT IGNORE INTO Role (id, name, description) VALUES
  (UUID(), 'owner', 'Garage owner with full administrative access'),
  (UUID(), 'manager', 'Branch manager with operational access'),
  (UUID(), 'mechanic', 'Service technician with job access'),
  (UUID(), 'customer', 'End customer with service access');

-- 5. CREATE Garage_Membership table
CREATE TABLE IF NOT EXISTS Garage_Membership (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  garage_id VARCHAR(36) NOT NULL,
  role_id VARCHAR(36) NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES User_Account(id) ON DELETE CASCADE,
  FOREIGN KEY (garage_id) REFERENCES Garage(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES Role(id) ON DELETE RESTRICT,
  
  UNIQUE KEY uk_user_garage (user_id, garage_id),
  INDEX idx_membership_garage (garage_id),
  INDEX idx_membership_user (user_id),
  INDEX idx_membership_status (status)
);

-- 6. RENAME branch_id → garage_id in dependent tables
ALTER TABLE Manager CHANGE branch_id garage_id VARCHAR(36) NOT NULL;
ALTER TABLE Mechanic CHANGE branch_id garage_id VARCHAR(36) NULL;
ALTER TABLE Appointment CHANGE branch_id garage_id VARCHAR(36) NULL;

-- 7. ENHANCE Audit_Log
ALTER TABLE Audit_Log
  ADD COLUMN garage_id VARCHAR(36) NULL AFTER user_id,
  ADD COLUMN entity_type VARCHAR(50) NULL AFTER action,
  ADD COLUMN entity_id VARCHAR(36) NULL AFTER entity_type,
  ADD COLUMN metadata JSON NULL AFTER entity_id;

CREATE INDEX idx_audit_garage ON Audit_Log(garage_id);
CREATE INDEX idx_audit_user ON Audit_Log(user_id);

-- 8. UPDATE VIEWS that reference Branch or branch_id

-- Drop and recreate View_Branch_Performance → View_Garage_Performance  
DROP VIEW IF EXISTS View_Branch_Performance;
CREATE VIEW View_Garage_Performance AS
SELECT 
    g.id AS garage_id,
    g.name AS garage_name,
    COUNT(a.id) AS total_jobs,
    SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_jobs,
    COALESCE(SUM(p.amount), 0) AS total_revenue
FROM Garage g
LEFT JOIN Appointment a ON g.id = a.garage_id AND a.deleted_at IS NULL
LEFT JOIN Invoice i ON a.id = i.appointment_id AND i.deleted_at IS NULL
LEFT JOIN Payment p ON i.id = p.invoice_id AND p.deleted_at IS NULL
WHERE g.deleted_at IS NULL
GROUP BY g.id, g.name;

-- Update View_Manager_Contribution to use garage_id
DROP VIEW IF EXISTS View_Manager_Contribution;
CREATE VIEW View_Manager_Contribution AS
SELECT 
    m.id AS manager_id,
    CONCAT(m.first_name, ' ', m.last_name) AS manager_name,
    g.name AS garage_name,
    COUNT(a.id) AS managed_jobs,
    SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_jobs,
    ROUND(
        SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(a.id), 0), 
        1
    ) AS completion_rate,
    COALESCE(SUM(p.amount), 0) AS total_revenue
FROM Manager m
JOIN Garage g ON m.garage_id = g.id
LEFT JOIN Appointment a ON a.garage_id = m.garage_id AND a.deleted_at IS NULL
LEFT JOIN Invoice i ON a.id = i.appointment_id AND i.deleted_at IS NULL
LEFT JOIN Payment p ON i.id = p.invoice_id AND p.deleted_at IS NULL
WHERE m.deleted_at IS NULL
GROUP BY m.id, m.first_name, m.last_name, g.name;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
