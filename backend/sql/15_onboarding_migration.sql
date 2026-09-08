USE svsms_db;

-- ============================================================
-- PHASE 12 MIGRATION: Smart Onboarding & Garage Join Codes
-- ============================================================

-- 1. Add join_code and garage_type to Garage (safe IF NOT EXISTS via check)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='svsms_db' AND TABLE_NAME='Garage' AND COLUMN_NAME='join_code');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE Garage ADD COLUMN join_code VARCHAR(12) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col2_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='svsms_db' AND TABLE_NAME='Garage' AND COLUMN_NAME='garage_type');
SET @sql2 = IF(@col2_exists = 0, "ALTER TABLE Garage ADD COLUMN garage_type VARCHAR(50) NULL DEFAULT 'general'", 'SELECT 1');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- Unique index on join_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_garage_join_code ON Garage(join_code);

-- 2. Add onboarding_state to User_Account
SET @col3_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='svsms_db' AND TABLE_NAME='User_Account' AND COLUMN_NAME='onboarding_state');
SET @sql3 = IF(@col3_exists = 0, "ALTER TABLE User_Account ADD COLUMN onboarding_state ENUM('ACTIVE','PENDING_APPROVAL','ONBOARDING') NOT NULL DEFAULT 'ACTIVE'", 'SELECT 1');
PREPARE stmt3 FROM @sql3; EXECUTE stmt3; DEALLOCATE PREPARE stmt3;

-- 3. Create Garage_Join_Request table
CREATE TABLE IF NOT EXISTS Garage_Join_Request (
  id VARCHAR(36) PRIMARY KEY,
  requester_id VARCHAR(36) NOT NULL,
  garage_id VARCHAR(36) NOT NULL,
  requested_role ENUM('manager','mechanic') NOT NULL,
  status ENUM('PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  message TEXT NULL,
  reviewed_by VARCHAR(36) NULL,
  reviewed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (requester_id) REFERENCES User_Account(id) ON DELETE CASCADE,
  FOREIGN KEY (garage_id) REFERENCES Garage(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES User_Account(id) ON DELETE SET NULL,

  INDEX idx_join_request_garage_status (garage_id, status),
  INDEX idx_join_request_requester (requester_id)
);

SELECT 'Migration 15_onboarding complete' AS result;
