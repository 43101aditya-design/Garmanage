USE svsms_db;

DELIMITER //

-- Procedure 1: Book Appointment with Transaction
DROP PROCEDURE IF EXISTS BookAppointment //
CREATE PROCEDURE BookAppointment(
    IN p_id VARCHAR(36),
    IN p_customer_id VARCHAR(36),
    IN p_vehicle_id VARCHAR(36),
    IN p_appointment_date DATE,
    IN p_appointment_time TIME,
    IN p_notes TEXT
)
BEGIN
    DECLARE exit handler for sqlexception
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    
    -- Insert the appointment
    INSERT INTO Appointment (id, customer_id, vehicle_id, appointment_date, appointment_time, status, notes)
    VALUES (p_id, p_customer_id, p_vehicle_id, p_appointment_date, p_appointment_time, 'scheduled', p_notes);
    
    COMMIT;
END //

-- Procedure 2: Assign Mechanic
DROP PROCEDURE IF EXISTS AssignMechanic //
CREATE PROCEDURE AssignMechanic(
    IN p_appointment_id VARCHAR(36),
    IN p_mechanic_id VARCHAR(36)
)
BEGIN
    DECLARE exit handler for sqlexception
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    
    UPDATE Appointment 
    SET mechanic_id = p_mechanic_id, status = 'in_progress'
    WHERE id = p_appointment_id;
    
    COMMIT;
END //

-- Procedure 3: Generate Invoice
DROP PROCEDURE IF EXISTS GenerateInvoice //
CREATE PROCEDURE GenerateInvoice(
    IN p_invoice_id VARCHAR(36),
    IN p_appointment_id VARCHAR(36)
)
BEGIN
    DECLARE v_customer_id VARCHAR(36);
    DECLARE v_subtotal DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_labor_cost DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_parts_cost DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_tax_amount DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_total_amount DECIMAL(10,2) DEFAULT 0.00;
    
    DECLARE exit handler for sqlexception
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    
    -- Get customer_id from appointment
    SELECT customer_id INTO v_customer_id
    FROM Appointment
    WHERE id = p_appointment_id;
    
    -- Calculate total labor cost
    SELECT COALESCE(SUM(labor_hours * labor_rate), 0) INTO v_labor_cost
    FROM Service_Record
    WHERE appointment_id = p_appointment_id;
    
    -- Calculate total parts cost
    SELECT COALESCE(SUM(sp.quantity * sp.unit_price), 0) INTO v_parts_cost
    FROM Spare_Part sp
    JOIN Service_Record sr ON sp.service_record_id = sr.id
    WHERE sr.appointment_id = p_appointment_id;
    
    SET v_subtotal = v_labor_cost + v_parts_cost;
    SET v_tax_amount = v_subtotal * 0.10; -- 10% tax rate
    SET v_total_amount = v_subtotal + v_tax_amount;
    
    -- Insert Invoice
    INSERT INTO Invoice (id, appointment_id, customer_id, issue_date, due_date, subtotal, tax_amount, total_amount, status)
    VALUES (
        p_invoice_id, 
        p_appointment_id, 
        v_customer_id, 
        CURDATE(), 
        DATE_ADD(CURDATE(), INTERVAL 14 DAY), -- Due in 14 days
        v_subtotal, 
        v_tax_amount, 
        v_total_amount, 
        'unpaid'
    );
    
    COMMIT;
END //

-- Procedure 4: Generate Monthly Revenue
DROP PROCEDURE IF EXISTS GenerateMonthlyRevenue //
CREATE PROCEDURE GenerateMonthlyRevenue(
    IN p_year INT
)
BEGIN
    SELECT 
        MONTHNAME(payment_date) AS Month,
        COUNT(id) AS Total_Transactions,
        SUM(amount) AS Total_Revenue
    FROM Payment
    WHERE YEAR(payment_date) = p_year
    GROUP BY MONTH(payment_date), MONTHNAME(payment_date)
    ORDER BY MONTH(payment_date);
END //

-- Procedure 5: Generate Mechanic Performance
DROP PROCEDURE IF EXISTS GenerateMechanicPerformance //
CREATE PROCEDURE GenerateMechanicPerformance(
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    SELECT 
        m.id,
        CONCAT(m.first_name, ' ', m.last_name) AS Mechanic_Name,
        COUNT(sr.id) AS Jobs_Completed,
        SUM(sr.labor_hours) AS Total_Hours_Logged,
        SUM(sr.labor_hours * sr.labor_rate) AS Revenue_Generated
    FROM Mechanic m
    LEFT JOIN Service_Record sr ON m.id = sr.mechanic_id
    WHERE sr.service_date BETWEEN p_start_date AND p_end_date
    GROUP BY m.id
    ORDER BY Revenue_Generated DESC;
END //

DELIMITER ;
