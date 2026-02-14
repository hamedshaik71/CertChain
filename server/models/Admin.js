// server/models/Admin.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const adminSchema = new mongoose.Schema({
    // Identity
    walletAddress: {
        type: String,
        required: true,
        lowercase: true,
        index: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true,
        index: true
    },
    fullName: String,
    
    // Admin Hierarchy
    adminLevel: {
        type: String,
        enum: ['SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'REGISTRAR', 'IT_ADMIN'],
        required: true
    },
    
    // Permissions (based on level)
    permissions: {
        registerInstitution: Boolean,      // SUPER_ADMIN only
        approveCertificates: Boolean,      // REGISTRAR
        revokeCertificates: Boolean,       // REGISTRAR
        issueCertificates: Boolean,        // DEPARTMENT_ADMIN
        manageUsers: Boolean,               // IT_ADMIN
        approveInstitutions: Boolean,      // SUPER_ADMIN
        viewAnalytics: Boolean,             // All admins
        manageCodes: Boolean                // DEPARTMENT_ADMIN
    },
    
    // Institution Association
    institutionAddress: {
        type: String,
        ref: 'Institution'
    },
    institutionCode: String,
    institutionName: String,
    
    // Activity Tracking
    activityLog: [
        {
            action: String,
            targetType: String, // 'CERTIFICATE', 'USER', 'CODE', 'INSTITUTION'
            targetId: String,
            details: String,
            timestamp: { type: Date, default: Date.now }
        }
    ],
    
    // Statistics
    stats: {
        certificatesIssued: { type: Number, default: 0 },
        certificatesRevoked: { type: Number, default: 0 },
        certificatesApproved: { type: Number, default: 0 },
        certificatesRejected: { type: Number, default: 0 },
        codesGenerated: { type: Number, default: 0 },
        usersManaged: { type: Number, default: 0 }
    },
    
    // Trust Score (for monitoring)
    trustScore: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
    },
    trustHistory: [
        {
            change: Number,
            reason: String,
            timestamp: { type: Date, default: Date.now }
        }
    ],
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    verificationExpires: Date,
    
    // Security
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockedUntil: Date,
    lastLogin: Date,
    
    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: String, // SUPER_ADMIN who added this admin
    approvedBy: String,
    approvedAt: Date
});

// Method: Get allowed actions
adminSchema.methods.getAllowedActions = function() {
    const actions = [];
    
    if (this.adminLevel === 'SUPER_ADMIN') {
        actions.push(
            'REGISTER_INSTITUTION',
            'APPROVE_INSTITUTION',
            'MANAGE_ADMINS',
            'VIEW_ANALYTICS',
            'REVOKE_ANY_CERTIFICATE'
        );
    }
    
    if (this.adminLevel === 'DEPARTMENT_ADMIN') {
        actions.push(
            'ISSUE_CERTIFICATE',
            'GENERATE_CODE',
            'MANAGE_STAFF',
            'VIEW_DEPARTMENT_ANALYTICS'
        );
    }
    
    if (this.adminLevel === 'REGISTRAR') {
        actions.push(
            'APPROVE_CERTIFICATE',
            'REJECT_CERTIFICATE',
            'REVOKE_CERTIFICATE',
            'VIEW_APPROVAL_QUEUE',
            'SIGN_CERTIFICATE'
        );
    }
    
    if (this.adminLevel === 'IT_ADMIN') {
        actions.push(
            'MANAGE_USERS',
            'MANAGE_CODES',
            'VIEW_SYSTEM_LOGS',
            'RESET_PASSWORDS',
            'MANAGE_SECURITY'
        );
    }
    
    return actions;
};

// Method: Log activity
adminSchema.methods.logActivity = function(action, targetType, targetId, details) {
    this.activityLog.push({
        action,
        targetType,
        targetId,
        details,
        timestamp: new Date()
    });
    return this.save();
};

// Method: Update trust score
adminSchema.methods.updateTrustScore = function(change, reason) {
    this.trustScore = Math.max(0, Math.min(100, this.trustScore + change));
    this.trustHistory.push({
        change,
        reason,
        timestamp: new Date()
    });
    return this.save();
};

// Method: Lock account after failed attempts
adminSchema.methods.lockAccount = function() {
    this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    return this.save();
};

// Method: Check if account is locked
adminSchema.methods.isAccountLocked = function() {
    return this.lockedUntil && this.lockedUntil > new Date();
};

module.exports = mongoose.model('Admin', adminSchema);