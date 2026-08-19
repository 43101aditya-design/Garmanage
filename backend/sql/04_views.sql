USE svsms_db;

-- View 1: Pending Appointments
CREATE OR REPLACE VIEW Pending_Appointments AS
SELECT 
    a.id AS Appointment_ID,
    CONCAT(c.first_name, ' ', c.last_name) AS Customer_Name,
    c.phone AS Customer_Phone,
    v.make AS Vehicle_Make,
    v.model AS Vehicle_Model,
    v.license_plate,
    a.appointment_date,
    a.appointment_time,
    a.status
FROM Appointment a
JOIN Customer c ON a.customer_id = c.id
JOIN Vehicle v ON a.vehicle_id = v.id
WHERE a.status IN ('scheduled', 'in_progress')
ORDER BY a.appointment_date, a.appointment_time;

-- View 2: Completed Services
CREATE OR REPLACE VIEW Completed_Services AS
SELECT 
    sr.id AS Service_Record_ID,
    a.appointment_date,
    CONCAT(c.first_name, ' ', c.last_name) AS Customer_Name,
    s.name AS Service_Name,
    CONCAT(m.first_name, ' ', m.last_name) AS Mechanic_Name,
    sr.labor_hours,
    (sr.labor_hours * sr.labor_rate) AS Total_Labor_Cost
FROM Service_Record sr
JOIN Appointment a ON sr.appointment_id = a.id
JOIN Customer c ON a.customer_id = c.id
JOIN Service s ON sr.service_id = s.id
JOIN Mechanic m ON sr.mechanic_id = m.id
WHERE sr.status = 'completed'
ORDER BY sr.service_date DESC;

-- View 3: Available Mechanics
CREATE OR REPLACE VIEW Available_Mechanics AS
SELECT 
    id,
    first_name,
    last_name,
    specialization,
    phone
FROM Mechanic
WHERE status = 'active';

-- View 4: Low Inventory
CREATE OR REPLACE VIEW Low_Inventory AS
SELECT 
    id,
    part_number,
    name,
    quantity_in_stock,
    reorder_level,
    unit_price
FROM Inventory
WHERE quantity_in_stock <= reorder_level
ORDER BY quantity_in_stock ASC;

-- View 5: Monthly Revenue (Current Year)
CREATE OR REPLACE VIEW Monthly_Revenue AS
SELECT 
    MONTH(payment_date) AS Month_Number,
    MONTHNAME(payment_date) AS Month,
    COUNT(id) AS Total_Transactions,
    SUM(amount) AS Total_Revenue
FROM Payment
WHERE YEAR(payment_date) = YEAR(CURDATE())
GROUP BY MONTH(payment_date), MONTHNAME(payment_date)
ORDER BY Month_Number;
