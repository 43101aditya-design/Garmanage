-- ============================================================================
-- INTELLIGARAGE / SVSMS - PHASE 6: INTELLIGENT INVENTORY & PARTS MANAGEMENT SCHEMA
-- DBMS Relational Tables, Stored Procedures, Audit Triggers, and Foreign Keys
-- ============================================================================

-- 1. PARTS MASTER CATALOG
CREATE TABLE IF NOT EXISTS part_catalog (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    part_number VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    vehicle_compatibility VARCHAR(255) DEFAULT 'Universal',
    unit VARCHAR(50) DEFAULT 'Piece',
    unit_cost DECIMAL(10, 2) NOT NULL CHECK (unit_cost >= 0),
    selling_price DECIMAL(10, 2) NOT NULL CHECK (selling_price >= unit_cost),
    supplier VARCHAR(200) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. GARAGE-SPECIFIC INVENTORY STOCK
CREATE TABLE IF NOT EXISTS garage_inventory (
    id VARCHAR(50) PRIMARY KEY,
    part_id VARCHAR(50) NOT NULL,
    garage_id VARCHAR(50) NOT NULL,
    quantity_in_stock INT NOT NULL DEFAULT 0 CHECK (quantity_in_stock >= 0),
    reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0 AND reserved_quantity <= quantity_in_stock),
    reorder_level INT NOT NULL DEFAULT 10 CHECK (reorder_level >= 0),
    unit_cost DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    location VARCHAR(100) DEFAULT 'Main Bin',
    last_restock_date DATE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (part_id) REFERENCES part_catalog(id) ON DELETE RESTRICT,
    FOREIGN KEY (garage_id) REFERENCES garages(id) ON DELETE CASCADE,
    UNIQUE KEY uq_garage_part (garage_id, part_id)
);

-- 3. AUDITABLE INVENTORY MOVEMENT LEDGER
CREATE TABLE IF NOT EXISTS inventory_movements (
    id VARCHAR(50) PRIMARY KEY,
    part_id VARCHAR(50) NOT NULL,
    garage_id VARCHAR(50) NOT NULL,
    movement_type ENUM('PURCHASE', 'RECEIVE', 'RESERVE', 'RELEASE', 'CONSUME', 'ADJUSTMENT', 'TRANSFER', 'RETURN') NOT NULL,
    quantity_changed INT NOT NULL,
    previous_quantity INT NOT NULL,
    new_quantity INT NOT NULL,
    reference_type ENUM('JOB_CARD', 'PURCHASE_ORDER', 'TRANSFER', 'MANUAL_ADJUSTMENT') NOT NULL,
    reference_id VARCHAR(100) NOT NULL,
    performed_by VARCHAR(50) NOT NULL,
    performed_by_name VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (part_id) REFERENCES part_catalog(id),
    FOREIGN KEY (garage_id) REFERENCES garages(id)
);

-- 4. PURCHASE REQUESTS & REPLENISHMENT WORKFLOW
CREATE TABLE IF NOT EXISTS purchase_requests (
    id VARCHAR(50) PRIMARY KEY,
    request_number VARCHAR(50) UNIQUE NOT NULL,
    garage_id VARCHAR(50) NOT NULL,
    part_id VARCHAR(50) NOT NULL,
    requested_quantity INT NOT NULL CHECK (requested_quantity > 0),
    approved_quantity INT DEFAULT 0,
    unit_cost DECIMAL(10, 2) NOT NULL,
    supplier VARCHAR(200) NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED') DEFAULT 'PENDING',
    requested_by VARCHAR(50) NOT NULL,
    approved_by VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (part_id) REFERENCES part_catalog(id),
    FOREIGN KEY (garage_id) REFERENCES garages(id)
);

-- 5. INTER-GARAGE STOCK TRANSFERS
CREATE TABLE IF NOT EXISTS garage_transfers (
    id VARCHAR(50) PRIMARY KEY,
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    source_garage_id VARCHAR(50) NOT NULL,
    target_garage_id VARCHAR(50) NOT NULL,
    part_id VARCHAR(50) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    status ENUM('PENDING', 'DISPATCHED', 'RECEIVED', 'CANCELLED') DEFAULT 'PENDING',
    requested_by VARCHAR(50) NOT NULL,
    approved_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_garage_id) REFERENCES garages(id),
    FOREIGN KEY (target_garage_id) REFERENCES garages(id),
    FOREIGN KEY (part_id) REFERENCES part_catalog(id)
);

-- 6. JOB CARD PART REQUIREMENTS
CREATE TABLE IF NOT EXISTS job_part_requirements (
    id VARCHAR(50) PRIMARY KEY,
    appointment_id VARCHAR(50) NOT NULL,
    part_id VARCHAR(50) NOT NULL,
    garage_id VARCHAR(50) NOT NULL,
    requested_qty INT NOT NULL CHECK (requested_qty > 0),
    reserved_qty INT NOT NULL DEFAULT 0,
    consumed_qty INT NOT NULL DEFAULT 0,
    unit_price DECIMAL(10, 2) NOT NULL,
    status ENUM('REQUIRED', 'RESERVED', 'CONSUMED', 'UNAVAILABLE', 'RETURNED') DEFAULT 'REQUIRED',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES part_catalog(id)
);

-- ============================================================================
-- STORED PROCEDURES FOR TRANSACTIONAL INTEGRITY
-- ============================================================================

DELIMITER //

-- STORED PROCEDURE: Reserve Stock for Job Card
CREATE PROCEDURE sp_reserve_part(
    IN p_garage_id VARCHAR(50),
    IN p_part_id VARCHAR(50),
    IN p_qty INT,
    IN p_appointment_id VARCHAR(50),
    IN p_user_id VARCHAR(50),
    IN p_user_name VARCHAR(100)
)
BEGIN
    DECLARE v_available INT;
    DECLARE v_current_stock INT;
    DECLARE v_current_reserved INT;
    
    START TRANSACTION;
    
    -- Lock inventory row for update
    SELECT quantity_in_stock, reserved_quantity 
    INTO v_current_stock, v_current_reserved
    FROM garage_inventory
    WHERE garage_id = p_garage_id AND part_id = p_part_id
    FOR UPDATE;
    
    SET v_available = v_current_stock - v_current_reserved;
    
    IF v_available < p_qty THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'PART UNAVAILABLE: Insufficient stock to reserve.';
    ELSE
        -- Update reserved quantity
        UPDATE garage_inventory 
        SET reserved_quantity = reserved_quantity + p_qty,
            last_updated = CURRENT_TIMESTAMP
        WHERE garage_id = p_garage_id AND part_id = p_part_id;
        
        -- Insert movement log
        INSERT INTO inventory_movements (id, part_id, garage_id, movement_type, quantity_changed, previous_quantity, new_quantity, reference_type, reference_id, performed_by, performed_by_name, notes)
        VALUES (UUID(), p_part_id, p_garage_id, 'RESERVE', p_qty, v_current_stock, v_current_stock, 'JOB_CARD', p_appointment_id, p_user_id, p_user_name, CONCAT('Reserved ', p_qty, ' units'));
        
        COMMIT;
    END IF;
END //

-- STORED PROCEDURE: Inter-Garage Stock Transfer
CREATE PROCEDURE sp_transfer_stock(
    IN p_source_garage_id VARCHAR(50),
    IN p_target_garage_id VARCHAR(50),
    IN p_part_id VARCHAR(50),
    IN p_qty INT,
    IN p_user_id VARCHAR(50),
    IN p_user_name VARCHAR(100)
)
BEGIN
    DECLARE v_source_avail INT;
    
    START TRANSACTION;
    
    -- Verify & lock source
    SELECT (quantity_in_stock - reserved_quantity) INTO v_source_avail
    FROM garage_inventory
    WHERE garage_id = p_source_garage_id AND part_id = p_part_id
    FOR UPDATE;
    
    IF v_source_avail < p_qty THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TRANSFER FAILED: Insufficient available stock at source garage.';
    ELSE
        -- Decrease source stock
        UPDATE garage_inventory
        SET quantity_in_stock = quantity_in_stock - p_qty
        WHERE garage_id = p_source_garage_id AND part_id = p_part_id;
        
        -- Increase/Insert target stock
        INSERT INTO garage_inventory (id, part_id, garage_id, quantity_in_stock, reserved_quantity, reorder_level, unit_cost, unit_price)
        VALUES (UUID(), p_part_id, p_target_garage_id, p_qty, 0, 10, 20.00, 35.00)
        ON DUPLICATE KEY UPDATE quantity_in_stock = quantity_in_stock + p_qty;
        
        -- Log transfer movement
        INSERT INTO inventory_movements (id, part_id, garage_id, movement_type, quantity_changed, previous_quantity, new_quantity, reference_type, reference_id, performed_by, performed_by_name, notes)
        VALUES (UUID(), p_part_id, p_source_garage_id, 'TRANSFER', -p_qty, v_source_avail, v_source_avail - p_qty, 'TRANSFER', UUID(), p_user_id, p_user_name, CONCAT('Dispatched ', p_qty, ' units to garage ', p_target_garage_id));
        
        COMMIT;
    END IF;
END //

DELIMITER ;
