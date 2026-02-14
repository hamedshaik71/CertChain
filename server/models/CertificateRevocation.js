// server/models/CertificateRevocation.js
const mongoose = require('mongoose');

const certificateRevocationSchema = new mongoose.Schema({
    // Revocation Identity
    revocationId: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    
    // Certificate Reference
    certificateHash: {
        type: String,
        required: true,
        ref: 'Certificate',
        index: true
    },
    certificateData: {
        studentCode: String,
        studentName: String,
        courseName: String,
        institutionName: String,
        originalIssueDate: Date
    },
    
    // Revocation Authority
    authority: {
        walletAddress: {
            type: String,
            required: true,
            lowercase: true
        },
        email: String,
        fullName: String,
        adminLevel: String, // REGISTRAR, SUPER_ADMIN, DEPARTMENT_ADMIN
        institutionAddress: String,
        institutionCode: String
    },
    
    // Revocation Reason (REQUIRED)
    reason: {
        type: String,
        enum: [
            'ACADEMIC_MISCONDUCT',      // Cheating, plagiarism
            'FRAUDULENT_CREDENTIALS',   // False information
            'INCOMPLETE_COURSEWORK',    // Student didn't complete requirements
            'DISCIPLINARY_ACTION',      // Breaking code of conduct
            'DUPLICATE_ISSUANCE',       // Certificate issued twice
            'DATA_ERROR',               // Incorrect data in certificate
            'STUDENT_REQUEST',          // Student asked for revocation
            'INSTITUTION_REQUEST',      // Institution requested revocation
            'COMPLIANCE_ISSUE',         // Legal/compliance reason
            'CREDENTIAL_VERIFICATION_FAILED', // Failed to verify later
            'OTHER'
        ],
        required: true,
        index: true
    },
    
    // Detailed Explanation
    description: {
        type: String,
        required: true,
        minlength: 20,
        maxlength: 1000
    },
    
    // Supporting Evidence/Documentation
    evidence: {
        documentType: String, // 'EMAIL', 'REPORT', 'COMPLAINT', 'AUDIT_FINDING'
        documentFile: String, // base64 encoded file
        documentFileName: String,
        uploadedAt: Date,
        description: String
    },
    
    // Investigation Details
    investigation: {
        isOpen: { type: Boolean, default: false },
        investigator: String,
        startedAt: Date,
        findings: String,
        completedAt: Date,
        status: {
            type: String,
            enum: ['NOT_REQUIRED', 'PENDING', 'IN_PROGRESS', 'COMPLETED'],
            default: 'NOT_REQUIRED'
        }
    },
    
    // Approval Workflow
    approvals: {
        departmentApproval: {
            approvedBy: String,
            approvedAt: Date,
            status: {
                type: String,
                enum: ['PENDING', 'APPROVED', 'REJECTED'],
                default: 'PENDING'
            },
            comments: String
        },
        registrarApproval: {
            approvedBy: String,
            approvedAt: Date,
            status: {
                type: String,
                enum: ['PENDING', 'APPROVED', 'REJECTED'],
                default: 'PENDING'
            },
            comments: String
        },
        superAdminApproval: {
            approvedBy: String,
            approvedAt: Date,
            status: {
                type: String,
                enum: ['PENDING', 'APPROVED', 'REJECTED'],
                default: 'PENDING'
            },
            comments: String
        }
    },
    
    // Execution Details
    execution: {
        executedBy: String,
        executedAt: Date,
        blockchainTxHash: String,
        blockNumber: Number,
        gasUsed: String,
        status: {
            type: String,
            enum: ['PENDING', 'CONFIRMED', 'FAILED'],
            default: 'PENDING'
        }
    },
    
    // Student Notification
    studentNotification: {
        notifiedAt: Date,
        notificationMethod: String, // EMAIL, SMS, PORTAL_MESSAGE
        notificationRead: { type: Boolean, default: false },
        readAt: Date,
        studentAcknowledged: { type: Boolean, default: false },
        acknowledgedAt: Date,
        studentResponse: String
    },
    
    // Appeals Process
    appeal: {
        appealed: { type: Boolean, default: false },
        appealedAt: Date,
        appealReason: String,
        appealEvidence: String,
        appealStatus: {
            type: String,
            enum: ['NOT_APPEALED', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'],
            default: 'NOT_APPEALED'
        },
        appealdecidedAt: Date,
        appealDecidedBy: String,
        appealOutcome: String
    },
    
    // Audit Trail
    auditTrail: [
        {
            action: String,
            performedBy: String,
            performedAt: { type: Date, default: Date.now },
            previousStatus: String,
            newStatus: String,
            comments: String
        }
    ],
    
    // Status
    status: {
        type: String,
        enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED', 'REVERTED'],
        default: 'DRAFT',
        index: true
    },
    
    // Metadata
    isPublic: { type: Boolean, default: true }, // Whether revocation reason is visible in public verification
    severity: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'MEDIUM'
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
    completedAt: Date
});

// Index for efficient queries
certificateRevocationSchema.index({ status: 1, createdAt: -1 });
certificateRevocationSchema.index({ certificateHash: 1, status: 1 });
certificateRevocationSchema.index({ 'authority.walletAddress': 1 });
certificateRevocationSchema.index({ reason: 1, createdAt: -1 });

// Method: Add audit entry
certificateRevocationSchema.methods.addAuditEntry = function(action, performedBy, newStatus, comments) {
    this.auditTrail.push({
        action,
        performedBy,
        performedAt: new Date(),
        previousStatus: this.status,
        newStatus,
        comments
    });
    this.status = newStatus;
    return this.save();
};

// Method: Approve revocation
certificateRevocationSchema.methods.approve = function(approverWallet, approverEmail, approverLevel, comments) {
    const levelKey = approverLevel === 'SUPER_ADMIN'
        ? 'superAdminApproval'
        : approverLevel === 'REGISTRAR'
        ? 'registrarApproval'
        : 'departmentApproval';

    this.approvals[levelKey] = {
        approvedBy: approverWallet,
        approvedAt: new Date(),
        status: 'APPROVED',
        comments
    };

    // Check if all required approvals are complete
    const allApproved = Object.values(this.approvals).every(
        approval => approval.status === 'APPROVED'
    );

    if (allApproved) {
        return this.addAuditEntry(
            'ALL_APPROVALS_COMPLETE',
            approverWallet,
            'APPROVED',
            'All required approvals obtained'
        );
    } else {
        return this.save();
    }
};

// Method: Reject revocation
certificateRevocationSchema.methods.reject = function(rejectorWallet, approverLevel, comments) {
    const levelKey = approverLevel === 'SUPER_ADMIN'
        ? 'superAdminApproval'
        : approverLevel === 'REGISTRAR'
        ? 'registrarApproval'
        : 'departmentApproval';

    this.approvals[levelKey] = {
        approvedBy: rejectorWallet,
        approvedAt: new Date(),
        status: 'REJECTED',
        comments
    };

    return this.addAuditEntry(
        'REVOCATION_REJECTED',
        rejectorWallet,
        'REJECTED',
        comments
    );
};

// Method: Execute revocation on blockchain
certificateRevocationSchema.methods.executeOnBlockchain = function(txHash, blockNumber, gasUsed) {
    this.execution = {
        executedBy: this.authority.walletAddress,
        executedAt: new Date(),
        blockchainTxHash: txHash,
        blockNumber,
        gasUsed,
        status: 'CONFIRMED'
    };

    this.completedAt = new Date();

    return this.addAuditEntry(
        'BLOCKCHAIN_REVOCATION',
        'system',
        'EXECUTED',
        `Revocation executed on blockchain: ${txHash}`
    );
};

// Method: Notify student
certificateRevocationSchema.methods.notifyStudent = function(notificationMethod) {
    this.studentNotification = {
        notifiedAt: new Date(),
        notificationMethod,
        notificationRead: false
    };
    return this.save();
};

// Method: Start appeal process
certificateRevocationSchema.methods.startAppeal = function(appealReason, appealEvidence) {
    this.appeal = {
        appealed: true,
        appealedAt: new Date(),
        appealReason,
        appealEvidence,
        appealStatus: 'PENDING'
    };
    return this.save();
};

// Method: Decide on appeal
certificateRevocationSchema.methods.decideAppeal = function(decidedBy, outcome, comments) {
    this.appeal.appealStatus = outcome; // 'APPROVED' or 'REJECTED'
    this.appeal.appealdecidedAt = new Date();
    this.appeal.appealDecidedBy = decidedBy;
    this.appeal.appealOutcome = comments;

    if (outcome === 'APPROVED') {
        // Revert revocation
        this.status = 'REVERTED';
    }

    return this.addAuditEntry(
        'APPEAL_DECIDED',
        decidedBy,
        outcome === 'APPROVED' ? 'REVERTED' : 'EXECUTED',
        `Appeal ${outcome}`
    );
};

// Method: Check approval status
certificateRevocationSchema.methods.getApprovalStatus = function() {
    return {
        department: this.approvals.departmentApproval.status,
        registrar: this.approvals.registrarApproval.status,
        superAdmin: this.approvals.superAdminApproval.status,
        allApproved: Object.values(this.approvals).every(a => a.status === 'APPROVED'),
        anyRejected: Object.values(this.approvals).some(a => a.status === 'REJECTED')
    };
};

// Method: Get public revocation info (what shows in verification)
certificateRevocationSchema.methods.getPublicInfo = function() {
    if (!this.isPublic) return null;

    return {
        revocationId: this.revocationId,
        reason: this.reason,
        description: this.description,
        revokedAt: this.execution.executedAt,
        revokedBy: this.authority.adminLevel,
        institutionName: this.authority.institutionName,
        isAppealable: new Date() - this.execution.executedAt < 30 * 24 * 60 * 60 * 1000, // 30 days
        appealStatus: this.appeal.appealStatus
    };
};

module.exports = mongoose.model('CertificateRevocation', certificateRevocationSchema);