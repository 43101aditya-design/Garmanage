const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// 1. Helmet configuration (XSS, Clickjacking, MIME-sniffing protections)
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com", "https://*.firebaseapp.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: [
                "'self'", 
                "https://*.googleapis.com", 
                "https://*.firebaseio.com", 
                "https://*.firebaseapp.com",
                "https://identitytoolkit.googleapis.com",
                "https://securetoken.googleapis.com"
            ],
            frameSrc: ["'self'", "https://*.firebaseapp.com", "https://accounts.google.com"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "cross-origin" }
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
