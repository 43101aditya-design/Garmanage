-- Add Phase 2 columns to Vehicle
ALTER TABLE Vehicle
  ADD COLUMN vehicle_type VARCHAR(50) NULL AFTER license_plate,
  ADD COLUMN variant VARCHAR(100) NULL AFTER vehicle_type,
  ADD COLUMN fuel_type VARCHAR(50) NULL AFTER variant,
  ADD COLUMN odometer INT NULL AFTER fuel_type,
  ADD COLUMN status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE' AFTER odometer;

-- Create Service_Request table
CREATE TABLE IF NOT EXISTS Service_Request (
  id VARCHAR(36) PRIMARY KEY,
  request_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id VARCHAR(36) NOT NULL,
  vehicle_id VARCHAR(36) NOT NULL,
  garage_id VARCHAR(36) NOT NULL,
  service_type VARCHAR(100) NOT NULL,
  problem_description TEXT NULL,
  priority ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
  preferred_date DATE NOT NULL,
  preferred_time TIME NOT NULL,
  status ENUM('SUBMITTED', 'UNDER_REVIEW', 'CANCELLED') NOT NULL DEFAULT 'SUBMITTED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES Customer(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES Vehicle(id) ON DELETE CASCADE,
  FOREIGN KEY (garage_id) REFERENCES Garage(id) ON DELETE CASCADE,
  INDEX idx_sr_customer (customer_id),
  INDEX idx_sr_garage (garage_id),
  INDEX idx_sr_status (status)
);
