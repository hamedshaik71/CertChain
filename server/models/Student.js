// server/models/Student.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const studentSchema = new mongoose.Schema({
    studentCode: { 
        type: String, 
        unique: true, 
        required: true,
        index: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        index: true
    },
    fullName: { 
        type: String, 
        required: true 
    },
    // Alias for compatibility
    name: {
        type: String,
        get: function() {
            return this.fullName;
        }
    },
    phone: {
        type: String
    },
    dateOfBirth: {
        type: Date
    },
    institutionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution'
    },
    institutionAddress: { 
        type: String,
        ref: 'Institution'
    },
    institutionName: {
        type: String
    },
    walletAddress: {
        type: String
    },
    profileImage: {
        type: String
    },
    
    // Security
    passwordHash: {
        type: String
    },
    isVerified: { 
        type: Boolean, 
        default: false 
    },
    verificationToken: {
        type: String
    },
    verificationTokenExpires: {
        type: Date
    },
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpires: {
        type: Date
    },
    
    // Academic Info
    enrollmentDate: { 
        type: Date, 
        default: Date.now 
    },
    graduationDate: {
        type: Date
    },
    program: {
        type: String
    },
    department: {
        type: String
    },
    
    // Status
    status: {
        type: String,
        enum: ['ACTIVE', 'GRADUATED', 'SUSPENDED', 'INACTIVE'],
        default: 'ACTIVE'
    },
    
    // Activity Tracking
    lastLogin: {
        type: Date
    },
    loginCount: {
        type: Number,
        default: 0
    },
    
    // Linked Certificates
    certificates: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Certificate'
    }],
    
    // Metadata
    metadata: {
        type: mongoose.Schema.Types.Mixed
    },
    
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Indexes for faster queries
studentSchema.index({ email: 1, studentCode: 1 });
studentSchema.index({ institutionId: 1, status: 1 });
studentSchema.index({ institutionAddress: 1 });

// Pre-save middleware
studentSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    
    // Sync name with fullName
    if (this.fullName && !this.name) {
        this.name = this.fullName;
    }
    
    next();
});

// Generate unique student code
studentSchema.statics.generateStudentCode = function(institutionCode = 'STU') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${institutionCode}-${timestamp}-${random}`;
};

// Set password with hashing
studentSchema.methods.setPassword = function(password) {
    this.passwordHash = crypto
        .createHash('sha256')
        .update(password + (process.env.PASSWORD_SALT || 'certchain-salt'))
        .digest('hex');
};

// Verify password
studentSchema.methods.verifyPassword = function(password) {
    if (!this.passwordHash) return false;
    
    const hash = crypto
        .createHash('sha256')
        .update(password + (process.env.PASSWORD_SALT || 'certchain-salt'))
        .digest('hex');
    return this.passwordHash === hash;
};

// Compare password (alias for verifyPassword)
studentSchema.methods.comparePassword = function(password) {
    return this.verifyPassword(password);
};

// Get public profile (safe to send to client)
studentSchema.methods.getPublicProfile = function() {
    return {
        id: this._id,
        studentCode: this.studentCode,
        name: this.fullName,
        fullName: this.fullName,
        email: this.email,
        phone: this.phone,
        institutionName: this.institutionName,
        department: this.department,
        program: this.program,
        status: this.status,
        enrollmentDate: this.enrollmentDate,
        graduationDate: this.graduationDate,
        isVerified: this.isVerified,
        profileImage: this.profileImage
    };
};

// Generate verification token
studentSchema.methods.generateVerificationToken = function() {
    this.verificationToken = crypto.randomBytes(32).toString('hex');
    this.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    return this.verificationToken;
};

// Generate password reset token
studentSchema.methods.generateResetToken = function() {
    this.resetPasswordToken = crypto.randomBytes(32).toString('hex');
    this.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    return this.resetPasswordToken;
};

// Virtual for certificate count
studentSchema.virtual('certificateCount').get(function() {
    return this.certificates ? this.certificates.length : 0;
});

// Ensure virtuals are included in JSON
studentSchema.set('toJSON', { virtuals: true });
studentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Student', studentSchema);