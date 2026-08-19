USE svsms_db;

-- =================================================================================
-- PHASE 4: BUSINESS INTELLIGENCE & REPORTING SCHEMA
-- =================================================================================

-- 1. Notification Table
CREATE TABLE IF NOT EXISTS Notification (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36), -- Can be NULL for global notifications
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'SYSTEM', 'APPOINTMENT', 'INVENTORY', 'INVOICE'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =================================================================================
-- ADVANCED ANALYTICS VIEWS
-- =================================================================================

-- View: Monthly Revenue Trend
DROP VIEW IF EXISTS View_Monthly_Revenue;
CREATE VIEW View_Monthly_Revenue AS
SELECT 
    DATE_FORMAT(payment_date, '%Y-%m') AS month,
    SUM(amount) AS total_revenue,
    COUNT(id) AS total_transactions
FROM Payment
WHERE deleted_at IS NULL
GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
ORDER BY month DESC;

-- View: Service Distribution
DROP VIEW IF EXISTS View_Service_Distribution;
CREATE VIEW View_Service_Distribution AS
SELECT 
    s.name AS service_type,
    COUNT(i.id) AS total_services,
    SUM(i.total_amount) AS total_revenue
FROM Invoice i
JOIN Appointment a ON i.appointment_id = a.id
JOIN Service_Record sr ON a.id = sr.appointment_id
JOIN Service s ON sr.service_id = s.id
WHERE i.deleted_at IS NULL
GROUP BY s.name;

-- View: Inventory Valuation
DROP VIEW IF EXISTS View_Inventory_Valuation;
CREATE VIEW View_Inventory_Valuation AS
SELECT 
    name AS part_name,
    'Auto Parts' AS category,
    quantity_in_stock,
    unit_price,
    (quantity_in_stock * unit_price) AS total_value,
    CASE 
        WHEN quantity_in_stock <= reorder_level THEN 'Low Stock'
        ELSE 'In Stock'
    END AS stock_status
FROM Inventory
WHERE deleted_at IS NULL;

-- View: Mechanic Efficiency
DROP VIEW IF EXISTS View_Mechanic_Efficiency;
CREATE VIEW View_Mechanic_Efficiency AS
SELECT 
    m.id,
    m.first_name,
    m.last_name,
    m.specialization,
    COUNT(a.id) AS total_assigned_jobs,
    SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completed_jobs,
    SUM(CASE WHEN a.status = 'scheduled' OR a.status = 'in_progress' THEN 1 ELSE 0 END) AS pending_jobs
FROM Mechanic m
LEFT JOIN Appointment a ON m.id = a.mechanic_id AND a.deleted_at IS NULL
WHERE m.deleted_at IS NULL
GROUP BY m.id;

-- View: Customer Growth
DROP VIEW IF EXISTS View_Customer_Growth;
CREATE VIEW View_Customer_Growth AS
SELECT 
    DATE_FORMAT(created_at, '%Y-%m') AS month,
    COUNT(id) AS new_customers
FROM Customer
WHERE deleted_at IS NULL
GROUP BY DATE_FORMAT(created_at, '%Y-%m')
ORDER BY month DESC;

-- View: Business Dashboard Summary (Single row aggregation for quick load)
DROP VIEW IF EXISTS View_Dashboard_Summary;
CREATE VIEW View_Dashboard_Summary AS
SELECT 
    (SELECT SUM(amount) FROM Payment WHERE DATE(payment_date) = CURDATE() AND deleted_at IS NULL) AS daily_revenue,
    (SELECT SUM(amount) FROM Payment WHERE YEARWEEK(payment_date, 1) = YEARWEEK(CURDATE(), 1) AND deleted_at IS NULL) AS weekly_revenue,
    (SELECT SUM(amount) FROM Payment WHERE MONTH(payment_date) = MONTH(CURDATE()) AND YEAR(payment_date) = YEAR(CURDATE()) AND deleted_at IS NULL) AS monthly_revenue,
    (SELECT COUNT(*) FROM Customer WHERE deleted_at IS NULL) AS total_customers,
    (SELECT COUNT(*) FROM Vehicle WHERE deleted_at IS NULL) AS active_vehicles,
    (SELECT COUNT(*) FROM Appointment WHERE (status = 'scheduled' OR status = 'in_progress') AND deleted_at IS NULL) AS pending_appointments,
    (SELECT COUNT(*) FROM Appointment WHERE status = 'completed' AND deleted_at IS NULL) AS completed_services,
    (SELECT COUNT(*) FROM Inventory WHERE quantity_in_stock <= reorder_level AND deleted_at IS NULL) AS low_stock_items;

-- =================================================================================
-- NOTIFICATION TRIGGERS
-- =================================================================================

DELIMITER //

-- Trigger: Notify on low stock
DROP TRIGGER IF EXISTS Trigger_Low_Stock_Notification//
CREATE TRIGGER Trigger_Low_Stock_Notification
AFTER UPDATE ON Inventory
FOR EACH ROW
BEGIN
    IF NEW.quantity_in_stock <= NEW.reorder_level AND OLD.quantity_in_stock > OLD.reorder_level THEN
        INSERT INTO Notification (id, title, message, type)
        VALUES (UUID(), 'Low Stock Alert', CONCAT('Part ', NEW.name, ' is low on stock (', NEW.quantity_in_stock, ').'), 'INVENTORY');
    END IF;
END //

-- Trigger: Notify on new appointment
DROP TRIGGER IF EXISTS Trigger_New_Appointment_Notification//
CREATE TRIGGER Trigger_New_Appointment_Notification
AFTER INSERT ON Appointment
FOR EACH ROW
BEGIN
    INSERT INTO Notification (id, title, message, type)
    VALUES (UUID(), 'New Appointment', CONCAT('New appointment booked for ', NEW.appointment_date), 'APPOINTMENT');
END //

DELIMITER ;
