// server/middleware/auth.js
const jwt = require('jsonwebtoken');
const Institution = require('../models/Institution');
const Student = require('../models/Student');

/**
 * Universal Authentication Middleware
 * Handles Institution, Student, and Admin tokens
 */
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'MISSING_TOKEN',
                message: 'Authorization token is required'
            });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'TOKEN_EXPIRED',
                    message: 'Token has expired. Please login again.',
                    expiresAt: error.expiredAt
                });
            }
            return res.status(401).json({
                success: false,
                error: 'INVALID_TOKEN',
                message: 'Token is invalid'
            });
        }

        // Attach decoded token to request
        req.user = decoded;

        // Handle different user roles
        const role = decoded.role;

        // ============ INSTITUTION ============
        if (role === 'institution') {
            const institutionId = decoded.id || decoded.institutionId;
            
            if (institutionId) {
                const institution = await Institution.findById(institutionId);
                
                if (!institution) {
                    return res.status(404).json({
                        success: false,
                        error: 'INSTITUTION_NOT_FOUND',
                        message: 'Institution not found'
                    });
                }

                if (institution.status.application !== 'APPROVED') {
                    return res.status(403).json({
                        success: false,
                        error: 'ACCOUNT_NOT_APPROVED',
                        message: 'Institution account is not approved'
                    });
                }

                if (institution.status.isLocked) {
                    return res.status(403).json({
                        success: false,
                        error: 'ACCOUNT_LOCKED',
                        message: 'Institution account is locked'
                    });
                }

                // Attach institution details to request
                req.user.institutionId = institutionId;
                req.user.institution = institution;
                req.institution = {
                    id: institutionId,
                    email: decoded.email,
                    institutionCode: decoded.institutionCode,
                    name: institution.name
                };
            }
        }

        // ============ STUDENT ============
        else if (role === 'student') {
            const studentCode = decoded.studentCode;
            
            if (studentCode) {
                const student = await Student.findOne({ studentCode });
                
                if (!student) {
                    return res.status(404).json({
                        success: false,
                        error: 'STUDENT_NOT_FOUND',
                        message: 'Student not found'
                    });
                }

                req.user.student = student;
                req.student = {
                    studentCode: student.studentCode,
                    email: student.email,
                    fullName: student.fullName
                };
            }
        }

        // ============ ADMIN ============
        else if (role === 'admin') {
            req.admin = {
                email: decoded.email,
                adminLevel: decoded.adminLevel,
                wallet: decoded.wallet
            };
        }

        next();

    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'AUTH_ERROR',
            message: error.message
        });
    }
};

/**
 * Admin Middleware - Requires admin role
 */
const adminMiddleware = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'UNAUTHORIZED',
                message: 'Authentication required'
            });
        }

        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'FORBIDDEN',
                message: 'Admin access required'
            });
        }

        next();

    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'AUTH_ERROR',
            message: error.message
        });
    }
};

/**
 * Optional Auth Middleware - Continues even without token
 */
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return next();
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
            req.user = decoded;

            if (decoded.role === 'institution') {
                const institutionId = decoded.id || decoded.institutionId;
                const institution = await Institution.findById(institutionId);
                if (institution) {
                    req.user.institution = institution;
                    req.institution = {
                        id: institutionId,
                        email: decoded.email,
                        institutionCode: decoded.institutionCode
                    };
                }
            }
        } catch (error) {
            // Token invalid but optional, so continue
        }

        next();

    } catch (error) {
        next();
    }
};

module.exports = {
    authMiddleware,
    adminMiddleware,
    optionalAuthMiddleware
};