-- Phase 9: Digital Twin + Advanced Optimization + What-If Intelligence
-- Schema for Isolated Simulation Metadata, Scenario Reproducibility, and Optimization Results

CREATE TABLE IF NOT EXISTS Simulation_Scenario (
    id VARCHAR(36) PRIMARY KEY,
    garage_id VARCHAR(36) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    scenario_type ENUM(
        'MECHANIC_UNAVAILABLE',
        'DEMAND_INCREASE',
        'ADDITIONAL_MECHANIC',
        'INVENTORY_REDUCTION',
        'WORKING_HOURS_CHANGE',
        'JOB_SURGE',
        'HIGH_PRIORITY_INJECTION',
        'CUSTOM_COMPOSITE'
    ) NOT NULL,
    parameters JSON NOT NULL,
    status ENUM('CREATED', 'RUNNING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'CREATED',
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (garage_id) REFERENCES Garage(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES User_Account(id) ON DELETE RESTRICT,
    INDEX idx_sim_scenario_garage (garage_id, status),
    INDEX idx_sim_scenario_type (scenario_type),
    INDEX idx_sim_scenario_created (created_at)
);

CREATE TABLE IF NOT EXISTS Simulation_Run (
    id VARCHAR(36) PRIMARY KEY,
    scenario_id VARCHAR(36) NOT NULL,
    garage_id VARCHAR(36) NOT NULL,
    snapshot_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    snapshot_hash VARCHAR(64) NOT NULL,
    execution_trace JSON NOT NULL,
    status ENUM('SUCCESS', 'FAILED', 'INFEASIBLE') NOT NULL DEFAULT 'SUCCESS',
    execution_time_ms INT NOT NULL DEFAULT 0,
    model_versions JSON NOT NULL,
    objective_weights JSON NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scenario_id) REFERENCES Simulation_Scenario(id) ON DELETE CASCADE,
    FOREIGN KEY (garage_id) REFERENCES Garage(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES User_Account(id) ON DELETE RESTRICT,
    INDEX idx_sim_run_scenario (scenario_id),
    INDEX idx_sim_run_garage (garage_id),
    INDEX idx_sim_run_status (status),
    INDEX idx_sim_run_created (created_at)
);

CREATE TABLE IF NOT EXISTS Simulation_Result (
    id VARCHAR(36) PRIMARY KEY,
    run_id VARCHAR(36) NOT NULL,
    baseline_metrics JSON NOT NULL,
    simulated_metrics JSON NOT NULL,
    recommended_metrics JSON NOT NULL,
    bottlenecks JSON NOT NULL,
    affected_entities JSON NULL,
    inr_revenue_impact JSON NULL,
    optimization_details JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES Simulation_Run(id) ON DELETE CASCADE,
    INDEX idx_sim_result_run (run_id)
);
