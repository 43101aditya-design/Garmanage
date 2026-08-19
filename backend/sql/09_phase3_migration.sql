ALTER TABLE Service_Request 
  MODIFY COLUMN status ENUM('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SCHEDULED', 'JOB_CREATED', 'CANCELLED') NOT NULL DEFAULT 'SUBMITTED',
  ADD COLUMN rejection_reason TEXT NULL AFTER status;

ALTER TABLE Appointment
  ADD COLUMN service_request_id VARCHAR(36) NULL AFTER id,
  ADD COLUMN end_time TIME NULL AFTER appointment_time,
  ADD CONSTRAINT fk_appt_sr FOREIGN KEY (service_request_id) REFERENCES Service_Request(id) ON DELETE SET NULL,
  MODIFY COLUMN status ENUM('SCHEDULED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'scheduled', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'SCHEDULED';

CREATE TABLE IF NOT EXISTS Job_Card (
  id VARCHAR(36) PRIMARY KEY,
  job_number VARCHAR(50) UNIQUE NOT NULL,
  service_request_id VARCHAR(36) NOT NULL,
  appointment_id VARCHAR(36) NOT NULL,
  garage_id VARCHAR(36) NOT NULL,
  customer_id VARCHAR(36) NOT NULL,
  vehicle_id VARCHAR(36) NOT NULL,
  problem_description TEXT NULL,
  service_type VARCHAR(100) NOT NULL,
  priority ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
  complexity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  status ENUM('CREATED', 'READY_FOR_ASSIGNMENT', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CLOSED') NOT NULL DEFAULT 'CREATED',
  estimated_duration_minutes INT NULL,
  actual_duration_minutes INT NULL,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (service_request_id) REFERENCES Service_Request(id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES Appointment(id) ON DELETE CASCADE,
  FOREIGN KEY (garage_id) REFERENCES Garage(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES Customer(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES Vehicle(id) ON DELETE CASCADE,
  INDEX idx_job_garage (garage_id),
  INDEX idx_job_status (status)
);

CREATE TABLE IF NOT EXISTS Job_Note (
  id VARCHAR(36) PRIMARY KEY,
  job_card_id VARCHAR(36) NOT NULL,
  author_id VARCHAR(36) NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_card_id) REFERENCES Job_Card(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES User_Account(id) ON DELETE CASCADE
);
