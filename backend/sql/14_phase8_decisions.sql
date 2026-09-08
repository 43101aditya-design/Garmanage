-- Phase 8: AI Decision Intelligence & Controlled Autonomous Operations
-- Strict 3NF schema for Decision Auditing, Human Review Feedback, and Outcome Tracking

CREATE TABLE IF NOT EXISTS Decision_Audit (
    id VARCHAR(36) PRIMARY KEY,
    garage_id VARCHAR(36) NOT NULL,
    decision_type ENUM(
        'MECHANIC_ASSIGNMENT',
        'JOB_PRIORITIZATION',
        'APPOINTMENT_SCHEDULING',
        'WORKLOAD_REBALANCING',
        'INVENTORY_REORDER',
        'REVENUE_OPTIMIZATION'
    ) NOT NULL,
    target_entity_type VARCHAR(50) NOT NULL, -- 'job_card', 'appointment', 'inventory_part', 'garage', etc.
    target_entity_id VARCHAR(50) NOT NULL,
    input_summary JSON NOT NULL,
    recommendation_payload JSON NOT NULL,
    confidence_level ENUM('HIGH_CONFIDENCE', 'MEDIUM_CONFIDENCE', 'LOW_CONFIDENCE') NOT NULL,
    confidence_score DECIMAL(5,2) NOT NULL,
    model_versions JSON NOT NULL,
    constraints_checked JSON NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'MODIFIED', 'EXECUTED', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    reviewed_by VARCHAR(36) NULL,
    decision_reason TEXT NULL,
    manager_override_payload JSON NULL,
    executed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (garage_id) REFERENCES Garage(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES User_Account(id) ON DELETE SET NULL,
    INDEX idx_decision_audit_garage_status (garage_id, status),
    INDEX idx_decision_audit_type (decision_type),
    INDEX idx_decision_audit_target (target_entity_type, target_entity_id),
    INDEX idx_decision_audit_created (created_at)
);

CREATE TABLE IF NOT EXISTS Decision_Feedback (
    id VARCHAR(36) PRIMARY KEY,
    decision_id VARCHAR(36) NOT NULL,
    action_taken ENUM('APPROVED', 'REJECTED', 'MODIFIED') NOT NULL,
    rejection_reason_code ENUM(
        'WRONG_MECHANIC',
        'WRONG_TIMING',
        'AVAILABILITY_ISSUE',
        'BUSINESS_PREFERENCE',
        'PREDICTION_INACCURATE',
        'OTHER'
    ) NULL,
    notes TEXT NULL,
    user_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (decision_id) REFERENCES Decision_Audit(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES User_Account(id) ON DELETE CASCADE,
    INDEX idx_decision_feedback_decision (decision_id),
    INDEX idx_decision_feedback_reason (rejection_reason_code)
);

CREATE TABLE IF NOT EXISTS Decision_Outcome (
    id VARCHAR(36) PRIMARY KEY,
    decision_id VARCHAR(36) NOT NULL,
    predicted_impact JSON NOT NULL,
    actual_outcome JSON NULL,
    deviation_metrics JSON NULL,
    evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (decision_id) REFERENCES Decision_Audit(id) ON DELETE CASCADE,
    INDEX idx_decision_outcome_decision (decision_id)
);
