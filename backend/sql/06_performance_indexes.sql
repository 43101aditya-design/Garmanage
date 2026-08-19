USE svsms;

-- =================================================================================
-- PHASE 4: PERFORMANCE INDEXES
-- =================================================================================

-- Index on Customer Name for faster global search
CREATE INDEX idx_customer_name ON Customer (first_name, last_name);

-- Index on Vehicle License Plate for fast lookups
CREATE INDEX idx_vehicle_license ON Vehicle (license_plate);

-- Index on Appointment Date and Status for Calendar and Dashboards
CREATE INDEX idx_appointment_date_status ON Appointment (appointment_date, status);

-- Index on Payment Date for Revenue Analytics
CREATE INDEX idx_payment_date ON Payment (payment_date);

-- Index on Invoice Status for Dashboard pending invoices
CREATE INDEX idx_invoice_status ON Invoice (status);

-- Index on Inventory stock level for filtering
CREATE INDEX idx_inventory_stock ON Inventory (quantity_in_stock);
