const mongoose = require('mongoose');

const certificateApprovalQueueSchema = new mongoose.Schema({
    // Queue Identity
    queueId: {
        type: String,
        unique: true,
        required: true,
        index: true
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
    
    // Certificate Details
    certificateData: {
        studentCode: String,
        studentName: String,
        studentEmail: String,
        courseName: String,
        grade: String,
        issueDate: Date,
        expiryDate: Date,
        category: {
            type: String,
            // ✅ FIX: Added 'WORKSHOP' and 'ACHIEVEMENT' to the allowed list
            enum: ['DEGREE', 'INTERNSHIP', 'COURSE', 'CERTIFICATION', 'DIPLOMA', 'WORKSHOP', 'ACHIEVEMENT'],
            default: 'COURSE'
        }
    },
    
    // Submission Details
    submittedBy: {
        walletAddress: String,
        email: String,
        fullName: String,
        adminLevel: String,
        timestamp: { type: Date, default: Date.now }
    },
    
    // Attached Document
    attachmentFile: {
        fileName: String,
        fileData: String, // base64
        mimeType: String,
        uploadedAt: Date
    },
    
    // Approval Workflow
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'REVERTED', 'ISSUED'],
        default: 'PENDING',
        index: true
    },
    
    // Step 1: Staff Submission Validation (IT_ADMIN)
    validationStep: {
        validatedBy: String,
        validatedAt: Date,
        status: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'REJECTED'],
            default: 'PENDING'
        },
        comments: String,
        issues: [String] // e.g., ['Duplicate certificate', 'Invalid student code']
    },
    
    // Step 2: Registrar Approval (REGISTRAR)
    approvalStep: {
        approvedBy: String,
        approvedAt: Date,
        status: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'REJECTED'],
            default: 'PENDING'
        },
        comments: String,
        rejectionReason: String,
        approvalSignature: String // Digital signature
    },
    
    // Step 3: Department Head Sign-Off (DEPARTMENT_ADMIN)
    signOffStep: {
        signedBy: String,
        signedAt: Date,
        status: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'REJECTED'],
            default: 'PENDING'
        },
        comments: String
    },
    
    // Final Blockchain Issuance
    blockchainIssuance: {
        transactionHash: String,
        blockNumber: Number,
        blockchainStatus: {
            type: String,
            enum: ['PENDING', 'CONFIRMED', 'FAILED'],
            default: 'PENDING'
        },
        certificateHash: String,
        issuedAt: Date,
        gasUsed: String
    },
    
    // Historical Audit Trail
    auditTrail: [
        {
            action: String, // 'SUBMITTED', 'VALIDATED', 'APPROVED', 'REJECTED', 'REVERTED'
            performedBy: String,
            performedAt: { type: Date, default: Date.now },
            comments: String,
            previousStatus: String,
            newStatus: String
        }
    ],
    
    // Rejection History
    rejections: {
        count: { type: Number, default: 0 },
        reasons: [String],
        lastRejectedAt: Date,
        canResubmit: { type: Boolean, default: true }
    },
    
    // Metadata
    priority: {
        type: String,
        enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
        default: 'NORMAL'
    },
    tags: [String],
    notes: String,
    
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

// Index for efficient queue queries
certificateApprovalQueueSchema.index({ status: 1, priority: -1, createdAt: -1 });
certificateApprovalQueueSchema.index({ institutionAddress: 1, status: 1 });
certificateApprovalQueueSchema.index({ 'certificateData.studentCode': 1 });

// Method: Add to audit trail
certificateApprovalQueueSchema.methods.addAuditEntry = function(action, performedBy, comments, newStatus) {
    const previousStatus = this.status;
    this.auditTrail.push({
        action,
        performedBy,
        performedAt: new Date(),
        comments,
        previousStatus,
        newStatus
    });
    this.status = newStatus;
    return this.save();
};

// Method: Validate certificate (IT_ADMIN)
certificateApprovalQueueSchema.methods.validate = async function(validatedBy, decision, comments, issues = []) {
    this.validationStep = {
        validatedBy,
        validatedAt: new Date(),
        status: decision, // 'APPROVED' or 'REJECTED'
        comments,
        issues
    };

    if (decision === 'REJECTED') {
        this.rejections.count++;
        this.rejections.reasons.push(...issues);
        this.rejections.lastRejectedAt = new Date();
        this.status = 'REJECTED';
    }

    return this.addAuditEntry(
        'VALIDATION_STEP_COMPLETED',
        validatedBy,
        comments,
        decision === 'APPROVED' ? this.status : 'REJECTED'
    );
};

// Method: Approve certificate (REGISTRAR)
certificateApprovalQueueSchema.methods.approve = async function(approvedBy, comments, signature) {
    this.approvalStep = {
        approvedBy,
        approvedAt: new Date(),
        status: 'APPROVED',
        comments,
        approvalSignature: signature
    };

    return this.addAuditEntry(
        'APPROVAL_STEP_COMPLETED',
        approvedBy,
        comments,
        'APPROVED'
    );
};

// Method: Reject certificate (REGISTRAR)
certificateApprovalQueueSchema.methods.reject = async function(approvedBy, rejectionReason, comments) {
    this.approvalStep = {
        approvedBy,
        approvedAt: new Date(),
        status: 'REJECTED',
        rejectionReason,
        comments
    };

    this.rejections.count++;
    this.rejections.reasons.push(rejectionReason);
    this.rejections.lastRejectedAt = new Date();

    return this.addAuditEntry(
        'APPROVAL_STEP_REJECTED',
        approvedBy,
        rejectionReason,
        'REJECTED'
    );
};

// Method: Sign-off (DEPARTMENT_ADMIN)
certificateApprovalQueueSchema.methods.signOff = async function(signedBy, comments) {
    this.signOffStep = {
        signedBy,
        signedAt: new Date(),
        status: 'APPROVED',
        comments
    };

    return this.addAuditEntry(
        'SIGN_OFF_COMPLETED',
        signedBy,
        comments,
        'APPROVED'
    );
};

// Method: Mark as issued on blockchain
certificateApprovalQueueSchema.methods.markBlockchainIssued = function(txHash, blockNumber, certificateHash) {
    this.blockchainIssuance = {
        transactionHash: txHash,
        blockNumber,
        blockchainStatus: 'CONFIRMED',
        certificateHash,
        issuedAt: new Date()
    };
    this.status = 'ISSUED';
    this.completedAt = new Date();

    return this.addAuditEntry(
        'BLOCKCHAIN_ISSUANCE',
        'system',
        `Certificate issued on blockchain: ${txHash}`,
        'ISSUED'
    );
};

// Method: Revert to previous step
certificateApprovalQueueSchema.methods.revert = function(revertedBy, reason) {
    // Set status back to PENDING so it can be resubmitted
    this.status = 'REVERTED';
    this.rejections.canResubmit = true;

    return this.addAuditEntry(
        'REVERTED',
        revertedBy,
        reason,
        'REVERTED'
    );
};

// Method: Check if all approvals complete
certificateApprovalQueueSchema.methods.isReadyForIssuance = function() {
    return (
        this.validationStep.status === 'APPROVED' &&
        this.approvalStep.status === 'APPROVED' &&
        this.signOffStep.status === 'APPROVED'
    );
};

// Method: Get approval progress
certificateApprovalQueueSchema.methods.getApprovalProgress = function() {
    let completedSteps = 0;
    const totalSteps = 3;

    if (this.validationStep.status !== 'PENDING') completedSteps++;
    if (this.approvalStep.status !== 'PENDING') completedSteps++;
    if (this.signOffStep.status !== 'PENDING') completedSteps++;

    return {
        completedSteps,
        totalSteps,
        percentage: Math.round((completedSteps / totalSteps) * 100),
        steps: {
            validation: this.validationStep.status,
            approval: this.approvalStep.status,
            signOff: this.signOffStep.status
        }
    };
};

module.exports = mongoose.model('CertificateApprovalQueue', certificateApprovalQueueSchema);