const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { loginRateLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { uploadMultiple } = require('../middleware/fileUpload');

// ============================================================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================================================

// POST /api/institution/register
router.post('/register',
    uploadMultiple('documents', 3),
    authController.register
);

// POST /api/institution/verify-email
router.post('/verify-email',
    authController.verifyEmail
);

// POST /api/institution/login
router.post('/login',
    loginRateLimiter,
    authController.login
);

// POST /api/institution/refresh-token
router.post('/refresh-token',
    authController.refreshToken
);

// POST /api/institution/forgot-password
router.post('/forgot-password',
    passwordResetLimiter,
    authController.forgotPassword
);

// POST /api/institution/reset-password
router.post('/reset-password',
    passwordResetLimiter,
    authController.resetPassword
);

// ============================================================================
// PROTECTED ROUTES (Authentication Required)
// ============================================================================

// POST /api/institution/logout
router.post('/logout',
    authMiddleware,
    authController.logout
);

// POST /api/institution/change-password
router.post('/change-password',
    authMiddleware,
    authController.changePassword
);

// GET /api/institution/profile
router.get('/profile',
    authMiddleware,
    authController.getProfile
);

module.exports = router;