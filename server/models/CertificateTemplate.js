// server/models/CertificateTemplate.js
const mongoose = require('mongoose');

const certificateTemplateSchema = new mongoose.Schema({
    // Template Identity
    templateId: {
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
    
    // Template Details
    templateName: {
        type: String,
        required: true
    },
    description: String,
    
    // Certificate Category
    category: {
        type: String,
        enum: ['DEGREE', 'DIPLOMA', 'INTERNSHIP', 'COURSE', 'CERTIFICATION', 'ATTENDANCE'],
        required: true,
        index: true
    },
    
    // Validity Rules (enforced by smart contract)
    validityRules: {
        issuanceType: {
            type: String,
            enum: ['PERMANENT', 'TIME_LIMITED', 'REVOCABLE'],
            default: 'TIME_LIMITED'
        },
        defaultValidityPeriodDays: {
            type: Number,
            default: 3650 // 10 years
        },
        isReissuable: {
            type: Boolean,
            default: false
        },
        maxReissuances: Number,
        canBeRenewed: {
            type: Boolean,
            default: false
        },
        canBeRevoked: {
            type: Boolean,
            default: true
        },
        revokeGracePeriodDays: Number
    },
    
    // Metadata Fields (which data goes into certificate)
    requiredFields: {
        studentName: { type: Boolean, default: true },
        studentCode: { type: Boolean, default: true },
        courseName: { type: Boolean, default: true },
        grade: { type: Boolean, default: true },
        issueDate: { type: Boolean, default: true },
        expiryDate: { type: Boolean, default: false },
        duration: { type: Boolean, default: false },
        credits: { type: Boolean, default: false },
        department: { type: Boolean, default: false },
        instructor: { type: Boolean, default: false }
    },
    
    optionalFields: {
        gpa: { type: Boolean, default: false },
        achievements: { type: Boolean, default: false },
        skills: { type: Boolean, default: false },
        references: { type: Boolean, default: false },
        certificationBody: { type: Boolean, default: false }
    },
    
    // Design/Display Template
    design: {
        backgroundColor: {
            type: String,
            default: '#FFFFFF'
        },
        borderColor: {
            type: String,
            default: '#667eea'
        },
        fontFamily: {
            type: String,
            default: 'Arial, sans-serif'
        },
        logoUrl: String,
        watermarkUrl: String,
        headerText: String,
        footerText: String,
        customCSS: String
    },
    
    // Signing/Authorization
    authorization: {
        requiresSignature: { type: Boolean, default: true },
        requiresDigitalSeal: { type: Boolean, default: true },
        authorizedSignatories: [
            {
                role: String, // 'REGISTRAR', 'PRINCIPAL', 'DEAN'
                name: String,
                title: String
            }
        ]
    },
    
    // Blockchain Configuration
    blockchainConfig: {
        useBlockchain: { type: Boolean, default: true },
        contractFunction: String, // 'issueCertificate', 'issueAndSign', etc.
        dataFields: [String], // Which fields to store on-chain
        storageMethod: {
            type: String,
            enum: ['ON_CHAIN', 'HYBRID', 'OFF_CHAIN'],
            default: 'HYBRID'
        }
    },
    
    // Audit & Tracking
    auditLogging: {
        logIssuance: { type: Boolean, default: true },
        logVerification: { type: Boolean, default: true },
        logRevocation: { type: Boolean, default: true },
        retentionDays: { type: Number, default: 2555 } // 7 years
    },
    
    // Restrictions
    restrictions: {
        issuerRole: {
            type: String,
            enum: ['ANY', 'REGISTRAR', 'DEPARTMENT_ADMIN', 'SUPER_ADMIN'],
            default: 'REGISTRAR'
        },
        minBatchSize: Number,
        maxDailyIssuances: Number,
        geographicRestrictions: [String], // e.g., ['IN', 'US']
        requiresApproval: { type: Boolean, default: true },
        approvalLevels: {
            type: Number,
            default: 2 // How many approvals needed
        }
    },
    
    // Statistics
    stats: {
        totalIssued: { type: Number, default: 0 },
        totalRevoked: { type: Number, default: 0 },
        totalVerifications: { type: Number, default: 0 },
        lastIssuedAt: Date
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    
    // Versioning
    version: { type: Number, default: 1 },
    previousVersion: String, // Reference to previous template version
    changeLog: [
        {
            version: Number,
            changedAt: Date,
            changedBy: String,
            changes: [String]
        }
    ],
    
    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: String,
    updatedAt: {
        type: Date,
        default: Date.now
    },
    updatedBy: String,
    approvedAt: Date,
    approvedBy: String
});

// Index for efficient queries
certificateTemplateSchema.index({ institutionAddress: 1, category: 1, isActive: 1 });
certificateTemplateSchema.index({ category: 1, isActive: 1 });

// Method: Validate certificate data against template
certificateTemplateSchema.methods.validateCertificateData = function(certificateData) {
    const errors = [];
    const warnings = [];

    // Check required fields
    for (const [field, required] of Object.entries(this.requiredFields)) {
        if (required && !certificateData[field]) {
            errors.push(`Required field missing: ${field}`);
        }
    }

    // Check optional fields if provided
    for (const [field, allowed] of Object.entries(this.optionalFields)) {
        if (certificateData[field] && !allowed) {
            warnings.push(`Field ${field} not allowed in this template`);
        }
    }

    // Check validity period
    if (this.validityRules.issuanceType === 'TIME_LIMITED') {
        if (!certificateData.expiryDate) {
            errors.push('Expiry date required for time-limited certificates');
        }
    }

    // Check reissuance
    if (!this.validityRules.isReissuable && certificateData.isReissuance) {
        errors.push('This certificate type cannot be reissued');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

// Method: Get certificate validity period
certificateTemplateSchema.methods.getValidityPeriod = function() {
    if (this.validityRules.issuanceType === 'PERMANENT') {
        return {
            type: 'PERMANENT',
            validityDays: null,
            message: 'Certificate is valid indefinitely'
        };
    }

    if (this.validityRules.issuanceType === 'TIME_LIMITED') {
        return {
            type: 'TIME_LIMITED',
            validityDays: this.validityRules.defaultValidityPeriodDays,
            message: `Certificate is valid for ${this.validityRules.defaultValidityPeriodDays} days`
        };
    }

    return {
        type: 'REVOCABLE',
        message: 'Certificate can be revoked at any time'
    };
};

// Method: Check if issuer can use this template
certificateTemplateSchema.methods.canIssue = function(issuerRole) {
    if (this.restrictions.issuerRole === 'ANY') {
        return true;
    }
    return this.restrictions.issuerRole === issuerRole;
};

// Method: Create new version
certificateTemplateSchema.methods.createNewVersion = function(changes, changedBy) {
    const newVersion = this.version + 1;

    this.changeLog.push({
        version: newVersion,
        changedAt: new Date(),
        changedBy,
        changes
    });

    this.version = newVersion;
    this.updatedAt = new Date();
    this.updatedBy = changedBy;

    return this.save();
};

// Method: Clone template
certificateTemplateSchema.methods.clone = async function(newName, newInstitution) {
    const clone = new this.constructor({
        ...this.toObject(),
        _id: undefined,
        templateId: undefined,
        templateName: newName,
        institutionAddress: newInstitution,
        version: 1,
        previousVersion: this.templateId,
        createdAt: new Date(),
        stats: {
            totalIssued: 0,
            totalRevoked: 0,
            totalVerifications: 0
        }
    });

    return clone.save();
};

// Method: Get full configuration for blockchain
certificateTemplateSchema.methods.getBlockchainConfig = function() {
    return {
        templateId: this.templateId,
        category: this.category,
        validityRules: this.validityRules,
        blockchainConfig: this.blockchainConfig,
        requiredFields: this.requiredFields,
        restrictions: this.restrictions,
        auditLogging: this.auditLogging
    };
};

module.exports = mongoose.model('CertificateTemplate', certificateTemplateSchema);