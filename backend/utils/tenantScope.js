/**
 * Multi-Garage Tenant Scope & Authorization Helper.
 * Enforces strict garage isolation for multi-tenant queries.
 */

function getAuthorizedGarageIds(user) {
    if (!user) return [];
    if (!user.memberships || !Array.isArray(user.memberships)) return [];
    return user.memberships.map(m => m.garage_id).filter(Boolean);
}

function isGarageAuthorized(user, garageId) {
    if (!user || !garageId) return false;
    const role = (user.role || '').toUpperCase();
    if (role === 'OWNER' || role === 'ADMIN') {
        const authorizedGarages = getAuthorizedGarageIds(user);
        // If owner has specific memberships, enforce them; if no memberships listed, allow global owner scope
        return authorizedGarages.length === 0 || authorizedGarages.includes(garageId);
    }
    const authorizedGarages = getAuthorizedGarageIds(user);
    return authorizedGarages.includes(garageId);
}

module.exports = {
    getAuthorizedGarageIds,
    isGarageAuthorized
};
