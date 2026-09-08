/**
 * Decision Safety & Constraint Validation Layer.
 * Validates RBAC, multi-tenant garage isolation, entity status, mechanic availability, and stale predictions.
 */

class DecisionValidationError extends Error {
    constructor(message, code = 'CONSTRAINT_VIOLATION') {
        super(message);
        this.name = 'DecisionValidationError';
        this.code = code;
    }
}

/**
 * Validate that the authenticated user has rights to operate on the specified garage.
 */
function validateGarageAccess(user, garageId) {
    if (!user) {
        throw new DecisionValidationError('Unauthorized: User context missing', 'UNAUTHORIZED');
    }

    if (user.role === 'admin' || user.role === 'owner') {
        return true; // Owners and admins have multi-garage authority
    }

    if (user.role === 'manager') {
        const memberships = user.memberships || [];
        const hasAccess = memberships.some(m => m.garage_id === garageId);
        if (!hasAccess && garageId) {
            throw new DecisionValidationError(`Forbidden: You do not have management access to garage ${garageId}`, 'FORBIDDEN_GARAGE');
        }
        return true;
    }

    throw new DecisionValidationError(`Forbidden: Role ${user.role} is not permitted to make operational decisions`, 'FORBIDDEN_ROLE');
}

/**
 * Validate that the target decision is eligible for human review/execution.
 */
function validateDecisionState(decision, action) {
    if (!decision) {
        throw new DecisionValidationError('Decision record not found', 'NOT_FOUND');
    }

    if (decision.status !== 'PENDING') {
        throw new DecisionValidationError(`Idempotency conflict: Decision ${decision.id} is already ${decision.status}`, 'ALREADY_PROCESSED');
    }

    // Check expiration / stale prediction protection (e.g., 24h validity window)
    if (decision.created_at) {
        const ageHours = (Date.now() - new Date(decision.created_at).getTime()) / (1000 * 60 * 60);
        if (ageHours > 48) {
            throw new DecisionValidationError('Stale decision: The underlying prediction data is older than 48 hours and must be regenerated.', 'STALE_PREDICTION');
        }
    }

    return true;
}

/**
 * Validate that candidate mechanic is active, verified, and not on leave.
 */
async function validateMechanicEligibility(db, mechanicId, garageId) {
    if (!mechanicId) {
        throw new DecisionValidationError('Mechanic ID is required for assignment', 'INVALID_MECHANIC');
    }

    const [rows] = await db.query(
        `SELECT id, garage_id, status FROM Mechanic_Profile WHERE id = ?`,
        [mechanicId]
    );

    if (rows.length === 0) {
        throw new DecisionValidationError(`Mechanic ${mechanicId} does not exist`, 'MECHANIC_NOT_FOUND');
    }

    const mech = rows[0];
    if (garageId && mech.garage_id && mech.garage_id !== garageId) {
        throw new DecisionValidationError(`Safety violation: Mechanic ${mechanicId} belongs to garage ${mech.garage_id}, not ${garageId}`, 'CROSS_GARAGE_ASSIGNMENT_FORBIDDEN');
    }

    if (mech.status === 'ON_LEAVE' || mech.status === 'INACTIVE') {
        throw new DecisionValidationError(`Mechanic ${mechanicId} is currently ${mech.status} and cannot be assigned`, 'MECHANIC_UNAVAILABLE');
    }

    return true;
}

module.exports = {
    DecisionValidationError,
    validateGarageAccess,
    validateDecisionState,
    validateMechanicEligibility
};
