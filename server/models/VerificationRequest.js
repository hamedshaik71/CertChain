// server/models/VerificationRequest.js
const mongoose = require('mongoose');

const verificationRequestSchema = new mongoose.Schema({
    // Request Identity
    requestId: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    
    // Employer Information
    employer: {
        name: String,
        email: {
            type: String,
            lowercase: true,
            required: true
        },
        walletAddress: String,
        companyRegistration: String,
        verifiedEmployer: { type: Boolean, default: false }
    },
    
    // Certificate Being Verified
    certificateHash: {
        type: String,
        required: true,
        ref: 'Certificate',
        index: true
    },
    certificateData: {
        studentName: String,
        studentCode: String,
        courseName: String,
        issueDate: Date,
        grade: String
    },
    
    // Student Information
    student: {
        studentCode: String,
        studentName: String,
        studentEmail: String
    },
    
    // Request Details
    purpose: {
        type: String,
        enum: [
            'EMPLOYMENT_VERIFICATION',
            'ADMISSIONS_VERIFICATION',
            'LICENSE_VERIFICATION',
            'AUDIT_VERIFICATION',
            'CREDENTIAL_CHECK',
            'OTHER'
        ],
        required: true,
        index: true
    },
    
    details: {
        positionApplied: String,
        department: String,
        requestReason: String,
        additionalQuestions: [String]
    },
    
    // Access Control
    accessScope: {
        canViewCertificate: { type: Boolean, default: false },
        canDownloadCertificate: { type: Boolean, default: false },
        canVerifyOnBlockchain: { type: Boolean, default: true },
        dataFieldsAllowed: [String],
        timeLimit: Date
    },
    
    // Request Status
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED'],
        default: 'PENDING',
        index: true
    },
    
    // Student Approval/Rejection
    studentApproval: {
        approvedAt: Date,
        rejectedAt: Date,
        approvalStatus: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'REJECTED'],
            default: 'PENDING'
        },
        approvalReason: String,
        studentComments: String
    },
    
    // Verification Results
    verificationResult: {
        verified: Boolean,
        verifiedAt: Date,
        verifiedBy: String,
        verificationMethod: {
            type: String,
            enum: ['DATABASE', 'BLOCKCHAIN', 'HYBRID'],
            default: 'HYBRID'
        },
        blockchainStatus: {
            isValid: Boolean,
            transactionHash: String,
            blockNumber: Number,
            verificationHash: String
        },
        dataShared: {}
    },
    
    // Logging & Audit Trail
    auditTrail: [
        {
            action: String,
            performedBy: String,
            performedAt: { type: Date, default: Date.now },
            ipAddress: String,
            userAgent: String,
            details: String
        }
    ],
    
    // Access Log
    accessLog: [
        {
            accessedAt: Date,
            accessedBy: String,
            dataAccessed: [String],
            ipAddress: String,
            userAgent: String
        }
    ],
    
    // Consent & Privacy
    privacyConsent: {
        studentConsented: { type: Boolean, default: false },
        consentDate: Date,
        consentVersion: String,
        studentSignature: String
    },
    
    // Notification Status
    notifications: {
        studentNotified: { type: Boolean, default: false },
        notificationSentAt: Date,
        notificationMethod: String,
        studentReadNotification: { type: Boolean, default: false },
        readAt: Date
    },
    
    // Security
    encryptedDataKey: String,
    isExpired: {
        type: Boolean,
        default: false
    },
    expirationReason: String,
    
    // Metadata
    priority: {
        type: String,
        enum: ['LOW', 'NORMAL', 'HIGH'],
        default: 'NORMAL'
    },
    tags: [String],
    
    // Timeline
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: Date
});

// Indexes
verificationRequestSchema.index({ status: 1, createdAt: -1 });
verificationRequestSchema.index({ certificateHash: 1, status: 1 });
verificationRequestSchema.index({ 'student.studentCode': 1, status: 1 });
verificationRequestSchema.index({ 'employer.email': 1 });

// Method: Add audit entry
verificationRequestSchema.methods.addAuditEntry = function(action, performedBy, ipAddress, userAgent, details) {
    this.auditTrail.push({
        action,
        performedBy,
        performedAt: new Date(),
        ipAddress,
        userAgent,
        details
    });
    return this.save();
};

// Method: Student approves request
verificationRequestSchema.methods.approveByStudent = function(approvalReason, comments) {
    this.studentApproval = {
        approvedAt: new Date(),
        approvalStatus: 'APPROVED',
        approvalReason,
        studentComments: comments
    };
    this.status = 'APPROVED';
    this.privacyConsent.studentConsented = true;
    this.privacyConsent.consentDate = new Date();

    return this.addAuditEntry(
        'STUDENT_APPROVAL',
        this.student.studentCode,
        null,
        null,
        `Student approved verification request: ${approvalReason}`
    );
};

// Method: Student rejects request
verificationRequestSchema.methods.rejectByStudent = function(rejectionReason, comments) {
    this.studentApproval = {
        rejectedAt: new Date(),
        approvalStatus: 'REJECTED',
        approvalReason: rejectionReason,
        studentComments: comments
    };
    this.status = 'REJECTED';

    return this.addAuditEntry(
        'STUDENT_REJECTION',
        this.student.studentCode,
        null,
        null,
        `Student rejected verification request: ${rejectionReason}`
    );
};

// Method: Log data access
verificationRequestSchema.methods.logAccess = function(accessedBy, dataAccessed, ipAddress, userAgent) {
    this.accessLog.push({
        accessedAt: new Date(),
        accessedBy,
        dataAccessed,
        ipAddress,
        userAgent
    });
    return this.save();
};

// Method: Check if request is expired
verificationRequestSchema.methods.checkExpiration = function() {
    if (this.expiresAt && new Date() > this.expiresAt) {
        this.isExpired = true;
        this.status = 'EXPIRED';
        this.expirationReason = 'Request validity period ended';
        return this.save();
    }
    return Promise.resolve(this);
};

// Method: Verify on blockchain
verificationRequestSchema.methods.verifyOnBlockchain = function(blockchainResult) {
    this.verificationResult.verified = blockchainResult.isValid;
    this.verificationResult.verifiedAt = new Date();
    this.verificationResult.verifiedBy = 'BLOCKCHAIN';
    this.verificationResult.blockchainStatus = blockchainResult;
    
    if (blockchainResult.isValid) {
        this.status = 'APPROVED';
    }

    return this.addAuditEntry(
        'BLOCKCHAIN_VERIFICATION',
        'system',
        null,
        null,
        `Verification result: ${blockchainResult.isValid ? 'VALID' : 'INVALID'}`
    );
};

// Method: Get shared data
verificationRequestSchema.methods.getSharedData = function() {
    const allowedFields = this.accessScope.dataFieldsAllowed || [];
    const shared = {};

    for (const field of allowedFields) {
        if (this.certificateData[field]) {
            shared[field] = this.certificateData[field];
        }
    }

    return {
        requestId: this.requestId,
        verificationDate: this.verificationResult.verifiedAt,
        verified: this.verificationResult.verified,
        data: shared,
        accessLog: this.accessLog.length,
        blockchainVerified: this.verificationResult.blockchainStatus?.isValid || false
    };
};

// Method: Revoke access
verificationRequestSchema.methods.revokeAccess = function(revokedBy, reason) {
    this.status = 'REVOKED';
    this.accessScope.timeLimit = new Date();

    return this.addAuditEntry(
        'ACCESS_REVOKED',
        revokedBy,
        null,
        null,
        `Access revoked: ${reason}`
    );
};

// Method: Get request summary
verificationRequestSchema.methods.getSummary = function() {
    return {
        requestId: this.requestId,
        employer: this.employer.name,
        purpose: this.purpose,
        status: this.status,
        studentApprovalStatus: this.studentApproval.approvalStatus,
        verified: this.verificationResult.verified,
        createdAt: this.createdAt,
        accessLog: this.accessLog.length,
        expiresAt: this.expiresAt
    };
};

module.exports = mongoose.model('VerificationRequest', verificationRequestSchema);