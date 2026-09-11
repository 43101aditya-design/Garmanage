-- ============================================================
-- PHASE 18: SPATIAL GARAGE LOCATION & PERSONALIZED RECOMMENDATIONS
-- ============================================================

-- 1. Extend Garage table with Area, Location POINT (SRID 4326), and Rating
ALTER TABLE Garage 
  ADD COLUMN IF NOT EXISTS area VARCHAR(100) NULL AFTER address,
  ADD COLUMN IF NOT EXISTS pincode VARCHAR(20) NULL AFTER city,
  ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) NULL DEFAULT NULL AFTER garage_type,
  ADD COLUMN IF NOT EXISTS location POINT /*!80003 SRID 4326 */ NULL AFTER longitude;

-- Ensure postal_code and pincode are in sync if needed
UPDATE Garage SET pincode = postal_code WHERE pincode IS NULL AND postal_code IS NOT NULL;
UPDATE Garage SET postal_code = pincode WHERE postal_code IS NULL AND pincode IS NOT NULL;

-- 2. Extend Customer table with Address and Location fields
ALTER TABLE Customer 
  ADD COLUMN IF NOT EXISTS area VARCHAR(100) NULL AFTER address,
  ADD COLUMN IF NOT EXISTS city VARCHAR(100) NULL AFTER area,
  ADD COLUMN IF NOT EXISTS state VARCHAR(100) NULL AFTER city,
  ADD COLUMN IF NOT EXISTS pincode VARCHAR(20) NULL AFTER state,
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8) NULL AFTER pincode,
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8) NULL AFTER latitude,
  ADD COLUMN IF NOT EXISTS location POINT /*!80003 SRID 4326 */ NULL AFTER longitude;

-- 3. Create Garage_Service mapping table for real service capabilities
CREATE TABLE IF NOT EXISTS Garage_Service (
  id VARCHAR(36) PRIMARY KEY,
  garage_id VARCHAR(36) NOT NULL,
  service_id VARCHAR(36) NOT NULL,
  price DECIMAL(10,2) NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (garage_id) REFERENCES Garage(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES Service(id) ON DELETE CASCADE,
  
  UNIQUE KEY uk_garage_service (garage_id, service_id),
  INDEX idx_gs_garage (garage_id),
  INDEX idx_gs_service (service_id),
  INDEX idx_gs_available (is_available)
);

-- 4. Seed initial realistic locations for existing garages
-- Singh Motors: Andheri East, Mumbai (lon: 72.8697, lat: 19.1136)
UPDATE Garage 
SET 
  area = 'Andheri East', 
  city = 'Mumbai', 
  state = 'Maharashtra', 
  pincode = '400069',
  latitude = 19.1136, 
  longitude = 72.8697,
  location = ST_SRID(POINT(72.8697, 19.1136), 4326)
WHERE name LIKE '%Singh%' AND (location IS NULL OR latitude IS NULL);

-- Main Headquarters: Velachery, Chennai (lon: 80.2184, lat: 12.9815)
UPDATE Garage 
SET 
  area = 'Velachery', 
  city = 'Chennai', 
  state = 'Tamil Nadu', 
  pincode = '600042',
  latitude = 12.9815, 
  longitude = 80.2184,
  location = ST_SRID(POINT(80.2184, 12.9815), 4326)
WHERE name LIKE '%Headquarters%' AND (location IS NULL OR latitude IS NULL);

-- Populate location for any other garages having lat/long
UPDATE Garage 
SET location = ST_SRID(POINT(longitude, latitude), 4326)
WHERE location IS NULL AND longitude IS NOT NULL AND latitude IS NOT NULL;

-- 5. Add Spatial Index & Performance Indexes on Garage table
-- Note: Check and create indexes safely
DROP PROCEDURE IF EXISTS _add_spatial_indexes;
DELIMITER //
CREATE PROCEDURE _add_spatial_indexes()
BEGIN
  -- Check if idx_garage_location exists
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Garage' AND INDEX_NAME = 'idx_garage_location'
  ) THEN
    ALTER TABLE Garage ADD SPATIAL INDEX idx_garage_location (location);
  END IF;

  -- Area index
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Garage' AND INDEX_NAME = 'idx_garage_area'
  ) THEN
    ALTER TABLE Garage ADD INDEX idx_garage_area (area);
  END IF;

  -- City index
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Garage' AND INDEX_NAME = 'idx_garage_city'
  ) THEN
    ALTER TABLE Garage ADD INDEX idx_garage_city (city);
  END IF;

  -- Status index
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Garage' AND INDEX_NAME = 'idx_garage_status'
  ) THEN
    ALTER TABLE Garage ADD INDEX idx_garage_status (status);
  END IF;
END //
DELIMITER ;

CALL _add_spatial_indexes();
DROP PROCEDURE IF EXISTS _add_spatial_indexes;

-- 6. Populate Garage_Service for existing garages so they offer standard services
INSERT IGNORE INTO Garage_Service (id, garage_id, service_id, price, is_available)
SELECT 
  UUID(), 
  g.id, 
  s.id, 
  s.base_price, 
  TRUE
FROM Garage g
CROSS JOIN Service s
WHERE g.status = 'ACTIVE';
