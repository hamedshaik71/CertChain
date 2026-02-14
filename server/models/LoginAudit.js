// models/LoginAudit.js
const mongoose = require('mongoose');

const loginAuditSchema = new mongoose.Schema({
    // Reference
    institutionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution',
        required: true,
        index: true
    },
    
    email: {
        type: String,
        required: true,
        lowercase: true,
        index: true
    },
    
    // Login Attempt Details
    success: {
        type: Boolean,
        required: true,
        index: true
    },
    
    failureReason: String, // "Invalid password", "Account pending", "Account locked", etc
    
    // Device Information
    ipAddress: {
        type: String,
        required: true,
        index: true
    },
    
    userAgent: String,
    
    deviceFingerprint: String, // Hash of device properties
    
    // Browser/Device Details
    browser: String,
    operatingSystem: String,
    deviceType: String, // 'mobile', 'tablet', 'desktop'
    
    // Location (if available)
    country: String,
    city: String,
    latitude: Number,
    longitude: Number,
    
    // JWT Information (if successful login)
    jwtIssuedAt: Date,
    jwtExpiresAt: Date,
    jwtTokenHash: String, // Hash of JWT for security
    
    // Refresh Token
    refreshTokenHash: String,
    refreshTokenExpiry: Date,
    
    // Session Information
    sessionId: String,
    
    // Additional metadata
    metadata: mongoose.Schema.Types.Mixed,
    
    // Timestamp
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
        // Auto-delete after 90 days
        expires: 7776000 // 90 days in seconds
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
loginAuditSchema.index({ institutionId: 1, timestamp: -1 });
loginAuditSchema.index({ email: 1, timestamp: -1 });
loginAuditSchema.index({ ipAddress: 1, timestamp: -1 });
loginAuditSchema.index({ success: 1, timestamp: -1 });

// Instance Methods
/**
 * Mark as suspicious (potential attack)
 */
loginAuditSchema.methods.markAsSuspicious = async function() {
    this.metadata = this.metadata || {};
    this.metadata.suspicious = true;
    this.metadata.markedAt = new Date();
    return this.save();
};

/**
 * Get IP details from this audit
 */
loginAuditSchema.methods.getIpDetails = function() {
    return {
        ipAddress: this.ipAddress,
        country: this.country,
        city: this.city,
        coordinates: {
            latitude: this.latitude,
            longitude: this.longitude
        }
    };
};

// Static Methods
/**
 * Get recent login attempts for an institution
 */
loginAuditSchema.statics.getRecentAttempts = async function(institutionId, minutes = 15) {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return await this.find({
        institutionId,
        timestamp: { $gte: since }
    }).sort({ timestamp: -1 });
};

/**
 * Get failed login attempts
 */
loginAuditSchema.statics.getFailedAttempts = async function(institutionId, hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return await this.find({
        institutionId,
        success: false,
        timestamp: { $gte: since }
    }).sort({ timestamp: -1 });
};

/**
 * Get attempts from specific IP
 */
loginAuditSchema.statics.getAttemptsFromIp = async function(institutionId, ipAddress, hours = 1) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return await this.find({
        institutionId,
        ipAddress,
        timestamp: { $gte: since }
    }).sort({ timestamp: -1 });
};

/**
 * Detect suspicious activity
 */
loginAuditSchema.statics.detectSuspiciousActivity = async function(institutionId) {
    const recentFailedAttempts = await this.getFailedAttempts(institutionId, 1);
    
    if (recentFailedAttempts.length >= 5) {
        return {
            suspicious: true,
            reason: 'Multiple failed attempts in last hour',
            attemptCount: recentFailedAttempts.length
        };
    }
    
    // Check for unusual geographic location
    const recentSuccessLogins = await this.find({
        institutionId,
        success: true,
        timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).sort({ timestamp: -1 }).limit(5);
    
    if (recentSuccessLogins.length > 1) {
        const locations = recentSuccessLogins
            .filter(log => log.country)
            .map(log => log.country);
        
        const uniqueCountries = new Set(locations);
        
        // Same IP, different countries in short time = suspicious
        if (uniqueCountries.size > 1) {
            const timeDiff = recentSuccessLogins[0].timestamp - recentSuccessLogins[1].timestamp;
            if (timeDiff < 3600000) { // Less than 1 hour
                return {
                    suspicious: true,
                    reason: 'Impossible travel detected',
                    locations: Array.from(uniqueCountries)
                };
            }
        }
    }
    
    return { suspicious: false };
};

module.exports = mongoose.model('LoginAudit', loginAuditSchema);


// ============================================================================
// services/authService.js
// ============================================================================

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Institution = require('../models/Institution');
const LoginAudit = require('../models/LoginAudit');

class AuthService {
    /**
     * Generate JWT token
     */
    static generateJWT(institutionId, email, expiresIn = '15m') {
        return jwt.sign(
            {
                id: institutionId,
                email,
                type: 'access'
            },
            process.env.JWT_SECRET,
            { expiresIn }
        );
    }
    
    /**
     * Generate refresh token
     */
    static generateRefreshToken(institutionId, email, expiresIn = '7d') {
        return jwt.sign(
            {
                id: institutionId,
                email,
                type: 'refresh'
            },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn }
        );
    }
    
    /**
     * Verify JWT token
     */
    static verifyJWT(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Verify refresh token
     */
    static verifyRefreshToken(token) {
        try {
            return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Hash JWT token for storage
     */
    static hashToken(token) {
        return crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');
    }
    
    /**
     * Generate device fingerprint
     */
    static generateDeviceFingerprint(userAgent, ipAddress) {
        return crypto
            .createHash('sha256')
            .update(`${userAgent}:${ipAddress}`)
            .digest('hex');
    }
    
    /**
     * Create login audit record
     */
    static async createLoginAudit(institutionId, auditData) {
        const audit = new LoginAudit({
            institutionId,
            email: auditData.email,
            success: auditData.success,
            failureReason: auditData.failureReason,
            ipAddress: auditData.ipAddress,
            userAgent: auditData.userAgent,
            deviceFingerprint: auditData.deviceFingerprint,
            browser: auditData.browser,
            operatingSystem: auditData.operatingSystem,
            deviceType: auditData.deviceType,
            country: auditData.country,
            city: auditData.city,
            latitude: auditData.latitude,
            longitude: auditData.longitude,
            jwtIssuedAt: auditData.jwtIssuedAt,
            jwtExpiresAt: auditData.jwtExpiresAt,
            jwtTokenHash: auditData.jwtTokenHash,
            refreshTokenHash: auditData.refreshTokenHash,
            refreshTokenExpiry: auditData.refreshTokenExpiry,
            sessionId: auditData.sessionId,
            metadata: auditData.metadata
        });
        
        return await audit.save();
    }
    
    /**
     * Authenticate institution login
     */
    static async authenticateLogin(email, password, requestData) {
        // Find institution
        const institution = await Institution.findOne({ email })
            .select('+passwordHash +emailVerificationToken');
        
        if (!institution) {
            return {
                success: false,
                error: 'INVALID_CREDENTIALS',
                message: 'Invalid email or password'
            };
        }
        
        // Check login eligibility
        const eligibility = institution.checkLoginEligibility();
        if (!eligibility.eligible) {
            // Log failed attempt
            await institution.recordFailedLoginAttempt(eligibility.reason);
            
            // Create audit record
            await this.createLoginAudit(institution._id, {
                email,
                success: false,
                failureReason: eligibility.reason,
                ipAddress: requestData.ipAddress,
                userAgent: requestData.userAgent,
                deviceFingerprint: requestData.deviceFingerprint,
                browser: requestData.browser,
                operatingSystem: requestData.operatingSystem,
                deviceType: requestData.deviceType,
                country: requestData.country,
                city: requestData.city
            });
            
            return {
                success: false,
                error: 'ACCOUNT_NOT_ELIGIBLE',
                message: eligibility.reason,
                cooldownUntil: eligibility.cooldownUntil
            };
        }
        
        // Check IP whitelisting
        if (!institution.isIpWhitelisted(requestData.ipAddress)) {
            await institution.recordFailedLoginAttempt('IP not whitelisted');
            
            return {
                success: false,
                error: 'IP_NOT_WHITELISTED',
                message: 'Login from this IP is not allowed'
            };
        }
        
        // Verify password
        const isPasswordValid = await institution.comparePassword(password);
        if (!isPasswordValid) {
            await institution.recordFailedLoginAttempt('Invalid password');
            
            // Create audit record
            await this.createLoginAudit(institution._id, {
                email,
                success: false,
                failureReason: 'Invalid password',
                ipAddress: requestData.ipAddress,
                userAgent: requestData.userAgent,
                deviceFingerprint: requestData.deviceFingerprint,
                browser: requestData.browser,
                operatingSystem: requestData.operatingSystem,
                deviceType: requestData.deviceType
            });
            
            return {
                success: false,
                error: 'INVALID_CREDENTIALS',
                message: 'Invalid email or password'
            };
        }
        
        // Generate tokens
        const accessToken = this.generateJWT(institution._id, institution.email);
        const refreshToken = this.generateRefreshToken(institution._id, institution.email);
        
        const jwtPayload = jwt.decode(accessToken);
        
        // Create session data
        const sessionData = {
            jwtToken: this.hashToken(accessToken),
            refreshToken: this.hashToken(refreshToken),
            issuedAt: new Date(),
            expiresAt: new Date(jwtPayload.exp * 1000),
            deviceFingerprint: requestData.deviceFingerprint,
            ipAddress: requestData.ipAddress,
            userAgent: requestData.userAgent,
            isActive: true
        };
        
        // Record successful login
        await institution.recordSuccessfulLogin(sessionData);
        
        // Create audit record
        await this.createLoginAudit(institution._id, {
            email,
            success: true,
            ipAddress: requestData.ipAddress,
            userAgent: requestData.userAgent,
            deviceFingerprint: requestData.deviceFingerprint,
            browser: requestData.browser,
            operatingSystem: requestData.operatingSystem,
            deviceType: requestData.deviceType,
            country: requestData.country,
            city: requestData.city,
            jwtIssuedAt: sessionData.issuedAt,
            jwtExpiresAt: sessionData.expiresAt,
            jwtTokenHash: sessionData.jwtToken,
            refreshTokenHash: sessionData.refreshToken,
            refreshTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            sessionId: crypto.randomBytes(16).toString('hex')
        });
        
        // Check for suspicious activity
        const suspiciousCheck = await LoginAudit.detectSuspiciousActivity(institution._id);
        if (suspiciousCheck.suspicious) {
            // TODO: Send security alert to institution
        }
        
        return {
            success: true,
            message: 'Login successful',
            token: accessToken,
            refreshToken,
            expiresIn: 900, // 15 minutes
            institution: {
                id: institution._id,
                name: institution.name,
                email: institution.email,
                status: institution.status.application,
                institutionCode: institution.institutionCode
            }
        };
    }
    
    /**
     * Refresh access token
     */
    static async refreshAccessToken(refreshToken, institutionId) {
        const payload = this.verifyRefreshToken(refreshToken);
        
        if (!payload || payload.id !== institutionId) {
            return {
                success: false,
                error: 'INVALID_REFRESH_TOKEN',
                message: 'Refresh token is invalid or expired'
            };
        }
        
        const institution = await Institution.findById(institutionId);
        if (!institution) {
            return {
                success: false,
                error: 'INSTITUTION_NOT_FOUND',
                message: 'Institution not found'
            };
        }
        
        const newAccessToken = this.generateJWT(institution._id, institution.email);
        
        return {
            success: true,
            token: newAccessToken,
            expiresIn: 900
        };
    }
    
    /**
     * Logout
     */
    static async logout(institutionId, sessionId) {
        const institution = await Institution.findById(institutionId);
        if (!institution) {
            return { success: false };
        }
        
        // Deactivate session
        const session = institution.sessions.find(s => s._id.toString() === sessionId);
        if (session) {
            session.isActive = false;
        }
        
        await institution.save();
        
        return { success: true };
    }
}

module.exports = AuthService;