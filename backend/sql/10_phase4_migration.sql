CREATE TABLE IF NOT EXISTS Mechanic_Profile (
  id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL, garage_id VARCHAR(36) NOT NULL,
  employee_code VARCHAR(50) UNIQUE NOT NULL, experience_years INT DEFAULT 0,
  employment_status ENUM('ACTIVE', 'ON_LEAVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  date_joined DATE NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES User_Account(id) ON DELETE CASCADE, FOREIGN KEY (garage_id) REFERENCES Garage(id) ON DELETE CASCADE, UNIQUE KEY unique_user_garage (user_id, garage_id)
);
CREATE TABLE IF NOT EXISTS Skill (
  id VARCHAR(36) PRIMARY KEY, name VARCHAR(100) UNIQUE NOT NULL, description TEXT NULL,
  category VARCHAR(100) NULL, status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE'
);
CREATE TABLE IF NOT EXISTS Mechanic_Skill (
  id VARCHAR(36) PRIMARY KEY, mechanic_id VARCHAR(36) NOT NULL, skill_id VARCHAR(36) NOT NULL,
  proficiency_level ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT') NOT NULL,
  years_experience INT DEFAULT 0, verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (mechanic_id) REFERENCES Mechanic_Profile(id) ON DELETE CASCADE, FOREIGN KEY (skill_id) REFERENCES Skill(id) ON DELETE CASCADE, UNIQUE KEY unique_mechanic_skill (mechanic_id, skill_id)
);
CREATE TABLE IF NOT EXISTS Certification (
  id VARCHAR(36) PRIMARY KEY, mechanic_id VARCHAR(36) NOT NULL, name VARCHAR(200) NOT NULL,
  issuer VARCHAR(200) NOT NULL, certificate_number VARCHAR(100) NULL, issue_date DATE NOT NULL,
  expiry_date DATE NULL, status ENUM('ACTIVE', 'EXPIRED', 'REVOKED') DEFAULT 'ACTIVE', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mechanic_id) REFERENCES Mechanic_Profile(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS Mechanic_Availability (
  id VARCHAR(36) PRIMARY KEY, mechanic_id VARCHAR(36) NOT NULL,
  day_of_week ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL,
  start_time TIME NOT NULL, end_time TIME NOT NULL, is_available BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (mechanic_id) REFERENCES Mechanic_Profile(id) ON DELETE CASCADE, UNIQUE KEY unique_mechanic_day (mechanic_id, day_of_week)
);
CREATE TABLE IF NOT EXISTS Mechanic_Unavailability (
  id VARCHAR(36) PRIMARY KEY, mechanic_id VARCHAR(36) NOT NULL, start_datetime DATETIME NOT NULL, end_datetime DATETIME NOT NULL,
  reason VARCHAR(200) NOT NULL, status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'APPROVED', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mechanic_id) REFERENCES Mechanic_Profile(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS Job_Assignment (
  id VARCHAR(36) PRIMARY KEY, job_card_id VARCHAR(36) NOT NULL, mechanic_id VARCHAR(36) NOT NULL, assigned_by VARCHAR(36) NOT NULL,
  assignment_type ENUM('MANUAL', 'AI_RECOMMENDED') NOT NULL DEFAULT 'MANUAL',
  status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, accepted_at TIMESTAMP NULL, started_at TIMESTAMP NULL, completed_at TIMESTAMP NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_card_id) REFERENCES Job_Card(id) ON DELETE CASCADE, FOREIGN KEY (mechanic_id) REFERENCES Mechanic_Profile(id) ON DELETE CASCADE, FOREIGN KEY (assigned_by) REFERENCES User_Account(id) ON DELETE RESTRICT
);
-- Seed basic skills and profiles
INSERT IGNORE INTO Skill (id, name, category) VALUES (UUID(), 'Engine', 'Mechanical'),(UUID(), 'Brakes', 'Mechanical'),(UUID(), 'Electrical', 'Electrical'),(UUID(), 'Diagnostics', 'Diagnostics'),(UUID(), 'Transmission', 'Mechanical'),(UUID(), 'AC', 'HVAC');
INSERT INTO Mechanic_Profile (id, user_id, garage_id, employee_code, date_joined) SELECT UUID(), u.id, gm.garage_id, CONCAT('EMP-', LEFT(u.id, 6)), CURDATE() FROM User_Account u JOIN Garage_Membership gm ON u.id = gm.user_id WHERE u.role = 'mechanic' AND gm.status = 'ACTIVE' ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
