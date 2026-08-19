USE svsms_db;

DELIMITER //

-- Trigger 1: Inventory decreases automatically after a spare part is used in a service record
DROP TRIGGER IF EXISTS trg_after_spare_part_insert //
CREATE TRIGGER trg_after_spare_part_insert
AFTER INSERT ON Spare_Part
FOR EACH ROW
BEGIN
    UPDATE Inventory
    SET quantity_in_stock = quantity_in_stock - NEW.quantity
    WHERE id = NEW.inventory_id;
END //

-- Trigger 2: Inventory increases automatically if a spare part usage is cancelled/deleted
DROP TRIGGER IF EXISTS trg_after_spare_part_delete //
CREATE TRIGGER trg_after_spare_part_delete
AFTER DELETE ON Spare_Part
FOR EACH ROW
BEGIN
    UPDATE Inventory
    SET quantity_in_stock = quantity_in_stock + OLD.quantity
    WHERE id = OLD.inventory_id;
END //

-- Trigger 3: Automatically update Invoice status when a Payment is made
DROP TRIGGER IF EXISTS trg_after_payment_insert //
CREATE TRIGGER trg_after_payment_insert
AFTER INSERT ON Payment
FOR EACH ROW
BEGIN
    DECLARE total_paid DECIMAL(10,2);
    DECLARE invoice_total DECIMAL(10,2);
    
    -- Calculate total payments for the invoice
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM Payment
    WHERE invoice_id = NEW.invoice_id;
    
    -- Get the invoice total amount
    SELECT total_amount INTO invoice_total
    FROM Invoice
    WHERE id = NEW.invoice_id;
    
    -- Update Invoice status based on total paid
    IF total_paid >= invoice_total THEN
        UPDATE Invoice SET status = 'paid' WHERE id = NEW.invoice_id;
    ELSEIF total_paid > 0 THEN
        UPDATE Invoice SET status = 'partial' WHERE id = NEW.invoice_id;
    END IF;
END //

-- Trigger 4: Automatically mark appointment as completed when all service records are completed
DROP TRIGGER IF EXISTS trg_after_service_record_update //
CREATE TRIGGER trg_after_service_record_update
AFTER UPDATE ON Service_Record
FOR EACH ROW
BEGIN
    DECLARE pending_count INT;
    
    -- Check if there are any pending service records for this appointment
    SELECT COUNT(*) INTO pending_count
    FROM Service_Record
    WHERE appointment_id = NEW.appointment_id AND status = 'pending';
    
    -- If no pending records, update appointment status to completed
    IF pending_count = 0 THEN
        UPDATE Appointment SET status = 'completed' WHERE id = NEW.appointment_id AND status != 'completed';
    END IF;
END //

DELIMITER ;
