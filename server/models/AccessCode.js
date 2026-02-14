// server/models/AccessCode.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const accessCodeSchema = new mongoose.Schema({
    // Code Identity
    code: {
        type: String,
        unique: true,
        required: true,
        index: true,
        minlength: 8,
        maxlength: 16
    },
    
    codeHash: {
        type: String,
        required: true,
        unique: true // For security
    },
    
    // Institution
    institutionAddress: {
        type: String,
        required: true,
        ref: 'Institution',
        index: true
    },
    institutionCode: String,
    institutionName: String,
    
    // Role Assignment
    role: {
        type: String,
        enum: ['STUDENT', 'STAFF', 'ADMIN', 'REGISTRAR', 'SUPER_ADMIN'],
        required: true
    },
    
    // Usage Control
    isUsed: {
        type: Boolean,
        default: false
    },
    usedBy: {
        email: String,
        walletAddress: String,
        fullName: String,
        timestamp: Date
    },
    
    // Time Limits
    expiresAt: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    
    // Metadata
    createdBy: String, // Admin who created the code
    metadata: {
        department: String,
        purpose: String,
        notes: String
    },
    
    // Security
    ipWhitelist: [String], // Optional: restrict to specific IPs
    isRevoked: {
        type: Boolean,
        default: false
    },
    revokedReason: String
});

// Hash the code before saving
accessCodeSchema.pre('save', function(next) {
    if (this.isModified('code')) {
        this.codeHash = crypto
            .createHash('sha256')
            .update(this.code)
            .digest('hex');
    }
    next();
});

// Static: Generate random code
accessCodeSchema.statics.generateCode = function() {
    return crypto.randomBytes(6).toString('hex').toUpperCase();
};

// Static: Hash code
accessCodeSchema.statics.hashCode = function(code) {
    return crypto
        .createHash('sha256')
        .update(code)
        .digest('hex');
};

// Method: Verify code (constant-time comparison)
accessCodeSchema.methods.verifyCode = function(inputCode) {
    const inputHash = crypto
        .createHash('sha256')
        .update(inputCode)
        .digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(this.codeHash),
        Buffer.from(inputHash)
    );
};

// Method: Check if code is valid
accessCodeSchema.methods.isValid = function() {
    return (
        !this.isUsed &&
        !this.isRevoked &&
        this.expiresAt > new Date()
    );
};

// Method: Mark as used
accessCodeSchema.methods.markAsUsed = function(email, walletAddress, fullName) {
    this.isUsed = true;
    this.usedBy = {
        email,
        walletAddress,
        fullName,
        timestamp: new Date()
    };
    return this.save();
};

module.exports = mongoose.model('AccessCode', accessCodeSchema);