const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// 1. Helmet configuration (XSS, Clickjacking, MIME-sniffing protections)
// CSP and cross-origin policies are disabled on the API to prevent blocking Firebase Auth / Google popups & iframes
const helmetConfig = helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false
});

// 2. Global Rate Limiting (DDoS and Brute Force protection)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000, // Limit each IP to 5000 requests per `window`
    standardHeaders: true, 
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});

// 3. Strict Auth Rate Limiting (Login/Refresh endpoints)
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 100, // start blocking after 100 requests (increased for testing)
    message: { error: 'Too many failed login attempts, please try again after an hour.' }
});

module.exports = {
    helmetConfig,
    globalLimiter,
    authLimiter
};
