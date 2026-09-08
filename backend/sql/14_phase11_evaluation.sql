-- Phase 11: Experiment Logging for Model Validation and Benchmarks
CREATE TABLE IF NOT EXISTS AI_Experiment_Log (
    id VARCHAR(36) PRIMARY KEY,
    experiment_name VARCHAR(100) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    dataset_name VARCHAR(100) NOT NULL,
    parameters JSON NOT NULL,
    metrics JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
