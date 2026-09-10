const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FEEDBACK_DIR = path.join(__dirname, '..', 'data', 'feedback');

function ensureFeedbackDir() {
    if (!fs.existsSync(FEEDBACK_DIR)) {
        fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
    }
}

function getFeedbackFilePath() {
    ensureFeedbackDir();
    return path.join(FEEDBACK_DIR, 'feedback_records.json');
}

function loadFeedbackRecords() {
    const file = getFeedbackFilePath();
    if (!fs.existsSync(file)) {
        return [];
    }
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
        return [];
    }
}

function saveFeedbackRecords(records) {
    const file = getFeedbackFilePath();
    fs.writeFileSync(file, JSON.stringify(records, null, 2), 'utf8');
}

/**
 * Records real-world execution outcome for offline validated learning.
 * Does NOT immediately trigger live online model retraining.
 */
function recordOutcomeFeedback(feedbackData) {
    const records = loadFeedbackRecords();

    const record = {
        feedback_id: `fb_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        job_id: feedbackData.job_id || null,
        model_version: feedbackData.model_version || 'duration_model_v1',
        data_source: 'REAL_PRODUCTION',
        prediction_time_features: feedbackData.features || {},
        prediction: {
            duration_minutes: feedbackData.predicted_duration,
            recommended_mechanic_id: feedbackData.recommended_mechanic_id,
            confidence_score: feedbackData.confidence_score
        },
        actual_outcome: {
            duration_minutes: feedbackData.actual_duration,
            selected_mechanic_id: feedbackData.actual_mechanic_id,
            job_status: feedbackData.job_status || 'COMPLETED',
            rejection_reason: feedbackData.rejection_reason || null
        },
        delta_duration: feedbackData.actual_duration !== undefined && feedbackData.predicted_duration !== undefined
            ? Math.round(feedbackData.actual_duration - feedbackData.predicted_duration)
            : null,
        is_validated_example: true,
        recorded_at: new Date().toISOString()
    };

    records.unshift(record);
    saveFeedbackRecords(records.slice(0, 1000)); // Maintain rolling window of 1000 logged outcomes
    return record;
}

function listFeedbackRecords() {
    return loadFeedbackRecords();
}

/**
 * Compiles validated real-world examples into an offline training dataset.
 */
function exportValidatedFeedbackDataset() {
    const records = loadFeedbackRecords().filter(r => r.is_validated_example && r.actual_outcome.duration_minutes > 0);
    return {
        dataset_id: `real_feedback_ds_${Date.now()}`,
        data_source: 'REAL_PRODUCTION',
        synthetic: false,
        total_examples: records.length,
        examples: records
    };
}

module.exports = {
    recordOutcomeFeedback,
    listFeedbackRecords,
    exportValidatedFeedbackDataset
};
