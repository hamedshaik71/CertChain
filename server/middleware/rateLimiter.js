const rateLimit = require('express-rate-limit');

/**
 * Login Rate Limiter
 * 5 attempts per 15 minutes per IP
 */
const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => {
        return req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    },
    message: {
        success: false,
        error: 'TOO_MANY_ATTEMPTS',
        message: 'Too many login attempts. Please try again after 15 minutes.',
        retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        const adminIps = process.env.ADMIN_IPS?.split(',') || [];
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
        return adminIps.includes(clientIp);
    }
});

/**
 * Password Reset Rate Limiter
 * 3 attempts per hour per IP
 */
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    keyGenerator: (req) => {
        return req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    },
    message: {
        success: false,
        error: 'TOO_MANY_ATTEMPTS',
        message: 'Too many password reset attempts. Please try again after 1 hour.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * API Rate Limiter
 * 100 requests per 15 minutes
 */
const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    keyGenerator: (req) => {
        return req.user?.institutionId || req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    },
    message: {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    loginRateLimiter,
    passwordResetLimiter,
    apiRateLimiter
};