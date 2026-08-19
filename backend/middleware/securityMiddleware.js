const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// 1. Helmet configuration (XSS, Clickjacking, MIME-sniffing protections)
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false, // For API compatibility
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
