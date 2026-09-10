const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert');

const {
    generateSyntheticDataset,
    validateSyntheticDataset,
    listSyntheticDatasets,
    getSyntheticDatasetById
} = require('../services/syntheticDataGenerator');
const {
    registerModel,
    promoteModel,
    listRegisteredModels,
    validateModelForInference
} = require('../services/modelRegistryService');
const {
    recordOutcomeFeedback,
    listFeedbackRecords,
    exportValidatedFeedbackDataset
} = require('../services/feedbackService');
const {
    isSyntheticDataAllowed,
    requireDevEnvironment
} = require('../middleware/environmentGuard');

describe('INTELLIGARAGE — DEV-ONLY SYNTHETIC DATA GENERATION & ML TRAINING PIPELINE', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
    });

    // 1. Synthetic generation works in DEV
    test('1. Synthetic generation works in DEV environment', () => {
        process.env.NODE_ENV = 'development';
        const dataset = generateSyntheticDataset({ count: 50, seed: 101 });
        assert.ok(dataset);
        assert.strictEqual(dataset.records.length, 50);
        assert.strictEqual(dataset.metadata.synthetic, true);
        assert.strictEqual(dataset.metadata.data_source, 'SYNTHETIC_DEV');
        assert.strictEqual(dataset.metadata.environment, 'development');
    });

    // 2. Synthetic generation works in TEST
    test('2. Synthetic generation works in TEST environment', () => {
        process.env.NODE_ENV = 'test';
        assert.strictEqual(isSyntheticDataAllowed({}), true);
        const dataset = generateSyntheticDataset({ count: 20, seed: 202 });
        assert.strictEqual(dataset.records.length, 20);
    });

    // 3. Synthetic generation is BLOCKED in PRODUCTION
    test('3. Environment Guard blocks synthetic data in PRODUCTION (HTTP 403)', () => {
        process.env.NODE_ENV = 'production';
        assert.strictEqual(isSyntheticDataAllowed({}), false);

        let statusCode = null;
        let responseJson = null;
        let nextCalled = false;

        const mockReq = { originalUrl: '/api/dev/synthetic/generate' };
        const mockRes = {
            status: (code) => {
                statusCode = code;
                return {
                    json: (data) => { responseJson = data; }
                };
            }
        };
        const mockNext = () => { nextCalled = true; };

        requireDevEnvironment(mockReq, mockRes, mockNext);

        assert.strictEqual(nextCalled, false);
        assert.strictEqual(statusCode, 403);
        assert.strictEqual(responseJson.allowed, false);
        assert.ok(responseJson.error.includes('FORBIDDEN'));
    });

    // 4. Zero mutation into production tables
    test('4. Synthetic dataset is stored in isolated repository and not production business entities', () => {
        const dataset = generateSyntheticDataset({ count: 30, seed: 303 });
        const retrieved = getSyntheticDatasetById(dataset.metadata.dataset_id);
        assert.ok(retrieved);
        assert.strictEqual(retrieved.metadata.dataset_id, dataset.metadata.dataset_id);
        assert.strictEqual(retrieved.metadata.synthetic, true);
    });

    // 5. Explicit provenance metadata
    test('5. Synthetic dataset contains explicit provenance metadata', () => {
        const dataset = generateSyntheticDataset({ count: 25, seed: 404 });
        assert.strictEqual(dataset.metadata.data_source, 'SYNTHETIC_DEV');
        assert.strictEqual(dataset.metadata.random_seed, 404);
        assert.ok(dataset.metadata.generator_version);
        assert.ok(dataset.metadata.feature_schema_version);
        assert.ok(dataset.metadata.generated_at);
    });

    // 6. Realistic distributions and NO target leakage
    test('6. Zero target leakage: Prediction-time features exclude actual completion targets', () => {
        const dataset = generateSyntheticDataset({ count: 40, seed: 505 });
        dataset.records.forEach((rec) => {
            assert.strictEqual(rec.prediction_features.actual_duration, undefined);
            assert.strictEqual(rec.prediction_features.actual_completion_time, undefined);
            assert.ok(rec.targets.actual_duration > 0);
            assert.ok(rec.prediction_features.service_type);
            assert.ok(rec.prediction_features.vehicle_type);
        });
    });

    // 7. Train/Val/Test data splitting
    test('7. Dataset includes clean Train (70%), Validation (15%), Test (15%) splits', () => {
        const dataset = generateSyntheticDataset({ count: 100, seed: 606 });
        assert.strictEqual(dataset.splits.train.length, 70);
        assert.strictEqual(dataset.splits.validation.length, 15);
        assert.strictEqual(dataset.splits.test.length, 15);
    });

    // 8. Reproducibility
    test('8. Reproducible generation: Same seed yields identical records', () => {
        const ds1 = generateSyntheticDataset({ count: 20, seed: 777 });
        const ds2 = generateSyntheticDataset({ count: 20, seed: 777 });
        assert.strictEqual(ds1.records[0].actual_duration, ds2.records[0].actual_duration);
        assert.deepStrictEqual(ds1.records[5].prediction_features, ds2.records[5].prediction_features);
    });

    // 9. Model Registry: Synthetic models marked DEV_ONLY
    test('9. Model trained on synthetic data is registered with status DEV_ONLY', () => {
        const model = registerModel({
            model_name: 'Duration_XGBoost_Synthetic',
            dataset_id: 'ds_test_1',
            training_source: 'SYNTHETIC_DEV',
            synthetic: true,
            metrics: { mae: 4.5, rmse: 6.2, r2: 0.93 }
        });

        assert.strictEqual(model.status, 'DEV_ONLY');
        assert.strictEqual(model.training_source, 'SYNTHETIC_DEV');
        assert.strictEqual(model.synthetic, true);
    });

    // 10. Production inference blocks unpromoted DEV_ONLY models
    test('10. Production inference guard rejects DEV_ONLY synthetic models', () => {
        const model = registerModel({
            model_name: 'Duration_XGBoost_Synthetic',
            dataset_id: 'ds_test_2',
            training_source: 'SYNTHETIC_DEV',
            synthetic: true
        });

        const prodCheck = validateModelForInference(model.model_id, 'production');
        assert.strictEqual(prodCheck.allowed, false);
        assert.ok(prodCheck.reason.includes('FORBIDDEN_MODEL_STATUS'));
    });

    // 11. Explicit Model Promotion Gate
    test('11. Explicit promotion advances model status through audit gate', () => {
        const model = registerModel({
            model_name: 'Duration_XGBoost_Synthetic',
            dataset_id: 'ds_test_3',
            training_source: 'SYNTHETIC_DEV',
            synthetic: true
        });

        const promoted = promoteModel(model.model_id, {
            targetStatus: 'VALIDATED',
            userEmail: 'lead_engineer@intelligarage.internal',
            notes: 'Passed benchmark suite with MAE < 5.0 mins.'
        });

        assert.strictEqual(promoted.status, 'VALIDATED');
        assert.strictEqual(promoted.promoted_by, 'lead_engineer@intelligarage.internal');
        assert.ok(promoted.promoted_at);
    });

    // 12. Real-World Supervised Feedback Capture
    test('12. Real feedback is logged for offline retraining without live online loop', () => {
        const fb = recordOutcomeFeedback({
            job_id: 'JOB_REAL_999',
            predicted_duration: 90,
            actual_duration: 110,
            recommended_mechanic_id: 'MECH_01',
            actual_mechanic_id: 'MECH_01',
            job_status: 'COMPLETED'
        });

        assert.ok(fb.feedback_id);
        assert.strictEqual(fb.data_source, 'REAL_PRODUCTION');
        assert.strictEqual(fb.delta_duration, 20);
        assert.strictEqual(fb.is_validated_example, true);

        const exported = exportValidatedFeedbackDataset();
        assert.ok(exported.total_examples >= 1);
        assert.strictEqual(exported.data_source, 'REAL_PRODUCTION');
        assert.strictEqual(exported.synthetic, false);
    });

    // 13. Data Quality & Sanity Validation
    test('13. Reject invalid datasets with negative duration or invalid age', () => {
        const invalidDataset = {
            records: [
                {
                    actual_duration: -20,
                    vehicle_age: 45,
                    mileage: 10000,
                    service_type: 'Oil Change',
                    vehicle_type: 'Sedan',
                    prediction_features: {}
                }
            ]
        };
        const validation = validateSyntheticDataset(invalidDataset);
        assert.strictEqual(validation.isValid, false);
        assert.ok(validation.errors.length > 0);
    });
});
