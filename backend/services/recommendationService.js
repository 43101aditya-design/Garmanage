/**
 * ============================================================================
 * INTELLIGARAGE — DBMS-DRIVEN PERSONALIZED SPATIAL RECOMMENDATION ENGINE
 * ============================================================================
 * 
 * Core Ranking Principles:
 * CUSTOMER'S AREA + DISTANCE + REQUIRED SERVICE + CUSTOMER HISTORY + SAVED GARAGES + AVAILABILITY + RATING
 * 
 * MySQL 8.0 Spatial (ST_Distance_Sphere, POINT(lon, lat), SPATIAL INDEX)
 * is the source of truth for all spatial filtering, relational joins, and ranking.
 */

// Configurable Scoring Weights (Total 100 Points)
const RECOMMENDATION_WEIGHTS = {
  AREA_MATCH: 30.0,       // Max 30 pts: Same locality/area prioritization
  SERVICE_MATCH: 25.0,    // Max 25 pts: Capabilities mapping in Garage_Service
  AVAILABILITY: 15.0,     // Max 15 pts: Operating status and service capacity
  CUSTOMER_HISTORY: 10.0, // Max 10 pts: Completed appointments / past visits
  SAVED_GARAGE: 10.0,     // Max 10 pts: Favorited in Saved_Garage table
  DISTANCE: 5.0,          // Max 5 pts:  Spatial proximity within search radius
  RATING: 5.0             // Max 5 pts:  Verified customer rating (out of 5.0)
};

/**
 * Validates geographical coordinates
 */
function validateCoordinates(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return { valid: false, error: null };
  }
  const nLat = parseFloat(lat);
  const nLng = parseFloat(lng);
  if (isNaN(nLat) || isNaN(nLng)) {
    return { valid: false, error: 'Coordinates must be valid numbers' };
  }
  if (nLat < -90 || nLat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90 degrees' };
  }
  if (nLng < -180 || nLng > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180 degrees' };
  }
  return { valid: true, lat: nLat, lng: nLng };
}

/**
 * Retrieves personalized, spatially ranked garage recommendations from MySQL.
 * 
 * @param {object} db - MySQL connection / pool
 * @param {object} params - Search & customer context parameters
 * @returns {Promise<Array>} Ranked garage objects with scores and badges
 */
async function getRecommendedGarages(db, params = {}) {
  const {
    latitude,
    longitude,
    radiusKm = 50,
    area = null,
    city = null,
    serviceId = null,
    search = null,
    customerId = null,
    limit = 20,
    offset = 0,
    requireService = false
  } = params;

  // 1. Validate coordinates if provided
  const coordCheck = validateCoordinates(latitude, longitude);
  if (coordCheck.error) {
    const err = new Error(coordCheck.error);
    err.statusCode = 400;
    throw err;
  }

  const hasCoords = coordCheck.valid;
  const custLat = hasCoords ? coordCheck.lat : null;
  const custLng = hasCoords ? coordCheck.lng : null;
  const radius = Math.min(Math.max(parseFloat(radiusKm) || 50, 0.5), 500); // 0.5km to 500km
  const cleanedSearch = search ? search.trim() : null;
  const cleanedArea = area ? area.trim() : null;
  const cleanedCity = city ? city.trim() : null;

  // 2. Build eligibility WHERE constraints
  // Strictly filter for genuine registered IntelliGarage workshops: active, not soft-deleted, and with verified owner membership
  const whereClauses = [
    "g.status = 'ACTIVE'",
    "g.deleted_at IS NULL",
    `EXISTS (
      SELECT 1 FROM Garage_Membership gm_reg 
      JOIN Role r_reg ON gm_reg.role_id = r_reg.id 
      WHERE gm_reg.garage_id = g.id AND r_reg.name = 'owner' AND gm_reg.status = 'ACTIVE'
    )`
  ];
  const queryParams = [];

  // Spatial Radius eligibility filter (when coordinates provided and no specific text search keyword)
  // When a text search is provided, we search across all registered garages in IntelliGarage and use distance for ranking
  if (hasCoords && !cleanedSearch) {
    const deltaLat = radius / 111.0;
    const deltaLng = radius / (111.0 * Math.cos(custLat * Math.PI / 180.0));
    const minLng = custLng - deltaLng;
    const maxLng = custLng + deltaLng;
    const minLat = Math.max(-90, custLat - deltaLat);
    const maxLat = Math.min(90, custLat + deltaLat);

    whereClauses.push(`
      MBRContains(
        ST_SRID(
          ST_Envelope(
            ST_GeomFromText(
              CONCAT('LineString(', ?, ' ', ?, ', ', ?, ' ', ?, ')')
            )
          ),
          4326
        ),
        g.location
      )
      AND (ST_Distance_Sphere(g.location, ST_SRID(POINT(?, ?), 4326)) / 1000.0) <= ?
    `);
    queryParams.push(minLng, minLat, maxLng, maxLat, custLng, custLat, radius);
  }

  // Strict Service eligibility filter (if requireService is requested)
  if (serviceId && requireService) {
    whereClauses.push(`
      EXISTS (
        SELECT 1 FROM Garage_Service gs 
        WHERE gs.garage_id = g.id AND gs.service_id = ? AND gs.is_available = TRUE
      )
    `);
    queryParams.push(serviceId);
  }

  // Search keyword filter (garage name, area, city, pincode, or offered service capability)
  if (cleanedSearch) {
    whereClauses.push(`
      (
        LOWER(g.name) LIKE ? OR 
        LOWER(COALESCE(g.area, '')) LIKE ? OR 
        LOWER(COALESCE(g.city, '')) LIKE ? OR 
        LOWER(COALESCE(g.pincode, '')) LIKE ? OR
        LOWER(COALESCE(g.postal_code, '')) LIKE ? OR
        EXISTS (
          SELECT 1 FROM Garage_Service gs_search
          JOIN Service s_search ON gs_search.service_id = s_search.id
          WHERE gs_search.garage_id = g.id 
            AND gs_search.is_available = TRUE 
            AND s_search.deleted_at IS NULL
            AND LOWER(s_search.name) LIKE ?
        )
      )
    `);
    const sTerm = `%${cleanedSearch.toLowerCase()}%`;
    queryParams.push(sTerm, sTerm, sTerm, sTerm, sTerm, sTerm);
  }

  // 3. Construct the DBMS Scoring Query
  // All feature calculations and weights are evaluated directly in MySQL
  const sql = `
    SELECT 
      g.id,
      g.name,
      g.description,
      g.address,
      g.area,
      g.city,
      g.state,
      g.postal_code,
      g.pincode,
      g.phone,
      g.email,
      g.garage_type,
      g.rating,
      g.logo_url,
      g.status,
      g.latitude,
      g.longitude,
      
      -- Distance calculation in Kilometers (Sphere Haversine via MySQL)
      ${hasCoords ? `
        ROUND(ST_Distance_Sphere(g.location, ST_SRID(POINT(${custLng}, ${custLat}), 4326)) / 1000.0, 2)
      ` : `NULL`} AS distance_km,

      -- 1. Area Match Score (Max 30 pts)
      ${cleanedArea ? `
        CASE 
          WHEN LOWER(TRIM(COALESCE(g.area, ''))) = LOWER(TRIM('${cleanedArea.replace(/'/g, "''")}')) THEN ${RECOMMENDATION_WEIGHTS.AREA_MATCH}
          WHEN LOWER(TRIM(COALESCE(g.city, ''))) = LOWER(TRIM('${(cleanedCity || cleanedArea).replace(/'/g, "''")}')) THEN ${RECOMMENDATION_WEIGHTS.AREA_MATCH * 0.5}
          ELSE 0.0 
        END
      ` : (cleanedCity ? `
        CASE 
          WHEN LOWER(TRIM(COALESCE(g.city, ''))) = LOWER(TRIM('${cleanedCity.replace(/'/g, "''")}')) THEN ${RECOMMENDATION_WEIGHTS.AREA_MATCH * 0.75}
          ELSE 0.0 
        END
      ` : `10.0`)} AS area_score,

      -- 2. Service Match Score (Max 25 pts)
      ${serviceId ? `
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM Garage_Service gs 
            WHERE gs.garage_id = g.id AND gs.service_id = '${serviceId.replace(/'/g, "''")}' AND gs.is_available = TRUE
          ) THEN ${RECOMMENDATION_WEIGHTS.SERVICE_MATCH}
          ELSE 0.0 
        END
      ` : `
        -- Baseline service variety ratio (up to 20 pts)
        LEAST(20.0, (
          SELECT COUNT(gs2.service_id) * 2.0 
          FROM Garage_Service gs2 
          WHERE gs2.garage_id = g.id AND gs2.is_available = TRUE
        ))
      `} AS service_score,

      -- 3. Customer History Score (Max 10 pts)
      ${customerId ? `
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM Appointment a 
            WHERE a.customer_id = '${customerId.replace(/'/g, "''")}' AND a.garage_id = g.id AND a.status = 'COMPLETED'
          ) THEN ${RECOMMENDATION_WEIGHTS.CUSTOMER_HISTORY}
          WHEN EXISTS (
            SELECT 1 FROM Appointment a2 
            WHERE a2.customer_id = '${customerId.replace(/'/g, "''")}' AND a2.garage_id = g.id
          ) THEN ${RECOMMENDATION_WEIGHTS.CUSTOMER_HISTORY * 0.5}
          ELSE 0.0 
        END
      ` : `0.0`} AS history_score,

      -- 4. Saved Garage Score (Max 10 pts)
      ${customerId ? `
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM Saved_Garage sg 
            WHERE sg.customer_id = '${customerId.replace(/'/g, "''")}' AND sg.garage_id = g.id
          ) THEN ${RECOMMENDATION_WEIGHTS.SAVED_GARAGE}
          ELSE 0.0 
        END
      ` : `0.0`} AS saved_score,

      -- 5. Distance Proximity Score (Max 5 pts)
      ${hasCoords ? `
        GREATEST(0.0, ROUND(
          (1.0 - LEAST(1.0, (ST_Distance_Sphere(g.location, ST_SRID(POINT(${custLng}, ${custLat}), 4326)) / 1000.0) / ${radius})) * ${RECOMMENDATION_WEIGHTS.DISTANCE}
        , 2))
      ` : `2.5`} AS distance_score,

      -- 6. Availability Score (Max 15 pts)
      -- Genuine availability derived from active services and scheduled appointment load
      ${serviceId ? `
        CASE 
          WHEN NOT EXISTS (
            SELECT 1 FROM Garage_Service gs_avail 
            WHERE gs_avail.garage_id = g.id AND gs_avail.service_id = '${serviceId.replace(/'/g, "''")}' AND gs_avail.is_available = TRUE
          ) THEN 0.0
          WHEN (
            SELECT COUNT(*) FROM Appointment a_today 
            WHERE a_today.garage_id = g.id AND a_today.appointment_date = CURRENT_DATE() AND a_today.status IN ('SCHEDULED', 'in_progress')
          ) >= 8 THEN 5.0
          ELSE ${RECOMMENDATION_WEIGHTS.AVAILABILITY}
        END
      ` : `
        CASE 
          WHEN (
            SELECT COUNT(*) FROM Garage_Service gs_avail 
            WHERE gs_avail.garage_id = g.id AND gs_avail.is_available = TRUE
          ) = 0 THEN 0.0
          WHEN (
            SELECT COUNT(*) FROM Appointment a_today 
            WHERE a_today.garage_id = g.id AND a_today.appointment_date = CURRENT_DATE() AND a_today.status IN ('SCHEDULED', 'in_progress')
          ) >= 8 THEN 5.0
          ELSE ${RECOMMENDATION_WEIGHTS.AVAILABILITY}
        END
      `} AS availability_score,

      -- 7. Verified Customer Rating Score (Max 5 pts)
      -- Unrated garages strictly receive 0.0 rating points. No fake defaults or artificial scores.
      CASE 
        WHEN g.rating IS NOT NULL THEN ROUND((g.rating / 5.0) * ${RECOMMENDATION_WEIGHTS.RATING}, 2)
        ELSE 0.0 
      END AS rating_score,

      -- Name Search Exact Match Priority Boost (Separate +30 max bonus when search query provided)
      ${cleanedSearch ? `
        CASE 
          WHEN LOWER(TRIM(g.name)) = LOWER(TRIM('${cleanedSearch.replace(/'/g, "''")}')) THEN 30.0
          WHEN LOWER(g.name) LIKE '${cleanedSearch.replace(/'/g, "''")}%' THEN 20.0
          WHEN LOWER(g.name) LIKE '%${cleanedSearch.replace(/'/g, "''")}%' THEN 10.0
          ELSE 0.0 
        END
      ` : `0.0`} AS name_match_bonus

    FROM Garage g
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY 
      name_match_bonus DESC,
      (area_score + service_score + history_score + saved_score + distance_score + availability_score + rating_score + name_match_bonus) DESC,
      ${hasCoords ? 'distance_km ASC,' : ''}
      g.rating DESC
    LIMIT ? OFFSET ?
  `;

  queryParams.push(parseInt(limit, 10) || 20);
  queryParams.push(parseInt(offset, 10) || 0);

  const [rawRows] = await db.query(sql, queryParams);

  // 4. Transform raw database rows into auditable result objects with explainability badges
  const results = rawRows.map(row => {
    const areaScore = parseFloat(row.area_score) || 0;
    const serviceScore = parseFloat(row.service_score) || 0;
    const historyScore = parseFloat(row.history_score) || 0;
    const savedScore = parseFloat(row.saved_score) || 0;
    const distanceScore = parseFloat(row.distance_score) || 0;
    const availabilityScore = parseFloat(row.availability_score) || 0;
    const ratingScore = parseFloat(row.rating_score) || 0;
    const nameBonus = parseFloat(row.name_match_bonus) || 0;

    // Base recommendation score (strictly 100 points maximum)
    const baseScore = Math.min(100, Math.round(
      areaScore + serviceScore + historyScore + savedScore + distanceScore + availabilityScore + ratingScore
    ));

    // Total score includes explicit search bonus if query was supplied (up to 130 max)
    const totalScore = Math.min(130, Math.round(baseScore + nameBonus));

    const distanceKm = row.distance_km !== null ? parseFloat(row.distance_km) : null;

    // Generate explainability badges based purely on real database signals
    const badges = [];
    const matchReasons = [];

    if (cleanedArea && areaScore >= RECOMMENDATION_WEIGHTS.AREA_MATCH * 0.9) {
      badges.push({ id: 'area_match', label: `In ${row.area || 'your area'}`, variant: 'purple' });
      matchReasons.push(`Located directly in your target locality (${row.area})`);
    } else if (cleanedCity && areaScore > 0) {
      badges.push({ id: 'city_match', label: `In ${row.city}`, variant: 'purple' });
      matchReasons.push(`Located within ${row.city}`);
    }

    if (distanceKm !== null && distanceKm <= 5.0) {
      badges.push({ id: 'near_you', label: `${distanceKm} km away`, variant: 'blue' });
      matchReasons.push(`Within 5 km radius (${distanceKm} km)`);
    } else if (distanceKm !== null) {
      matchReasons.push(`${distanceKm} km away`);
    }

    if (serviceId && serviceScore >= RECOMMENDATION_WEIGHTS.SERVICE_MATCH) {
      badges.push({ id: 'service_match', label: 'Matches service', variant: 'emerald' });
      matchReasons.push('Offers the service you selected');
    }

    if (historyScore > 0) {
      badges.push({ id: 'history_match', label: 'You visited before', variant: 'amber' });
      matchReasons.push('You have a confirmed service record at this garage');
    }

    if (savedScore > 0) {
      badges.push({ id: 'saved_match', label: 'Saved favorite', variant: 'red' });
      matchReasons.push('Added to your personal saved favorites');
    }

    if (availabilityScore >= RECOMMENDATION_WEIGHTS.AVAILABILITY) {
      badges.push({ id: 'available_today', label: 'Available Today', variant: 'emerald' });
    }

    if (nameBonus >= 20.0) {
      badges.push({ id: 'name_match', label: 'Exact Name Match', variant: 'purple' });
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      address: row.address,
      area: row.area,
      city: row.city,
      state: row.state,
      postal_code: row.postal_code,
      pincode: row.pincode,
      phone: row.phone,
      email: row.email,
      garage_type: row.garage_type,
      rating: row.rating ? parseFloat(row.rating) : null,
      logo_url: row.logo_url,
      status: row.status,
      latitude: row.latitude ? parseFloat(row.latitude) : null,
      longitude: row.longitude ? parseFloat(row.longitude) : null,
      distance_km: distanceKm,
      recommendation_score: totalScore,
      base_score: baseScore,
      badges,
      match_reasons: matchReasons,
      breakdown: {
        area_score: areaScore,
        service_score: serviceScore,
        history_score: historyScore,
        saved_score: savedScore,
        distance_score: distanceScore,
        availability_score: availabilityScore,
        rating_score: ratingScore,
        name_bonus: nameBonus,
        base_score: baseScore,
        total_score: totalScore
      }
    };
  });

  return results;
}

module.exports = {
  RECOMMENDATION_WEIGHTS,
  validateCoordinates,
  getRecommendedGarages
};
