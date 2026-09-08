-- Phase 8: Anomaly detection table to store operational and financial alerts
CREATE TABLE IF NOT EXISTS Anomaly_Event (
    id VARCHAR(36) PRIMARY KEY,
    garage_id VARCHAR(36) NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'invoice', 'inventory', 'duration', 'cancellation', 'garage'
    entity_id VARCHAR(50) NOT NULL, -- e.g. invoice_id, part_id, customer_id
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    algorithm VARCHAR(50) NOT NULL, -- 'IQR', 'Z-Score', 'Isolation Forest', 'Rule'
    severity ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') NOT NULL,
    score DOUBLE NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('OPEN', 'REVIEWED', 'DISMISSED', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    reviewed_by VARCHAR(36) NULL,
    reviewed_at TIMESTAMP NULL,
    FOREIGN KEY (reviewed_by) REFERENCES User_Account(id) ON DELETE SET NULL,
    INDEX idx_anomaly_event_garage_status (garage_id, status),
    INDEX idx_anomaly_event_detected (detected_at)
);
