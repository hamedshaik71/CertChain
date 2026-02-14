// models/Institution.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const institutionSchema = new mongoose.Schema({
    // ==========================================================================
    // BASIC INFORMATION
    // ==========================================================================
    
    name: {
        type: String,
        required: true,
        trim: true
    },
    
    institutionCode: {
        type: String,
        unique: true,
        required: true,
        uppercase: true,
        index: true
    },
    
    accreditationId: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    
    // ==========================================================================
    // CONTACT INFORMATION
    // ==========================================================================
    
    email: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
        index: true,
        validate: {
            validator: function(v) {
                const basicEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                
                if (!basicEmail) return false;

                // In development, allow all emails
                if (process.env.NODE_ENV === 'development') {
                    return true;
                }

                // Allow institutional domains in production
                const institutionalPatterns = [
                    /@.*\.edu$/i,
                    /@.*\.edu\./i,
                    /@.*\.ac\./i,
                    /@.*\.org$/i,
                    /@.*\.org\./i,
                    /@.*\.university/i,
                    /@.*\.college/i,
                    /@.*\.school/i,
                    /@.*\.institute/i,
                    /@.*\.gov$/i,
                    /@.*\.gov\./i,
                ];

                return institutionalPatterns.some(pattern => pattern.test(v));
            },
            message: 'Email must be from an institutional domain (.edu, .ac.xx, .org)'
        }
    },
    
    phone: String,
    
    address: String,
    
    website: String,
    
    // ==========================================================================
    // AUTHENTICATION & SECURITY
    // ==========================================================================
    
    passwordHash: {
        type: String,
        required: true,
        select: false
    },
    
    emailVerified: {
        type: Boolean,
        default: false
    },
    
    emailVerificationToken: {
        type: String,
        select: false
    },
    
    emailVerificationExpiry: {
        type: Date,
        select: false
    },
    
    // ==========================================================================
    // STATUS MANAGEMENT
    // ==========================================================================
    
    status: {
        application: {
            type: String,
            enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REVOKED'],
            default: 'PENDING',
            index: true
        },
        
        isLocked: {
            type: Boolean,
            default: false
        },
        
        lockReason: String,
        lockedAt: Date,
        unlockedAt: Date
    },
    
    // ==========================================================================
    // APPROVAL WORKFLOW
    // ==========================================================================
    
    approval: {
        approvedBy: String,
        approvedAt: Date,
        approvalCode: String,
        comments: String
    },
    
    rejection: {
        rejectedBy: String,
        rejectedAt: Date,
        reason: String
    },
    
    // ==========================================================================
    // DOCUMENT MANAGEMENT
    // ==========================================================================
    
    documents: {
        accreditationProof: {
            fileName: String,
            fileUrl: String,
            uploadedAt: Date,
            verified: {
                type: Boolean,
                default: false
            },
            verifiedBy: String
        },
        
        officialLetter: {
            fileName: String,
            fileUrl: String,
            uploadedAt: Date,
            verified: {
                type: Boolean,
                default: false
            }
        },
        
        identityProof: {
            fileName: String,
            fileUrl: String,
            uploadedAt: Date,
            verified: {
                type: Boolean,
                default: false
            }
        }
    },
    
    // ==========================================================================
    // LOGIN ATTEMPT TRACKING
    // ==========================================================================
    
    loginAttempts: {
        count: {
            type: Number,
            default: 0
        },
        lastAttemptAt: Date,
        cooldownUntil: Date,
        lastFailureReason: String
    },
    
    // ==========================================================================
    // SESSION & JWT MANAGEMENT
    // ==========================================================================
    
    sessions: [{
        jwtToken: String,
        refreshToken: String,
        issuedAt: Date,
        expiresAt: Date,
        deviceFingerprint: String,
        ipAddress: String,
        userAgent: String,
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    
    // ==========================================================================
    // PASSWORD MANAGEMENT
    // ==========================================================================
    
    passwordHistory: [{
        hash: String,
        changedAt: Date
    }],
    
    passwordLastChangedAt: Date,
    passwordResetToken: {
        type: String,
        select: false
    },
    passwordResetExpiry: {
        type: Date,
        select: false
    },
    
    // ==========================================================================
    // INSTITUTIONAL DATA
    // ==========================================================================
    
    institutionalData: {
        establishedYear: Number,
        numberOfStudents: Number,
        numberOfFaculty: Number,
        programs: [String],
        website: String
    },
    
    // ==========================================================================
    // SETTINGS
    // ==========================================================================
    
    settings: {
        ipWhitelistingEnabled: {
            type: Boolean,
            default: false
        },
        
        ipWhitelist: [String],
        
        sandboxMode: {
            type: Boolean,
            default: true
        },
        
        requireDualVerification: {
            type: Boolean,
            default: false
        },
        
        passwordExpiryDays: {
            type: Number,
            default: 90
        },
        
        sessionTimeoutMinutes: {
            type: Number,
            default: 30
        }
    },
    
    // ==========================================================================
    // STATISTICS
    // ==========================================================================
    
    statistics: {
        certificatesIssued: {
            type: Number,
            default: 0
        },
        
        certificatesRevoked: {
            type: Number,
            default: 0
        },
        
        studentsEnrolled: {
            type: Number,
            default: 0
        },
        
        lastLoginAt: Date,
        totalLogins: {
            type: Number,
            default: 0
        }
    },
    
    // ==========================================================================
    // BLOCKCHAIN INTEGRATION (OPTIONAL - No wallet required for institutions)
    // ==========================================================================
    
    blockchain: {
        isAuthorized: {
            type: Boolean,
            default: false
        },
        authorizationTxHash: String,
        authorizationBlockNumber: Number,
        authorizationDate: Date,
        smartContractAddress: String
    },
    
    // ==========================================================================
    // TIMESTAMPS
    // ==========================================================================
    
    registeredAt: {
        type: Date,
        default: Date.now
    },
    
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// =============================================================================
// INDEXES (NO walletAddress index!)
// =============================================================================

institutionSchema.index({ 'status.application': 1, registeredAt: -1 });
institutionSchema.index({ email: 1, 'status.application': 1 });

// =============================================================================
// PRE-SAVE HOOKS
// =============================================================================

institutionSchema.pre('save', async function(next) {
    if (!this.isModified('passwordHash')) {
        return next();
    }
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
        this.passwordLastChangedAt = new Date();
        next();
    } catch (error) {
        next(error);
    }
});

// =============================================================================
// INSTANCE METHODS
// =============================================================================

institutionSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
};

institutionSchema.methods.checkLoginEligibility = function() {
    if (this.status.application !== 'APPROVED') {
        return {
            eligible: false,
            reason: `Account status is ${this.status.application}. Awaiting approval.`
        };
    }
    
    if (this.status.isLocked) {
        return {
            eligible: false,
            reason: `Account is locked. Reason: ${this.status.lockReason}`
        };
    }
    
    if (!this.emailVerified) {
        return {
            eligible: false,
            reason: 'Email not verified. Check your inbox.'
        };
    }
    
    if (this.loginAttempts.cooldownUntil && new Date() < this.loginAttempts.cooldownUntil) {
        return {
            eligible: false,
            reason: `Too many failed attempts. Try again after cooldown.`,
            cooldownUntil: this.loginAttempts.cooldownUntil
        };
    }
    
    return { eligible: true };
};

institutionSchema.methods.recordFailedLoginAttempt = async function(reason = 'Invalid credentials') {
    this.loginAttempts.count += 1;
    this.loginAttempts.lastAttemptAt = new Date();
    this.loginAttempts.lastFailureReason = reason;
    
    const MAX_ATTEMPTS = 5;
    const COOLDOWN_MINUTES = 15;
    
    if (this.loginAttempts.count >= MAX_ATTEMPTS) {
        this.loginAttempts.cooldownUntil = new Date(
            Date.now() + COOLDOWN_MINUTES * 60 * 1000
        );
    }
    
    return this.save();
};

institutionSchema.methods.recordSuccessfulLogin = async function(sessionData) {
    this.loginAttempts.count = 0;
    this.loginAttempts.cooldownUntil = null;
    this.statistics.lastLoginAt = new Date();
    this.statistics.totalLogins += 1;
    this.sessions.push(sessionData);
    
    if (this.sessions.length > 5) {
        this.sessions = this.sessions.slice(-5);
    }
    
    return this.save();
};

institutionSchema.methods.lockAccount = async function(reason) {
    this.status.isLocked = true;
    this.status.lockReason = reason;
    this.status.lockedAt = new Date();
    return this.save();
};

institutionSchema.methods.unlockAccount = async function() {
    this.status.isLocked = false;
    this.status.lockReason = null;
    this.status.unlockedAt = new Date();
    this.loginAttempts.count = 0;
    this.loginAttempts.cooldownUntil = null;
    return this.save();
};

institutionSchema.methods.approveApplication = async function(approvalData) {
    this.status.application = 'APPROVED';
    this.approval = {
        approvedBy: approvalData.approvedBy,
        approvedAt: new Date(),
        approvalCode: approvalData.approvalCode,
        comments: approvalData.comments
    };
    return this.save();
};

institutionSchema.methods.rejectApplication = async function(rejectionData) {
    this.status.application = 'REJECTED';
    this.rejection = {
        rejectedBy: rejectionData.rejectedBy,
        rejectedAt: new Date(),
        reason: rejectionData.reason
    };
    return this.save();
};

institutionSchema.methods.generateEmailVerificationToken = function() {
    const token = crypto.randomBytes(32).toString('hex');
    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
    this.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return token;
};

institutionSchema.methods.verifyEmailToken = function(token) {
    const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
    
    if (hashedToken !== this.emailVerificationToken) {
        return false;
    }
    
    if (new Date() > this.emailVerificationExpiry) {
        return false;
    }
    
    return true;
};

institutionSchema.methods.confirmEmailVerification = async function() {
    this.emailVerified = true;
    this.emailVerificationToken = undefined;
    this.emailVerificationExpiry = undefined;
    return this.save();
};

institutionSchema.methods.generatePasswordResetToken = function() {
    const token = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
    this.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000);
    return token;
};

institutionSchema.methods.verifyPasswordResetToken = function(token) {
    const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
    
    if (hashedToken !== this.passwordResetToken) {
        return false;
    }
    
    if (new Date() > this.passwordResetExpiry) {
        return false;
    }
    
    return true;
};

institutionSchema.methods.isPasswordUsedBefore = async function(newPassword) {
    if (!this.passwordHistory || this.passwordHistory.length === 0) {
        return false;
    }
    
    for (let history of this.passwordHistory.slice(-3)) {
        const isMatch = await bcrypt.compare(newPassword, history.hash);
        if (isMatch) {
            return true;
        }
    }
    
    return false;
};

institutionSchema.methods.updatePassword = async function(newPassword) {
    const wasUsedBefore = await this.isPasswordUsedBefore(newPassword);
    if (wasUsedBefore) {
        throw new Error('Password was used before. Please choose a different password.');
    }
    
    if (this.passwordHash) {
        this.passwordHistory.push({
            hash: this.passwordHash,
            changedAt: new Date()
        });
    }
    
    this.passwordHash = newPassword;
    this.passwordResetToken = undefined;
    this.passwordResetExpiry = undefined;
    
    return this.save();
};

institutionSchema.statics.generateInstitutionCode = function(name) {
    const prefix = name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 4);
    
    const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `${prefix}${suffix}`;
};

institutionSchema.methods.isIpWhitelisted = function(ipAddress) {
    if (!this.settings.ipWhitelistingEnabled) {
        return true;
    }
    
    return this.settings.ipWhitelist.includes(ipAddress);
};

institutionSchema.methods.logoutAllSessions = async function() {
    this.sessions = this.sessions.map(session => {
        session.isActive = false;
        return session;
    });
    return this.save();
};

institutionSchema.methods.getActiveSessions = function() {
    return this.sessions.filter(s => s.isActive).length;
};

institutionSchema.methods.allDocumentsVerified = function() {
    return (
        this.documents.accreditationProof?.verified &&
        this.documents.officialLetter?.verified &&
        this.documents.identityProof?.verified
    );
};

module.exports = mongoose.model('Institution', institutionSchema);