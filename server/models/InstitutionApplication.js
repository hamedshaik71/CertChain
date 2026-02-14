// server/models/InstitutionApplication.js
const mongoose = require('mongoose');

// ✅ Supported institutional email domain patterns
const ALLOWED_EMAIL_PATTERNS = [
    // Indian Universities & Colleges
    /\.edu$/i,
    /\.edu\.\w{2,}$/i,        // .edu.in, .edu.pk, .edu.au
    /\.ac\.\w{2,}$/i,         // .ac.in, .ac.uk, .ac.jp
    /\.university$/i,
    
    // Generic institutional
    /\.org$/i,
    /\.org\.\w{2,}$/i,        // .org.in, .org.uk
    /\.edu\.\w{2,}$/i,
    
    // Country-specific educational domains
    /\.ernet\.in$/i,           // Indian education/research network
    /\.res\.in$/i,             // Indian research institutes
    /\.nit\.in$/i,             // NITs
    /\.iit\.in$/i,             // IITs
    /\.iisc\.in$/i,            // IISc
    
    // Common college/university patterns
    /\.college$/i,
    /\.school$/i,
    /\.institute$/i,
    /\.academy$/i,
    
    // Allow any domain with 'edu', 'univ', 'college', 'inst' in it
    /edu/i,
    /univ/i,
    /college/i,
    /inst/i,
    /acad/i,
    /school/i,

    // Government domains
    /\.gov\.\w{2,}$/i,        // .gov.in, .gov.uk
    /\.gov$/i,

    // General domains (Gmail, Yahoo etc. for smaller institutions)
    /\.com$/i,
    /\.in$/i,
    /\.co\.\w{2,}$/i,
];

// ✅ Email validator function
const validateInstitutionalEmail = function (email) {
    if (!email) return false;

    // Basic email format check
    const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicEmailRegex.test(email)) return false;

    // ✅ Accept ALL valid email formats - no domain restriction
    // Any properly formatted email is accepted
    return true;
};

// ✅ If you want STRICT mode (only institutional emails), use this instead:
const validateStrictInstitutionalEmail = function (email) {
    if (!email) return false;

    const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicEmailRegex.test(email)) return false;

    const domain = email.split('@')[1].toLowerCase();

    // Block common personal email providers
    const blockedDomains = [
        'gmail.com',
        'yahoo.com',
        'hotmail.com',
        'outlook.com',
        'live.com',
        'aol.com',
        'protonmail.com',
        'mail.com',
        'yandex.com',
        'zoho.com',
        'icloud.com',
        'me.com',
        'msn.com',
        'rediffmail.com',
    ];

    if (blockedDomains.includes(domain)) {
        return false;
    }

    return true;
};

const institutionApplicationSchema = new mongoose.Schema({
    // Application Identity
    applicationId: {
        type: String,
        unique: true,
        required: true,
        index: true,
    },

    // Institution Details
    institutionName: {
        type: String,
        required: [true, 'Institution name is required'],
        trim: true,
    },
    walletAddress: {
        type: String,
        required: [true, 'Wallet address is required'],
        lowercase: true,
        index: true,
        validate: {
            validator: function (v) {
                return /^0x[a-fA-F0-9]{40}$/.test(v);
            },
            message: 'Invalid Ethereum wallet address',
        },
    },

    // ✅ FIXED: Contact email - accepts ALL institutional formats
    contactEmail: {
        type: String,
        required: [true, 'Contact email is required'],
        lowercase: true,
        trim: true,
        validate: {
            validator: validateInstitutionalEmail,
            message: (props) =>
                `"${props.value}" is not a valid email address. Please provide a valid email.`,
        },
    },

    // ✅ NEW: Email domain type tracking
    emailDomainType: {
        type: String,
        enum: [
            'EDU',           // .edu domains
            'AC',            // .ac.xx domains
            'GOV',           // .gov domains
            'ORG',           // .org domains
            'INSTITUTIONAL', // Custom institutional domains
            'GENERAL',       // General domains (gmail, etc.)
            'OTHER',
        ],
        default: 'OTHER',
    },

    contactPhone: {
        type: String,
        trim: true,
        validate: {
            validator: function (v) {
                if (!v) return true; // optional field
                return /^[\+]?[\d\s\-\(\)]{7,20}$/.test(v);
            },
            message: 'Invalid phone number format',
        },
    },

    website: {
        type: String,
        trim: true,
        validate: {
            validator: function (v) {
                if (!v) return true;
                return /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-\.~:\/\?#\[\]@!\$&'\(\)\*\+,;=]*)?$/.test(v);
            },
            message: 'Invalid website URL',
        },
    },

    // Registration Documents
    documents: {
        accreditationProof: {
            fileName: String,
            fileData: String,
            fileType: {
                type: String,
                enum: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
            },
            fileSize: Number, // in bytes
            uploadedAt: Date,
            verified: { type: Boolean, default: false },
            verifiedBy: String,
            verifiedAt: Date,
        },
        officialLetter: {
            fileName: String,
            fileData: String,
            fileType: {
                type: String,
                enum: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
            },
            fileSize: Number,
            uploadedAt: Date,
            verified: { type: Boolean, default: false },
            verifiedBy: String,
            verifiedAt: Date,
        },
        identityProof: {
            fileName: String,
            fileData: String,
            fileType: {
                type: String,
                enum: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
            },
            fileSize: Number,
            uploadedAt: Date,
            verified: { type: Boolean, default: false },
            verifiedBy: String,
            verifiedAt: Date,
        },
        // ✅ NEW: Additional documents support
        additionalDocuments: [
            {
                documentName: String,
                fileName: String,
                fileData: String,
                fileType: String,
                fileSize: Number,
                uploadedAt: Date,
                verified: { type: Boolean, default: false },
            },
        ],
    },

    // ✅ EXPANDED: Accreditation Details - supports multiple accreditation bodies
    accreditationDetails: {
        accreditationNumber: {
            type: String,
            trim: true,
        },
        accreditationBody: {
            type: String,
            enum: [
                // Indian Bodies
                'AICTE',
                'UGC',
                'NAAC',
                'NBA',
                'MCI',
                'BCI',
                'NCTE',
                'PCI',
                'DCI',
                'INC',
                'COA',
                'ICAR',
                
                // International Bodies
                'ABET',
                'AACSB',
                'EQUIS',
                'AMBA',
                'QAA',
                'TEQSA',
                'NZQA',
                'CHE',
                'FIBAA',
                'ACQUIN',
                
                // Regional
                'STATE_UNIVERSITY',
                'DEEMED_UNIVERSITY',
                'CENTRAL_UNIVERSITY',
                'PRIVATE_UNIVERSITY',
                'AUTONOMOUS_COLLEGE',
                
                // Generic
                'GOVERNMENT',
                'OTHER',
            ],
        },
        validFrom: Date,
        validUntil: Date,
        accreditationLevel: {
            type: String,
            enum: ['A++', 'A+', 'A', 'B++', 'B+', 'B', 'C', 'TIER_1', 'TIER_2', 'TIER_3', 'OTHER'],
        },
        // ✅ NEW: Multiple accreditations
        additionalAccreditations: [
            {
                body: String,
                number: String,
                validFrom: Date,
                validUntil: Date,
                level: String,
            },
        ],
    },

    // ✅ EXPANDED: Institution Info
    institutionInfo: {
        type: {
            type: String,
            enum: [
                'UNIVERSITY',
                'DEEMED_UNIVERSITY',
                'AUTONOMOUS_COLLEGE',
                'AFFILIATED_COLLEGE',
                'COMMUNITY_COLLEGE',
                'POLYTECHNIC',
                'IIT',
                'NIT',
                'IIIT',
                'IIM',
                'MEDICAL_COLLEGE',
                'LAW_COLLEGE',
                'ENGINEERING_COLLEGE',
                'MANAGEMENT_INSTITUTE',
                'RESEARCH_INSTITUTE',
                'TRAINING_INSTITUTE',
                'VOCATIONAL_INSTITUTE',
                'ONLINE_UNIVERSITY',
                'INTERNATIONAL',
                'OTHER',
            ],
        },
        establishedYear: {
            type: Number,
            min: 1800,
            max: new Date().getFullYear(),
        },
        numberOfStudents: {
            type: Number,
            min: 0,
        },
        numberOfFaculty: {
            type: Number,
            min: 0,
        },
        programs: [
            {
                type: String,
                trim: true,
            },
        ],
        // ✅ NEW: Location info
        location: {
            address: String,
            city: String,
            state: String,
            country: {
                type: String,
                default: 'India',
            },
            pincode: String,
        },
        // ✅ NEW: Affiliation
        affiliatedTo: String, // Parent university name
        affiliationNumber: String,
    },

    // Status Management
    status: {
        type: String,
        enum: ['PENDING', 'UNDER_REVIEW', 'DOCUMENTS_REQUESTED', 'APPROVED', 'REJECTED', 'REVOKED', 'SUSPENDED'],
        default: 'PENDING',
        index: true,
    },

    // ✅ NEW: Status history tracking
    statusHistory: [
        {
            fromStatus: String,
            toStatus: String,
            changedBy: String,
            changedAt: {
                type: Date,
                default: Date.now,
            },
            reason: String,
        },
    ],

    // Approval Workflow
    approval: {
        superAdminReview: {
            reviewedBy: String,
            reviewedAt: Date,
            status: {
                type: String,
                enum: ['PENDING', 'APPROVED', 'REJECTED'],
                default: 'PENDING',
            },
            comments: String,
        },
        legalReview: {
            reviewedBy: String,
            reviewedAt: Date,
            status: {
                type: String,
                enum: ['PENDING', 'APPROVED', 'REJECTED', 'NOT_REQUIRED'],
                default: 'PENDING',
            },
            comments: String,
        },
        technicalReview: {
            reviewedBy: String,
            reviewedAt: Date,
            status: {
                type: String,
                enum: ['PENDING', 'APPROVED', 'REJECTED', 'NOT_REQUIRED'],
                default: 'PENDING',
            },
            comments: String,
        },
        finalApproval: {
            approvedBy: String,
            approvedAt: Date,
            approvalCode: String,
        },
    },

    // Rejection Reason
    rejectionReason: String,
    rejectedBy: String,
    rejectedAt: Date,

    // On-Chain Authorization
    blockchainStatus: {
        isAuthorized: { type: Boolean, default: false },
        authorizationTxHash: String,
        authorizationBlockNumber: Number,
        authorizationDate: Date,
        smartContractAddress: String,
        revocationTxHash: String,
        revocationDate: Date,
    },

    // Timeline
    submittedAt: {
        type: Date,
        default: Date.now,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// ============================================
// INDEXES
// ============================================
institutionApplicationSchema.index({ status: 1, submittedAt: -1 });
institutionApplicationSchema.index({ walletAddress: 1, status: 1 });
institutionApplicationSchema.index({ contactEmail: 1 });
institutionApplicationSchema.index({ 'institutionInfo.location.country': 1, status: 1 });

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================
institutionApplicationSchema.pre('save', function (next) {
    this.updatedAt = new Date();

    // ✅ Auto-detect email domain type
    if (this.isModified('contactEmail') && this.contactEmail) {
        const domain = this.contactEmail.split('@')[1]?.toLowerCase() || '';

        if (/\.edu(\.|$)/.test(domain)) {
            this.emailDomainType = 'EDU';
        } else if (/\.ac\./.test(domain)) {
            this.emailDomainType = 'AC';
        } else if (/\.gov(\.|$)/.test(domain)) {
            this.emailDomainType = 'GOV';
        } else if (/\.org(\.|$)/.test(domain)) {
            this.emailDomainType = 'ORG';
        } else if (
            /college|univ|inst|acad|school|polytechnic/.test(domain)
        ) {
            this.emailDomainType = 'INSTITUTIONAL';
        } else if (
            /gmail|yahoo|hotmail|outlook|live|aol|proton/.test(domain)
        ) {
            this.emailDomainType = 'GENERAL';
        } else {
            this.emailDomainType = 'OTHER';
        }
    }

    next();
});

// ============================================
// METHODS
// ============================================

// Submit for review
institutionApplicationSchema.methods.submitForReview = function () {
    if (this.status !== 'PENDING') {
        throw new Error('Application already submitted for review');
    }
    this.statusHistory.push({
        fromStatus: this.status,
        toStatus: 'UNDER_REVIEW',
        changedAt: new Date(),
        reason: 'Application submitted for review',
    });
    this.status = 'UNDER_REVIEW';
    return this.save();
};

// Approve application
institutionApplicationSchema.methods.approve = function (superAdminWallet, approvalCode) {
    this.statusHistory.push({
        fromStatus: this.status,
        toStatus: 'APPROVED',
        changedBy: superAdminWallet,
        changedAt: new Date(),
        reason: 'Application approved',
    });
    this.status = 'APPROVED';
    this.approval.finalApproval = {
        approvedBy: superAdminWallet,
        approvedAt: new Date(),
        approvalCode,
    };
    return this.save();
};

// Reject application
institutionApplicationSchema.methods.reject = function (superAdminWallet, reason) {
    this.statusHistory.push({
        fromStatus: this.status,
        toStatus: 'REJECTED',
        changedBy: superAdminWallet,
        changedAt: new Date(),
        reason,
    });
    this.status = 'REJECTED';
    this.rejectionReason = reason;
    this.rejectedBy = superAdminWallet;
    this.rejectedAt = new Date();
    return this.save();
};

// Request additional documents
institutionApplicationSchema.methods.requestDocuments = function (reviewerWallet, comments) {
    this.statusHistory.push({
        fromStatus: this.status,
        toStatus: 'DOCUMENTS_REQUESTED',
        changedBy: reviewerWallet,
        changedAt: new Date(),
        reason: comments,
    });
    this.status = 'DOCUMENTS_REQUESTED';
    return this.save();
};

// Mark blockchain authorization
institutionApplicationSchema.methods.markBlockchainAuthorized = function (txHash, blockNumber) {
    this.blockchainStatus.isAuthorized = true;
    this.blockchainStatus.authorizationTxHash = txHash;
    this.blockchainStatus.authorizationBlockNumber = blockNumber;
    this.blockchainStatus.authorizationDate = new Date();
    return this.save();
};

// Revoke authorization
institutionApplicationSchema.methods.revokeAuthorization = function (adminWallet, reason, txHash) {
    this.statusHistory.push({
        fromStatus: this.status,
        toStatus: 'REVOKED',
        changedBy: adminWallet,
        changedAt: new Date(),
        reason,
    });
    this.status = 'REVOKED';
    this.blockchainStatus.isAuthorized = false;
    this.blockchainStatus.revocationTxHash = txHash;
    this.blockchainStatus.revocationDate = new Date();
    return this.save();
};

// Verify a specific document
institutionApplicationSchema.methods.verifyDocument = function (documentType, verifierWallet) {
    if (this.documents[documentType]) {
        this.documents[documentType].verified = true;
        this.documents[documentType].verifiedBy = verifierWallet;
        this.documents[documentType].verifiedAt = new Date();
        return this.save();
    }
    throw new Error(`Document type "${documentType}" not found`);
};

// Check if all documents verified
institutionApplicationSchema.methods.allDocumentsVerified = function () {
    return (
        this.documents.accreditationProof?.verified &&
        this.documents.officialLetter?.verified &&
        this.documents.identityProof?.verified
    );
};

// ============================================
// STATICS
// ============================================

// Find by status
institutionApplicationSchema.statics.findByStatus = function (status) {
    return this.find({ status }).sort({ submittedAt: -1 });
};

// Find by wallet address
institutionApplicationSchema.statics.findByWallet = function (walletAddress) {
    return this.find({ walletAddress: walletAddress.toLowerCase() });
};

// Get pending count
institutionApplicationSchema.statics.getPendingCount = function () {
    return this.countDocuments({
        status: { $in: ['PENDING', 'UNDER_REVIEW'] },
    });
};

// ✅ Generate unique application ID
institutionApplicationSchema.statics.generateApplicationId = async function () {
    const count = await this.countDocuments();
    const timestamp = Date.now().toString(36).toUpperCase();
    return `INST-${timestamp}-${String(count + 1).padStart(5, '0')}`;
};

module.exports = mongoose.model('InstitutionApplication', institutionApplicationSchema);