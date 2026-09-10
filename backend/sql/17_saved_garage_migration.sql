-- ============================================================
-- PHASE 12: CUSTOMER SAVED GARAGES (FAVORITES)
-- ============================================================

CREATE TABLE IF NOT EXISTS Saved_Garage (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36) NOT NULL,
  garage_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (customer_id) REFERENCES Customer(id) ON DELETE CASCADE,
  FOREIGN KEY (garage_id) REFERENCES Garage(id) ON DELETE CASCADE,
  
  UNIQUE KEY uk_customer_garage (customer_id, garage_id),
  INDEX idx_saved_garage_customer (customer_id),
  INDEX idx_saved_garage_garage (garage_id)
);
