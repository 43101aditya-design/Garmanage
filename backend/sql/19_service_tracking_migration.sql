-- Migration 19: Real-time Service Tracking & Expected Completion System

-- 1. Extend Job_Card status ENUM and add ETA / tracking fields
ALTER TABLE Job_Card
  MODIFY COLUMN status ENUM(
    'CREATED',
    'READY_FOR_ASSIGNMENT',
    'ASSIGNED',
    'IN_PROGRESS',
    'QUALITY_CHECK',
    'READY_FOR_PICKUP',
    'ON_HOLD',
    'COMPLETED',
    'CLOSED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'CREATED',
  ADD COLUMN estimated_start_at DATETIME NULL AFTER estimated_duration_minutes,
  ADD COLUMN estimated_completion_at DATETIME NULL AFTER estimated_start_at,
  ADD COLUMN last_status_change_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER completed_at,
  ADD COLUMN delay_reason VARCHAR(255) NULL AFTER last_status_change_at;

-- 2. Add performance indexes for tracking queries
CREATE INDEX idx_job_customer_status ON Job_Card(customer_id, status);
CREATE INDEX idx_job_garage_status ON Job_Card(garage_id, status);
CREATE INDEX idx_job_estimated_completion ON Job_Card(estimated_completion_at);

-- 3. Create Job_Status_History table for auditable timeline
CREATE TABLE IF NOT EXISTS Job_Status_History (
  id VARCHAR(36) PRIMARY KEY,
  job_card_id VARCHAR(36) NOT NULL,
  previous_status VARCHAR(50) NULL,
  new_status VARCHAR(50) NOT NULL,
  stage_label VARCHAR(100) NOT NULL,
  changed_by VARCHAR(36) NULL,
  changed_by_role VARCHAR(50) NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason VARCHAR(255) NULL,
  notes TEXT NULL,
  estimated_completion_at DATETIME NULL,
  FOREIGN KEY (job_card_id) REFERENCES Job_Card(id) ON DELETE CASCADE,
  INDEX idx_job_status_hist_job (job_card_id, changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
