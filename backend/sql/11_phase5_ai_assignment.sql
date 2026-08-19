-- Phase 5: AI assignment recommendations are advisory records. Job_Assignment
-- remains the authoritative production assignment table.

CREATE TABLE IF NOT EXISTS Job_Required_Skill (
  id VARCHAR(36) PRIMARY KEY,
  job_card_id VARCHAR(36) NOT NULL,
  skill_id VARCHAR(36) NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_card_id) REFERENCES Job_Card(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES Skill(id) ON DELETE RESTRICT,
  UNIQUE KEY uk_job_required_skill (job_card_id, skill_id),
  INDEX idx_required_skill_job (job_card_id)
);

CREATE TABLE IF NOT EXISTS AI_Job_Recommendation (
  id VARCHAR(36) PRIMARY KEY,
  job_card_id VARCHAR(36) NOT NULL,
  garage_id VARCHAR(36) NOT NULL,
  model_version VARCHAR(100) NOT NULL,
  mode ENUM('COLD_START', 'ML_RANKING') NOT NULL,
  recommended_mechanic_id VARCHAR(36) NOT NULL,
  suitability_score DECIMAL(9,6) NOT NULL,
  rank_position INT NOT NULL DEFAULT 1,
  reasoning_data JSON NOT NULL,
  optimization_metadata JSON NULL,
  input_fingerprint CHAR(64) NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
  reviewed_by VARCHAR(36) NULL,
  manager_choice_mechanic_id VARCHAR(36) NULL,
  review_reason TEXT NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (job_card_id) REFERENCES Job_Card(id) ON DELETE CASCADE,
  FOREIGN KEY (garage_id) REFERENCES Garage(id) ON DELETE CASCADE,
  FOREIGN KEY (recommended_mechanic_id) REFERENCES Mechanic_Profile(id) ON DELETE RESTRICT,
  FOREIGN KEY (reviewed_by) REFERENCES User_Account(id) ON DELETE SET NULL,
  FOREIGN KEY (manager_choice_mechanic_id) REFERENCES Mechanic_Profile(id) ON DELETE RESTRICT,
  INDEX idx_ai_recommendation_job_status (job_card_id, status),
  INDEX idx_ai_recommendation_garage_status (garage_id, status),
  INDEX idx_ai_recommendation_created (created_at)
);

CREATE TABLE IF NOT EXISTS AI_Assignment_Audit_Event (
  id VARCHAR(36) PRIMARY KEY,
  recommendation_id VARCHAR(36) NULL,
  job_card_id VARCHAR(36) NOT NULL,
  garage_id VARCHAR(36) NOT NULL,
  actor_user_id VARCHAR(36) NULL,
  event_type ENUM('RECOMMENDATION_CREATED', 'RECOMMENDATION_EXPIRED', 'RECOMMENDATION_REJECTED', 'RECOMMENDATION_APPROVED', 'MANAGER_OVERRIDE', 'MODEL_TRAINED') NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recommendation_id) REFERENCES AI_Job_Recommendation(id) ON DELETE SET NULL,
  FOREIGN KEY (job_card_id) REFERENCES Job_Card(id) ON DELETE CASCADE,
  FOREIGN KEY (garage_id) REFERENCES Garage(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES User_Account(id) ON DELETE SET NULL,
  INDEX idx_ai_assignment_audit_garage_event (garage_id, event_type),
  INDEX idx_ai_assignment_audit_recommendation (recommendation_id)
);
