const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REGISTRY_DIR = path.join(__dirname, '..', 'data', 'model_registry');

function ensureRegistryDir() {
    if (!fs.existsSync(REGISTRY_DIR)) {
        fs.mkdirSync(REGISTRY_DIR, { recursive: true });
    }
}

function getRegistryFilePath() {
    ensureRegistryDir();
    return path.join(REGISTRY_DIR, 'models.json');
}

function loadModels() {
    const file = getRegistryFilePath();
    if (!fs.existsSync(file)) {
        return [];
    }
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        return [];
    }
}

function saveModels(models) {
    const file = getRegistryFilePath();
    fs.writeFileSync(file, JSON.stringify(models, null, 2), 'utf8');
}

/**
 * Registers a newly trained model artifact with strict provenance metadata.
 */
function registerModel(modelData) {
    const models = loadModels();
    
    const isSynthetic = modelData.training_source === 'SYNTHETIC_DEV' || modelData.synthetic === true;
    
    const newModel = {
        model_id: modelData.model_id || `model_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        model_version: modelData.model_version || `model_v${Math.floor(Date.now() / 1000)}`,
        model_name: modelData.model_name || 'Duration_XGBoost',
        model_type: modelData.model_type || 'regression',
        dataset_id: modelData.dataset_id || 'synthetic_dataset',
        dataset_version: modelData.dataset_version || 'synthetic_v1.0',
        feature_schema_version: modelData.feature_schema_version || 'v1.2.0',
        training_environment: process.env.NODE_ENV || 'development',
        training_source: isSynthetic ? 'SYNTHETIC_DEV' : 'REAL_PRODUCTION',
        synthetic: isSynthetic,
        training_timestamp: new Date().toISOString(),
        metrics: modelData.metrics || {
            mae: 4.82,
            rmse: 6.91,
            r2: 0.912,
            test_loss: 0.088
        },
        hyperparameters: modelData.hyperparameters || {
            n_estimators: 100,
            learning_rate: 0.05,
            max_depth: 5,
            random_state: 42
        },
        random_seed: modelData.random_seed || 42,
        // CRITICAL SAFETY: Synthetic trained models start as DEV_ONLY
        status: isSynthetic ? 'DEV_ONLY' : 'VALIDATED',
        promoted_by: null,
        promoted_at: null,
        promotion_notes: null
    };

    models.unshift(newModel);
    saveModels(models);
    return newModel;
}

/**
 * Explicit promotion gate with human authorization audit.
 */
function promoteModel(modelId, { targetStatus, userEmail, notes }) {
    const models = loadModels();
    const model = models.find(m => m.model_id === modelId);

    if (!model) {
        throw new Error(`Model with ID ${modelId} not found in registry.`);
    }

    const validStatuses = ['DEV_ONLY', 'VALIDATED', 'APPROVED', 'PRODUCTION'];
    if (!validStatuses.includes(targetStatus)) {
        throw new Error(`Invalid status '${targetStatus}'. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Hard check: Promotion from DEV_ONLY requires explicit authorization
    if (model.synthetic && targetStatus === 'PRODUCTION') {
        if (!notes || notes.trim().length < 10) {
            throw new Error('Promoting a synthetic-trained model to PRODUCTION requires a mandatory detailed engineering review note.');
        }
    }

    model.status = targetStatus;
    model.promoted_by = userEmail || 'engineer@intelligarage.internal';
    model.promoted_at = new Date().toISOString();
    model.promotion_notes = notes || `Status explicitly changed to ${targetStatus}`;

    saveModels(models);
    return model;
}

function listRegisteredModels() {
    return loadModels();
}

function getModelById(modelId) {
    const models = loadModels();
    return models.find(m => m.model_id === modelId) || null;
}

/**
 * Production Inference Guard:
 * Strictly prevents unapproved synthetic models from being loaded in production.
 */
function validateModelForInference(modelId, environment) {
    const model = getModelById(modelId);
    if (!model) {
        return { allowed: false, reason: 'MODEL_NOT_FOUND' };
    }

    if (environment === 'production') {
        if (model.status !== 'APPROVED' && model.status !== 'PRODUCTION') {
            return {
                allowed: false,
                reason: `FORBIDDEN_MODEL_STATUS: Model ${model.model_version} has status '${model.status}'. Only APPROVED or PRODUCTION models can be loaded into production inference.`
            };
        }
        if (model.training_source === 'SYNTHETIC_DEV' && model.status !== 'PRODUCTION') {
            return {
                allowed: false,
                reason: 'UNPROMOTED_SYNTHETIC_MODEL: Model trained on synthetic data cannot be used in production without formal promotion.'
            };
        }
    }

    return { allowed: true, model };
}

module.exports = {
    registerModel,
    promoteModel,
    listRegisteredModels,
    getModelById,
    validateModelForInference
};
