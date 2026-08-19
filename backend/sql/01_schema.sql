-- Create Database
CREATE DATABASE IF NOT EXISTS svsms_db;
USE svsms_db;

-- 1. Customer Table
CREATE TABLE IF NOT EXISTS Customer (
    id VARCHAR(36) PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_customer_email CHECK (email LIKE '%@%')
);

-- 2. Vehicle Table
CREATE TABLE IF NOT EXISTS Vehicle (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36) NOT NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    vin VARCHAR(17) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES Customer(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_vehicle_year CHECK (year >= 1886 AND year <= 2100)
);

-- 3. Mechanic Table
CREATE TABLE IF NOT EXISTS Mechanic (
    id VARCHAR(36) PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    specialization VARCHAR(100),
    hire_date DATE NOT NULL,
    status ENUM('active', 'inactive', 'on_leave') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Appointment Table
CREATE TABLE IF NOT EXISTS Appointment (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(36) NOT NULL,
    vehicle_id VARCHAR(36) NOT NULL,
    mechanic_id VARCHAR(36),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES Customer(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES Vehicle(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (mechanic_id) REFERENCES Mechanic(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- 5. Service (Master Catalog) Table
CREATE TABLE IF NOT EXISTS Service (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    estimated_duration_minutes INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_service_price CHECK (base_price >= 0),
    CONSTRAINT chk_service_duration CHECK (estimated_duration_minutes > 0)
);

-- 6. Inventory (Master Parts Catalog & Stock)
CREATE TABLE IF NOT EXISTS Inventory (
    id VARCHAR(36) PRIMARY KEY,
    part_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    unit_price DECIMAL(10, 2) NOT NULL,
    quantity_in_stock INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 5,
    supplier_info TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_inventory_price CHECK (unit_price >= 0),
    CONSTRAINT chk_inventory_qty CHECK (quantity_in_stock >= 0)
);

-- 7. Service_Record Table
CREATE TABLE IF NOT EXISTS Service_Record (
    id VARCHAR(36) PRIMARY KEY,
    appointment_id VARCHAR(36) NOT NULL,
    service_id VARCHAR(36) NOT NULL,
    mechanic_id VARCHAR(36) NOT NULL,
    labor_hours DECIMAL(5, 2) NOT NULL,
    labor_rate DECIMAL(10, 2) NOT NULL,
    service_date DATE NOT NULL,
    status ENUM('pending', 'completed') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES Appointment(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (service_id) REFERENCES Service(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (mechanic_id) REFERENCES Mechanic(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_service_record_hours CHECK (labor_hours > 0),
    CONSTRAINT chk_service_record_rate CHECK (labor_rate >= 0)
);

-- 8. Spare_Part (Parts used in a specific Service_Record)
CREATE TABLE IF NOT EXISTS Spare_Part (
    id VARCHAR(36) PRIMARY KEY,
    service_record_id VARCHAR(36) NOT NULL,
    inventory_id VARCHAR(36) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_record_id) REFERENCES Service_Record(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (inventory_id) REFERENCES Inventory(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_spare_part_qty CHECK (quantity > 0),
    CONSTRAINT chk_spare_part_price CHECK (unit_price >= 0)
);

-- 9. Invoice Table
CREATE TABLE IF NOT EXISTS Invoice (
    id VARCHAR(36) PRIMARY KEY,
    appointment_id VARCHAR(36) UNIQUE NOT NULL,
    customer_id VARCHAR(36) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status ENUM('unpaid', 'partial', 'paid', 'cancelled') DEFAULT 'unpaid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES Appointment(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES Customer(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_invoice_total CHECK (total_amount >= 0)
);

-- 10. Payment Table
CREATE TABLE IF NOT EXISTS Payment (
    id VARCHAR(36) PRIMARY KEY,
    invoice_id VARCHAR(36) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method ENUM('cash', 'credit_card', 'debit_card', 'bank_transfer', 'digital_wallet') NOT NULL,
    transaction_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES Invoice(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_payment_amount CHECK (amount > 0)
);

-- Indexes for performance
CREATE INDEX idx_customer_email ON Customer(email);
CREATE INDEX idx_vehicle_customer ON Vehicle(customer_id);
CREATE INDEX idx_vehicle_license ON Vehicle(license_plate);
CREATE INDEX idx_appointment_customer ON Appointment(customer_id);
CREATE INDEX idx_appointment_date ON Appointment(appointment_date);
CREATE INDEX idx_service_record_appointment ON Service_Record(appointment_id);
CREATE INDEX idx_invoice_customer ON Invoice(customer_id);
CREATE INDEX idx_payment_invoice ON Payment(invoice_id);
