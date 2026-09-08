-- Phase 7: Prediction Logs for model monitoring, auditing, and drift detection
CREATE TABLE IF NOT EXISTS Prediction_Log (
    id VARCHAR(36) PRIMARY KEY,
    prediction_type VARCHAR(50) NOT NULL, -- 'revenue', 'workload', 'inventory_demand', 'service_duration'
    garage_id VARCHAR(36) NULL,
    target_id VARCHAR(50) NULL, -- e.g., part_id or job_id
    model_version VARCHAR(50) NOT NULL,
    prediction_input JSON NOT NULL,
    prediction_output JSON NOT NULL,
    actual_outcome DOUBLE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_prediction_log_type_garage (prediction_type, garage_id),
    INDEX idx_prediction_log_created (created_at)
);
