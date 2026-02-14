// server/models/Certificate.js
const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
    // =========================================================================
    // PRIMARY IDENTIFIERS
    // =========================================================================
    certificateHash: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    sha256: {
        type: String,
        required: true,
        index: true
    },
    
    // =========================================================================
    // STUDENT INFORMATION
    // =========================================================================
    studentCode: {
        type: String,
        required: true,
        index: true
    },
    studentName: {
        type: String,
        required: true
    },
    studentEmail: {
        type: String,
        required: true
    },
    studentWalletAddress: {
        type: String,
        default: null
    },
    
    // =========================================================================
    // INSTITUTION INFORMATION
    // =========================================================================
    institutionAddress: {
        type: String,
        required: true,
        index: true
    },
    institutionName: {
        type: String,
        required: true
    },
    
    // =========================================================================
    // CERTIFICATE DETAILS
    // =========================================================================
    courseName: {
        type: String,
        required: true
    },
    grade: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['COURSE', 'DEGREE', 'DIPLOMA', 'PROFESSIONAL', 'ACHIEVEMENT', 'WORKSHOP', 'CERTIFICATION', 'TRAINING', 'OTHER'],
        default: 'COURSE'
    },
    
    // =========================================================================
    // DATES
    // =========================================================================
    issueDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    expiryDate: {
        type: Date,
        default: null
    },
    
    // =========================================================================
    // STATUS AND WORKFLOW
    // =========================================================================
    status: {
        type: String,
        enum: [
            'PENDING_LEVEL_1',
            'PENDING_LEVEL_2', 
            'PENDING_LEVEL_3',
            'ISSUED',
            'REJECTED',
            'REVOKED',
            'NEEDS_CORRECTION',
            'EXPIRED'
        ],
        default: 'PENDING_LEVEL_1',
        index: true
    },
    
    // =========================================================================
    // APPROVAL WORKFLOW
    // =========================================================================
    approvals: {
        level1: {
            status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
            approvedBy: String,
            date: Date,
            comments: String
        },
        level2: {
            status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
            approvedBy: String,
            date: Date,
            comments: String
        },
        level3: {
            status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
            approvedBy: String,
            date: Date,
            comments: String
        }
    },
    
    // =========================================================================
    // BLOCKCHAIN DATA
    // =========================================================================
    transactionHash: {
        type: String,
        default: null
    },
    blockNumber: {
        type: Number,
        default: null
    },
    
    // =========================================================================
    // NFT DATA
    // =========================================================================
    nftTokenId: {
        type: String,
        default: null,
        index: true
    },
    nftTransactionHash: {
        type: String,
        default: null
    },
    nftMintedAt: {
        type: Date,
        default: null
    },
    nftBlockNumber: {
        type: Number,
        default: null
    },
    nftMetadata: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    nftContractAddress: {
        type: String,
        default: null
    },
    nftTokenURI: {
        type: String,
        default: null
    },
    
    // =========================================================================
    // FILE STORAGE
    // =========================================================================
    ipfsHash: {
        type: String,
        default: null
    },
    fileData: {
        type: String, // Base64 encoded file
        default: null
    },
    fileSize: {
        type: Number,
        default: 0
    },
    cloudinaryUrl: {
        type: String,
        default: null
    },
    cloudinaryPublicId: {
        type: String,
        default: null
    },
    s3Url: {
        type: String,
        default: null
    },
    s3Key: {
        type: String,
        default: null
    },
    
    // =========================================================================
    // VERIFICATION
    // =========================================================================
    verified: {
        type: Boolean,
        default: false
    },
    verificationCount: {
        type: Number,
        default: 0
    },
    qrCodeData: {
        type: String,
        default: ''
    },
    
    // =========================================================================
    // REVOCATION
    // =========================================================================
    revokedAt: Date,
    revokedBy: String,
    revocationReason: String,
    rejectionReason: String,
    
    // =========================================================================
    // METADATA
    // =========================================================================
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // =========================================================================
    // LIFECYCLE EVENTS
    // =========================================================================
    lifecycle: [{
        event: String,
        actor: String,
        timestamp: { type: Date, default: Date.now },
        details: String
    }]

}, {
    timestamps: true
});

// ============================================================================
// INDEXES
// ============================================================================
certificateSchema.index({ studentCode: 1, status: 1 });
certificateSchema.index({ institutionAddress: 1, status: 1 });
certificateSchema.index({ createdAt: -1 });
certificateSchema.index({ nftTokenId: 1 });
certificateSchema.index({ 'nftMintedAt': -1 });

// ============================================================================
// INSTANCE METHODS
// ============================================================================

// Add lifecycle event
certificateSchema.methods.addLifecycleEvent = function(event, actor, details) {
    if (!this.lifecycle) {
        this.lifecycle = [];
    }
    this.lifecycle.push({
        event,
        actor,
        timestamp: new Date(),
        details
    });
};

// Check if certificate is minted as NFT
certificateSchema.methods.isNFTMinted = function() {
    return !!this.nftTokenId;
};

// Get NFT display data
certificateSchema.methods.getNFTData = function() {
    if (!this.nftTokenId) return null;
    
    return {
        tokenId: this.nftTokenId,
        transactionHash: this.nftTransactionHash,
        mintedAt: this.nftMintedAt,
        blockNumber: this.nftBlockNumber,
        contractAddress: this.nftContractAddress,
        tokenURI: this.nftTokenURI,
        metadata: this.nftMetadata
    };
};

// ============================================================================
// STATIC METHODS
// ============================================================================

// Find by hash
certificateSchema.statics.findByHash = function(hash) {
    return this.findOne({
        $or: [
            { certificateHash: hash },
            { sha256: hash }
        ]
    });
};

// Find by NFT token ID
certificateSchema.statics.findByNFTTokenId = function(tokenId) {
    return this.findOne({ nftTokenId: tokenId });
};

// Get all minted NFTs
certificateSchema.statics.getMintedNFTs = function(filter = {}) {
    return this.find({
        nftTokenId: { $ne: null },
        ...filter
    }).sort({ nftMintedAt: -1 });
};

// Get unminted certificates (eligible for NFT)
certificateSchema.statics.getUnmintedCertificates = function(filter = {}) {
    return this.find({
        status: 'ISSUED',
        nftTokenId: null,
        ...filter
    }).sort({ createdAt: -1 });
};

// Get certificates by student wallet
certificateSchema.statics.findByStudentWallet = function(walletAddress) {
    return this.find({ studentWalletAddress: walletAddress });
};

// ============================================================================
// PRE-SAVE HOOK
// ============================================================================
certificateSchema.pre('save', function(next) {
    // Ensure approvals object exists
    if (!this.approvals) {
        this.approvals = {
            level1: { status: 'PENDING' },
            level2: { status: 'PENDING' },
            level3: { status: 'PENDING' }
        };
    }
    
    // Add lifecycle event for NFT minting
    if (this.isModified('nftTokenId') && this.nftTokenId) {
        this.addLifecycleEvent(
            'NFT_MINTED',
            'system',
            `Certificate minted as NFT with Token ID: ${this.nftTokenId}`
        );
    }
    
    next();
});

// ============================================================================
// VIRTUALS
// ============================================================================

// Virtual for checking NFT status
certificateSchema.virtual('hasNFT').get(function() {
    return !!this.nftTokenId;
});

// Virtual for full certificate URL
certificateSchema.virtual('certificateUrl').get(function() {
    return `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${this.certificateHash}`;
});

// Virtual for NFT OpenSea URL (if on mainnet/testnet)
certificateSchema.virtual('openSeaUrl').get(function() {
    if (!this.nftTokenId || !this.nftContractAddress) return null;
    // For testnets use testnets.opensea.io
    return `https://opensea.io/assets/ethereum/${this.nftContractAddress}/${this.nftTokenId}`;
});

// Ensure virtuals are included in JSON output
certificateSchema.set('toJSON', { virtuals: true });
certificateSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Certificate', certificateSchema);