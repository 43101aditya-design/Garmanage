const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Seeded PRNG (Mulberry32) for reproducible synthetic dataset generation.
 */
function createPrng(seed) {
    let s = typeof seed === 'number' ? seed : 123456789;
    return function() {
        let t = s += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Predefined realistic domain catalogs
const SERVICE_CATALOG = [
    { type: 'Oil Change', baseDuration: 35, skill: 'General Maintenance', baseCost: 45, partsCount: 2, complexity: 1.0 },
    { type: 'Brake Service', baseDuration: 75, skill: 'Brakes & Suspension', baseCost: 180, partsCount: 4, complexity: 1.6 },
    { type: 'Engine Diagnostics', baseDuration: 90, skill: 'Engine & Diagnostics', baseCost: 150, partsCount: 1, complexity: 2.0 },
    { type: 'Battery Replacement', baseDuration: 25, skill: 'Electrical & AC', baseCost: 120, partsCount: 1, complexity: 0.8 },
    { type: 'AC Service', baseDuration: 60, skill: 'Electrical & AC', baseCost: 110, partsCount: 3, complexity: 1.3 },
    { type: 'Wheel Alignment', baseDuration: 45, skill: 'Brakes & Suspension', baseCost: 65, partsCount: 0, complexity: 1.1 },
    { type: 'Suspension Repair', baseDuration: 130, skill: 'Brakes & Suspension', baseCost: 320, partsCount: 6, complexity: 2.2 },
    { type: 'Clutch Service', baseDuration: 150, skill: 'Transmission & Drivetrain', baseCost: 400, partsCount: 5, complexity: 2.5 },
    { type: 'General Inspection', baseDuration: 40, skill: 'General Maintenance', baseCost: 50, partsCount: 0, complexity: 0.9 },
    { type: 'Tyre Replacement', baseDuration: 50, skill: 'General Maintenance', baseCost: 200, partsCount: 4, complexity: 1.2 }
];

const VEHICLE_TYPES = [
    { category: 'Hatchback', durationMultiplier: 0.9, avgMileage: 45000, ageFactor: 1.0 },
    { category: 'Sedan', durationMultiplier: 1.0, avgMileage: 60000, ageFactor: 1.05 },
    { category: 'SUV', durationMultiplier: 1.2, avgMileage: 75000, ageFactor: 1.15 },
    { category: 'Luxury Sedan', durationMultiplier: 1.35, avgMileage: 40000, ageFactor: 1.25 },
    { category: 'Commercial Van', durationMultiplier: 1.4, avgMileage: 120000, ageFactor: 1.3 }
];

const MECHANIC_ARCHETYPES = [
    { id: 'SYNTH_MECH_01', name: 'Dev-Synthetic Alex Turner', specialization: 'Engine & Diagnostics', experienceYears: 8, efficiency: 1.25, baseSpeed: 0.85 },
    { id: 'SYNTH_MECH_02', name: 'Dev-Synthetic Maria Santos', specialization: 'Brakes & Suspension', experienceYears: 6, efficiency: 1.15, baseSpeed: 0.90 },
    { id: 'SYNTH_MECH_03', name: 'Dev-Synthetic Raj Patel', specialization: 'Electrical & AC', experienceYears: 5, efficiency: 1.10, baseSpeed: 0.92 },
    { id: 'SYNTH_MECH_04', name: 'Dev-Synthetic Jordan Lee', specialization: 'Transmission & Drivetrain', experienceYears: 10, efficiency: 1.30, baseSpeed: 0.80 },
    { id: 'SYNTH_MECH_05', name: 'Dev-Synthetic Sam Taylor', specialization: 'General Maintenance', experienceYears: 3, efficiency: 0.95, baseSpeed: 1.05 },
    { id: 'SYNTH_MECH_06', name: 'Dev-Synthetic Chris Morgan', specialization: 'General Maintenance', experienceYears: 2, efficiency: 0.90, baseSpeed: 1.12 }
];

const STORAGE_DIR = path.join(__dirname, '..', 'data', 'synthetic');

function ensureStorageDir() {
    if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
}

/**
 * Validates synthetic record quality prior to storage.
 */
function validateSyntheticDataset(dataset) {
    const errors = [];
    if (!dataset || !Array.isArray(dataset.records) || dataset.records.length === 0) {
        return { isValid: false, errors: ['Dataset contains no records.'] };
    }

    dataset.records.forEach((rec, idx) => {
        if (rec.actual_duration <= 0 || isNaN(rec.actual_duration)) {
            errors.push(`Record ${idx}: Invalid actual_duration (${rec.actual_duration})`);
        }
        if (rec.vehicle_age < 0 || rec.vehicle_age > 30) {
            errors.push(`Record ${idx}: Impossible vehicle_age (${rec.vehicle_age})`);
        }
        if (rec.mileage < 0 || rec.mileage > 500000) {
            errors.push(`Record ${idx}: Invalid mileage (${rec.mileage})`);
        }
        if (!rec.service_type || !rec.vehicle_type) {
            errors.push(`Record ${idx}: Missing required feature fields`);
        }
        // Check for target leakage in features
        if (rec.prediction_features.actual_duration !== undefined || rec.prediction_features.actual_completion_time !== undefined) {
            errors.push(`Record ${idx}: TARGET LEAKAGE DETECTED in prediction_features`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors: errors.slice(0, 10), // Limit return errors to top 10
        totalErrors: errors.length
    };
}

/**
 * Generates a realistic, correlated synthetic workshop dataset.
 */
function generateSyntheticDataset(options = {}) {
    const recordCount = Math.min(Math.max(parseInt(options.count, 10) || 500, 10), 50000);
    const randomSeed = typeof options.seed === 'number' ? options.seed : 42;
    const environment = process.env.NODE_ENV || 'development';
    const generatorVersion = 'v1.4.0';
    const schemaVersion = 'v1.2.0';

    const prng = createPrng(randomSeed);
    const records = [];

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    for (let i = 0; i < recordCount; i++) {
        // Pick Service
        const serviceIdx = Math.floor(prng() * SERVICE_CATALOG.length);
        const service = SERVICE_CATALOG[serviceIdx];

        // Pick Vehicle Type
        const vehicleIdx = Math.floor(prng() * VEHICLE_TYPES.length);
        const vehicle = VEHICLE_TYPES[vehicleIdx];

        // Realistic Vehicle Age (0 to 15 years) & Mileage (5,000 to 220,000 km)
        const vehicleAge = Math.floor(prng() * 14) + 1;
        const mileage = Math.floor(prng() * 15000 * vehicleAge) + 8000;

        // Day of week & Time of day
        const dayOfWeek = Math.floor(prng() * 6) + 1; // 1 (Mon) to 6 (Sat)
        const hourOfDay = Math.floor(prng() * 10) + 8; // 8 AM to 6 PM
        const queueDepth = Math.floor(prng() * 8); // 0 to 7 jobs in queue

        // Priority
        const priorityRand = prng();
        const priority = priorityRand > 0.85 ? 'URGENT' : priorityRand > 0.5 ? 'HIGH' : 'NORMAL';
        const priorityFactor = priority === 'URGENT' ? 0.92 : priority === 'HIGH' ? 0.98 : 1.0;

        // Candidate Mechanic Assignment simulation
        // Find mechanics with matching skill
        const matchingMechs = MECHANIC_ARCHETYPES.filter(m => m.specialization === service.skill);
        const candidateMech = matchingMechs.length > 0
            ? matchingMechs[Math.floor(prng() * matchingMechs.length)]
            : MECHANIC_ARCHETYPES[Math.floor(prng() * MECHANIC_ARCHETYPES.length)];

        const isSkillMatch = candidateMech.specialization === service.skill;
        const skillMultiplier = isSkillMatch ? candidateMech.baseSpeed : (candidateMech.baseSpeed * 1.35);

        // Realistic Age and Mileage wear multiplier
        const wearMultiplier = 1.0 + (vehicleAge * 0.02) + (mileage > 100000 ? 0.08 : 0.0);

        // Noise term (-10% to +15%)
        const noise = 0.9 + (prng() * 0.25);

        // Calculate realistic Target: actual_duration in minutes
        const calculatedDuration = Math.round(
            service.baseDuration *
            vehicle.durationMultiplier *
            skillMultiplier *
            wearMultiplier *
            priorityFactor *
            noise
        );
        const actualDuration = Math.max(15, calculatedDuration);

        // Anomaly injection (approx 4% of records)
        const isAnomaly = prng() < 0.04;
        const finalDuration = isAnomaly ? Math.round(actualDuration * (1.8 + prng())) : actualDuration;
        const anomalyReason = isAnomaly ? 'Severe rust and stripped fastener bolt delay' : null;

        // Strict Separation: Features available at prediction time vs Post-execution targets
        const predictionFeatures = {
            service_type: service.type,
            skill_required: service.skill,
            vehicle_type: vehicle.category,
            vehicle_age: vehicleAge,
            mileage: mileage,
            day_of_week: dayOfWeek,
            hour_of_day: hourOfDay,
            queue_depth: queueDepth,
            priority: priority,
            assigned_mechanic_id: candidateMech.id,
            mechanic_experience_years: candidateMech.experienceYears,
            is_mechanic_skill_match: isSkillMatch ? 1 : 0,
            parts_required_count: service.partsCount
        };

        const targetVariables = {
            actual_duration: finalDuration,
            is_anomaly: isAnomaly ? 1 : 0,
            anomaly_reason: anomalyReason,
            mechanic_efficiency_score: parseFloat((service.baseDuration / finalDuration).toFixed(2)),
            optimal_mechanic_id: candidateMech.id
        };

        const recordTimestamp = new Date(now - Math.floor(prng() * 90 * oneDay)).toISOString();

        records.push({
            record_id: `SYNTH_REC_${String(i + 1).padStart(6, '0')}`,
            timestamp: recordTimestamp,
            service_type: service.type,
            vehicle_type: vehicle.category,
            vehicle_age: vehicleAge,
            mileage: mileage,
            actual_duration: finalDuration,
            is_anomaly: isAnomaly ? 1 : 0,
            prediction_features: predictionFeatures,
            targets: targetVariables
        });
    }

    // Split records reproducibly into Train (70%), Val (15%), Test (15%)
    const trainCount = Math.floor(recordCount * 0.70);
    const valCount = Math.floor(recordCount * 0.15);

    const trainSet = records.slice(0, trainCount);
    const valSet = records.slice(trainCount, trainCount + valCount);
    const testSet = records.slice(trainCount + valCount);

    const datasetId = `synth_ds_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const datasetVersion = `synthetic_v${Math.floor(Date.now() / 1000)}`;

    const dataset = {
        metadata: {
            dataset_id: datasetId,
            dataset_version: datasetVersion,
            data_source: 'SYNTHETIC_DEV',
            synthetic: true,
            environment: environment,
            generator_version: generatorVersion,
            feature_schema_version: schemaVersion,
            random_seed: randomSeed,
            total_records: recordCount,
            generated_at: new Date().toISOString(),
            splits: {
                train_records: trainSet.length,
                val_records: valSet.length,
                test_records: testSet.length
            }
        },
        splits: {
            train: trainSet,
            validation: valSet,
            test: testSet
        },
        records: records
    };

    // Quality check
    const validationResult = validateSyntheticDataset(dataset);
    if (!validationResult.isValid) {
        throw new Error(`Synthetic data validation failed: ${validationResult.errors.join('; ')}`);
    }

    // Persist to isolated file storage
    ensureStorageDir();
    const filePath = path.join(STORAGE_DIR, `${datasetId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(dataset, null, 2), 'utf8');

    // Also update catalog index
    updateDatasetIndex({
        dataset_id: dataset.metadata.dataset_id,
        dataset_version: dataset.metadata.dataset_version,
        data_source: dataset.metadata.data_source,
        synthetic: true,
        environment: dataset.metadata.environment,
        total_records: dataset.metadata.total_records,
        random_seed: dataset.metadata.random_seed,
        generated_at: dataset.metadata.generated_at,
        file_path: filePath
    });

    return dataset;
}

function updateDatasetIndex(manifestEntry) {
    ensureStorageDir();
    const indexPath = path.join(STORAGE_DIR, 'datasets_index.json');
    let index = [];
    if (fs.existsSync(indexPath)) {
        try {
            index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        } catch (e) {
            index = [];
        }
    }
    index.unshift(manifestEntry);
    fs.writeFileSync(indexPath, JSON.stringify(index.slice(0, 50), null, 2), 'utf8');
}

function listSyntheticDatasets() {
    ensureStorageDir();
    const indexPath = path.join(STORAGE_DIR, 'datasets_index.json');
    if (!fs.existsSync(indexPath)) {
        return [];
    }
    try {
        return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    } catch (e) {
        return [];
    }
}

function getSyntheticDatasetById(datasetId) {
    ensureStorageDir();
    const safeId = path.basename(datasetId);
    const filePath = path.join(STORAGE_DIR, `${safeId}.json`);
    if (!fs.existsSync(filePath)) {
        return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

module.exports = {
    generateSyntheticDataset,
    validateSyntheticDataset,
    listSyntheticDatasets,
    getSyntheticDatasetById,
    MECHANIC_ARCHETYPES,
    SERVICE_CATALOG,
    VEHICLE_TYPES
};
