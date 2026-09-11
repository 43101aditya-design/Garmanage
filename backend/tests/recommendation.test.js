/**
 * ============================================================================
 * INTELLIGARAGE — COMPREHENSIVE FORENSIC RECOMMENDATION TEST SUITE (16 SCENARIOS)
 * ============================================================================
 * 
 * Validates the DBMS-driven spatial and personalized garage recommendation engine:
 * 1.  Garage with no rating (null rating & zero rating points)
 * 2.  Garage with real rating (proportional rating score)
 * 3.  Unavailable garage (unavailable service / capacity -> 0 availability points)
 * 4.  Available garage (active service & open capacity -> 15 availability points)
 * 5.  Same-area but unavailable garage vs different-area available garage
 * 6.  Radius filtering (MBRContains + ST_Distance_Sphere)
 * 7.  Spatial index candidate usage via EXPLAIN
 * 8.  Exact name search (+30 bonus)
 * 9.  Cold-start customer
 * 10. Customer saved garage (+10 boost & badge)
 * 11. Previous visit history (+10 boost & badge)
 * 12. Service mismatch exclusion (requireService = true)
 * 13. Inactive garage exclusion
 * 14. Soft-deleted garage exclusion
 * 15. Multi-garage tenant data isolation
 * 16. Coordinate bounds validation
 */

const pool = require('../config/db');
const { getRecommendedGarages, validateCoordinates, RECOMMENDATION_WEIGHTS } = require('../services/recommendationService');
const { v4: uuidv4 } = require('uuid');

async function runTests() {
  console.log('======================================================================');
  console.log('INTELLIGARAGE: RUNNING 16 FORENSIC RECOMMENDATION TEST SCENARIOS');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} — ${details}`);
      failed++;
    }
  }

  try {
    // --------------------------------------------------------------------------
    // TEST 1: Garage with NO rating (Zero default / NULL rating verification)
    // --------------------------------------------------------------------------
    const t1 = await getRecommendedGarages(pool, {
      area: 'Velachery',
      city: 'Chennai',
      latitude: 12.9815,
      longitude: 80.2184,
      radiusKm: 25
    });
    const unratedGarage = t1.find(g => g.name === 'Main Headquarters' || g.rating === null);
    assert(
      unratedGarage && unratedGarage.rating === null && unratedGarage.breakdown.rating_score === 0,
      'TEST 1: Garage with NO rating receives 0.0 rating points and null rating (no fake defaults)',
      `Rating: ${unratedGarage?.rating}, Score: ${unratedGarage?.breakdown?.rating_score}`
    );

    // --------------------------------------------------------------------------
    // TEST 2: Garage with REAL rating (proportional score calculation)
    // --------------------------------------------------------------------------
    const mainHQId = 'e110162f-c650-43e1-83cb-0c77c58d0cfa';
    // Temporarily set real rating for Main Headquarters
    await pool.query('UPDATE Garage SET rating = 4.80 WHERE id = ?', [mainHQId]);

    const t2 = await getRecommendedGarages(pool, {
      area: 'Velachery',
      city: 'Chennai',
      latitude: 12.9815,
      longitude: 80.2184,
      radiusKm: 25
    });
    const ratedGarage = t2.find(g => g.id === mainHQId);
    const expectedRatingScore = Math.round((4.80 / 5.0) * RECOMMENDATION_WEIGHTS.RATING * 100) / 100;
    assert(
      ratedGarage && ratedGarage.rating == 4.80 && Math.abs(ratedGarage.breakdown.rating_score - expectedRatingScore) < 0.1,
      `TEST 2: Garage with REAL rating (${ratedGarage?.rating}) receives accurate proportional score (${ratedGarage?.breakdown?.rating_score} pts)`,
      `Expected ~${expectedRatingScore}, got ${ratedGarage?.breakdown?.rating_score}`
    );

    // Restore rating to NULL
    await pool.query('UPDATE Garage SET rating = NULL WHERE id = ?', [mainHQId]);

    // --------------------------------------------------------------------------
    // TEST 3: Unavailable garage (service marked is_available = FALSE)
    // --------------------------------------------------------------------------
    const [services] = await pool.query('SELECT id, name FROM Service LIMIT 1');
    const testServiceId = services[0].id;

    // Temporarily mark service unavailable for Main Headquarters
    await pool.query('UPDATE Garage_Service SET is_available = FALSE WHERE garage_id = ? AND service_id = ?', [
      mainHQId, testServiceId
    ]);

    const t3 = await getRecommendedGarages(pool, {
      latitude: 12.9815,
      longitude: 80.2184,
      radiusKm: 25,
      serviceId: testServiceId
    });
    const mainHQUnavailable = t3.find(g => g.id === mainHQId);
    assert(
      mainHQUnavailable && mainHQUnavailable.breakdown.availability_score === 0,
      'TEST 3: Garage unable to provide requested service receives 0 availability points',
      `Main HQ availability score: ${mainHQUnavailable?.breakdown?.availability_score}`
    );

    // Restore service availability
    await pool.query('UPDATE Garage_Service SET is_available = TRUE WHERE garage_id = ? AND service_id = ?', [
      mainHQId, testServiceId
    ]);

    // --------------------------------------------------------------------------
    // TEST 4: Available garage (active service + available appointment capacity)
    // --------------------------------------------------------------------------
    const t4 = await getRecommendedGarages(pool, {
      latitude: 12.9815,
      longitude: 80.2184,
      radiusKm: 25,
      serviceId: testServiceId
    });
    const mainHQAvailable = t4.find(g => g.id === mainHQId);
    assert(
      mainHQAvailable && mainHQAvailable.breakdown.availability_score === 15 && mainHQAvailable.badges.some(b => b.id === 'available_today'),
      'TEST 4: Genuinely available garage receives full 15 availability points and "Available Today" badge',
      `Availability score: ${mainHQAvailable?.breakdown?.availability_score}`
    );

    // --------------------------------------------------------------------------
    // TEST 5: Same-area but unavailable garage vs different-area available garage
    // --------------------------------------------------------------------------
    // Temporarily disable service in Main Headquarters (same area as customer)
    await pool.query('UPDATE Garage_Service SET is_available = FALSE WHERE garage_id = ? AND service_id = ?', [
      mainHQId, testServiceId
    ]);

    const t5 = await getRecommendedGarages(pool, {
      serviceId: testServiceId
    });
    const mainHQUnavail = t5.find(g => g.id === mainHQId);
    const singhMotorsAvail = t5.find(g => g.name === 'Singh Motors');

    assert(
      mainHQUnavail && singhMotorsAvail && singhMotorsAvail.breakdown.availability_score > mainHQUnavail.breakdown.availability_score,
      'TEST 5: Available garage outranks unavailable garage on availability score for requested service',
      `Singh Motors avail: ${singhMotorsAvail?.breakdown?.availability_score} vs Main HQ unavail: ${mainHQUnavail?.breakdown?.availability_score}`
    );

    // Restore Main Headquarters service
    await pool.query('UPDATE Garage_Service SET is_available = TRUE WHERE garage_id = ? AND service_id = ?', [
      mainHQId, testServiceId
    ]);

    // --------------------------------------------------------------------------
    // TEST 6: Radius filtering (MBRContains bounding box + ST_Distance_Sphere)
    // --------------------------------------------------------------------------
    // Customer in Chennai center with radius 5km should include Velachery (~0km) but exclude distant Mumbai (~1000km)
    const t6 = await getRecommendedGarages(pool, {
      latitude: 12.9815,
      longitude: 80.2184,
      radiusKm: 5
    });
    const hasMumbai = t6.some(g => g.city === 'Mumbai' || g.name.includes('Singh'));
    const hasNearby = t6.some(g => g.id === mainHQId);
    assert(
      !hasMumbai && hasNearby,
      'TEST 6: Radius filtering strictly excludes candidates outside search radius',
      `Nearby count: ${t6.length}, Has distant Mumbai: ${hasMumbai}`
    );

    // --------------------------------------------------------------------------
    // TEST 7: Spatial index candidate usage via EXPLAIN
    // --------------------------------------------------------------------------
    const [explainResult] = await pool.query(`
      EXPLAIN SELECT g.id, g.name 
      FROM Garage g
      WHERE g.status = 'ACTIVE' AND g.deleted_at IS NULL
        AND MBRContains(
          ST_SRID(ST_Envelope(ST_GeomFromText('LineString(80.0 12.8, 80.4 13.1)')), 4326),
          g.location
        )
        AND ST_Distance_Sphere(g.location, ST_SRID(POINT(80.2184, 12.9815), 4326)) / 1000.0 <= 25
    `);
    const possibleKeys = explainResult[0]?.possible_keys || '';
    const hasSpatialIndex = possibleKeys.includes('idx_garage_location');
    assert(
      hasSpatialIndex,
      `TEST 7: EXPLAIN confirms SPATIAL INDEX 'idx_garage_location' is evaluated as candidate key (possible_keys: ${possibleKeys})`,
      `Possible keys: ${possibleKeys}`
    );

    // --------------------------------------------------------------------------
    // TEST 8: Exact name search (+30 bonus relevance)
    // --------------------------------------------------------------------------
    const t8 = await getRecommendedGarages(pool, {
      search: 'Singh Motors'
    });
    const topNameMatch = t8[0];
    assert(
      topNameMatch && topNameMatch.name.includes('Singh Motors') && topNameMatch.breakdown.name_bonus === 30,
      'TEST 8: Search by garage name awards separate +30 bonus and places exact match at #1',
      `Top match: ${topNameMatch?.name}, Bonus: ${topNameMatch?.breakdown?.name_bonus}`
    );

    // --------------------------------------------------------------------------
    // TEST 9: Cold-start customer (no history, no saved favorites)
    // --------------------------------------------------------------------------
    const t9 = await getRecommendedGarages(pool, {
      customerId: null,
      latitude: 19.1136,
      longitude: 72.8697,
      city: 'Mumbai',
      radiusKm: 30
    });
    assert(
      t9.length > 0 && t9[0].recommendation_score > 0 && t9[0].breakdown.history_score === 0,
      'TEST 9: Cold-start customer receives useful recommendations without prior history',
      `Count: ${t9.length}, Top score: ${t9[0]?.recommendation_score}`
    );

    // --------------------------------------------------------------------------
    // TEST 10: Customer saved garage (+10 boost & badge)
    // --------------------------------------------------------------------------
    const [sampleCust] = await pool.query("SELECT id FROM Customer LIMIT 1");
    const testCustId = sampleCust.length > 0 ? sampleCust[0].id : uuidv4();
    const testSavedGarage = t1[0];
    if (testSavedGarage) {
      const savedId = uuidv4();
      await pool.query(`INSERT INTO Saved_Garage (id, customer_id, garage_id) VALUES (?, ?, ?)`, [
        savedId, testCustId, testSavedGarage.id
      ]);

      const t10 = await getRecommendedGarages(pool, {
        customerId: testCustId,
        area: 'Velachery',
        city: 'Chennai',
        radiusKm: 25
      });
      const savedItem = t10.find(g => g.id === testSavedGarage.id);

      assert(
        savedItem && savedItem.breakdown.saved_score === 10 && savedItem.badges.some(b => b.id === 'saved_match'),
        'TEST 10: Saved garage receives 10pt boost and "Saved favorite" badge',
        `Saved score: ${savedItem?.breakdown?.saved_score}`
      );

      await pool.query('DELETE FROM Saved_Garage WHERE id = ?', [savedId]);
    }

    // --------------------------------------------------------------------------
    // TEST 11: Customer previous visit (Completed visit history boost)
    // --------------------------------------------------------------------------
    const [sampleVehicle] = await pool.query("SELECT id FROM Vehicle WHERE customer_id = ? LIMIT 1", [testCustId]);
    const vehId = sampleVehicle.length > 0 ? sampleVehicle[0].id : (await pool.query("SELECT id FROM Vehicle LIMIT 1"))[0][0]?.id;

    const apptId = uuidv4();
    await pool.query(`
      INSERT INTO Appointment (id, customer_id, vehicle_id, garage_id, appointment_date, appointment_time, status)
      VALUES (?, ?, ?, ?, '2026-08-01', '10:00:00', 'COMPLETED')
    `, [apptId, testCustId, vehId, mainHQId]);

    const t11 = await getRecommendedGarages(pool, {
      customerId: testCustId,
      area: 'Velachery',
      city: 'Chennai',
      radiusKm: 25
    });
    const gWithHist = t11.find(g => g.id === mainHQId);

    assert(
      gWithHist && gWithHist.breakdown.history_score === 10 && gWithHist.badges.some(b => b.id === 'history_match'),
      'TEST 11: Previous completed visit provides 10pt history boost and "You visited before" badge',
      `History score: ${gWithHist?.breakdown?.history_score}`
    );

    await pool.query('DELETE FROM Appointment WHERE id = ?', [apptId]);

    // --------------------------------------------------------------------------
    // TEST 12: Service mismatch (Strict service filtering)
    // --------------------------------------------------------------------------
    const fakeServiceId = uuidv4();
    const t12 = await getRecommendedGarages(pool, {
      area: 'Velachery',
      city: 'Chennai',
      serviceId: fakeServiceId,
      requireService: true
    });
    assert(
      t12.length === 0,
      'TEST 12: Garages unable to provide requested service are strictly excluded when requireService=true',
      `Returned ${t12.length} garages for non-existent service`
    );

    // --------------------------------------------------------------------------
    // TEST 13: Inactive garage exclusion
    // --------------------------------------------------------------------------
    const inactiveGId = uuidv4();
    await pool.query(`
      INSERT INTO Garage (id, name, address, area, city, phone, latitude, longitude, location, status)
      VALUES (?, 'Inactive Test Auto', 'Test St', 'Velachery', 'Chennai', '9999999999', 12.9815, 80.2184, ST_SRID(POINT(80.2184, 12.9815), 4326), 'INACTIVE')
    `, [inactiveGId]);

    const t13 = await getRecommendedGarages(pool, {
      area: 'Velachery',
      city: 'Chennai'
    });
    const foundInactive = t13.some(g => g.id === inactiveGId);
    assert(
      !foundInactive,
      'TEST 13: Inactive garage is strictly excluded from recommendations',
      'Inactive garage was returned in recommendations'
    );
    await pool.query('DELETE FROM Garage WHERE id = ?', [inactiveGId]);

    // --------------------------------------------------------------------------
    // TEST 14: Deleted garage exclusion (Soft deletes)
    // --------------------------------------------------------------------------
    const deletedGId = uuidv4();
    await pool.query(`
      INSERT INTO Garage (id, name, address, area, city, phone, latitude, longitude, location, status, deleted_at)
      VALUES (?, 'Deleted Test Auto', 'Test St', 'Velachery', 'Chennai', '9999999999', 12.9815, 80.2184, ST_SRID(POINT(80.2184, 12.9815), 4326), 'ACTIVE', NOW())
    `, [deletedGId]);

    const t14 = await getRecommendedGarages(pool, {
      area: 'Velachery',
      city: 'Chennai'
    });
    const foundDeleted = t14.some(g => g.id === deletedGId);
    assert(
      !foundDeleted,
      'TEST 14: Soft-deleted garage (deleted_at IS NOT NULL) is excluded',
      'Deleted garage was returned in recommendations'
    );
    await pool.query('DELETE FROM Garage WHERE id = ?', [deletedGId]);

    // --------------------------------------------------------------------------
    // TEST 15: Multi-garage isolation & data privacy
    // --------------------------------------------------------------------------
    const sampleGarage = t1[0];
    const hasForbiddenKeys = (
      'owner_id' in sampleGarage ||
      'join_code' in sampleGarage ||
      'password' in sampleGarage ||
      'total_revenue' in sampleGarage ||
      'internal_decision' in sampleGarage
    );
    assert(
      !hasForbiddenKeys,
      'TEST 15: Multi-tenant security verified — no private or internal fields leaked',
      'Private keys found in public recommendation response'
    );

    // --------------------------------------------------------------------------
    // TEST 16: Invalid coordinates rejection
    // --------------------------------------------------------------------------
    let rejected = false;
    try {
      await getRecommendedGarages(pool, {
        latitude: 120.0, // Invalid: > 90
        longitude: 80.0
      });
    } catch (e) {
      rejected = true;
    }
    assert(
      rejected,
      'TEST 16: Backend rejects out-of-range coordinates (lat > 90)',
      'Backend failed to reject invalid latitude'
    );

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  }

  console.log('\n======================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL 16 TESTS)`);
  console.log('======================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
