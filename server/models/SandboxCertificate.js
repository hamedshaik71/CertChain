// server/models/SandboxCertificate.js
const mongoose = require('mongoose');

const sandboxCertificateSchema = new mongoose.Schema({
    // Sandbox Identity
    sandboxCertId: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    
    // Mark as sandbox
    isSandbox: {
        type: Boolean,
        default: true,
        index: true
    },
    
    // Institution (In testing)
    institutionAddress: {
        type: String,
        required: true,
        ref: 'Institution',
        index: true
    },
    institutionCode: String,
    institutionName: String,
    
    // Test Data
    testData: {
        studentCode: String,
        studentName: String,
        studentEmail: String,
        courseName: String,
        grade: String,
        issueDate: Date,
        expiryDate: Date,
        department: String,
        instructor: String
    },
    
    // Sandbox Status
    status: {
        type: String,
        enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED', 'FAILED'],
        default: 'ACTIVE',
        index: true
    },
    
    // Testing Mode
    testMode: {
        enabled: { type: Boolean, default: true },
        isPublic: { type: Boolean, default: false }, // Not visible in public verifications
        canBeEdited: { type: Boolean, default: true },
        autoExpires: { type: Boolean, default: true },
        expiresAfterDays: { type: Number, default: 30 }
    },
    
    // Certificate Details (same as real but marked as test)
    certificateHash: {
        type: String,
        unique: true,
        required: true
    },
    sha256: String,
    
    // Test Configuration
    testConfig: {
        purposeOfTest: {
            type: String,
            enum: ['TEMPLATE_TESTING', 'WORKFLOW_TESTING', 'API_TESTING', 'UI_TESTING', 'OTHER'],
            default: 'TEMPLATE_TESTING'
        },
        testDescription: String,
        expectedOutcome: String,
        actualOutcome: String,
        testResult: {
            type: String,
            enum: ['PENDING', 'PASSED', 'FAILED', 'PARTIAL'],
            default: 'PENDING'
        }
    },
    
    // Blockchain (optional for sandbox)
    blockchain: {
        isOnChain: { type: Boolean, default: false },
        transactionHash: String,
        blockNumber: Number,
        // Sandbox certificates use testnet, not mainnet
        network: {
            type: String,
            enum: ['GANACHE_TEST', 'SEPOLIA_TESTNET', 'LOCAL_HARDHAT'],
            default: 'GANACHE_TEST'
        }
    },
    
    // Test Metrics
    testMetrics: {
        issueTimeMs: Number,
        verificationTimeMs: Number,
        blockchainConfirmationTimeMs: Number,
        fileUploadTimeMs: Number,
        totalTestDurationMs: Number,
        gasUsedEstimate: String
    },
    
    // Verification Attempts (for testing)
    verificationAttempts: [
        {
            attemptedBy: String,
            attemptedAt: Date,
            result: String, // 'SUCCESS', 'FAILED', 'PARTIAL'
            duration: Number,
            response: mongoose.Schema.Types.Mixed
        }
    ],
    
    // Test Notes & Issues
    testLog: [
        {
            timestamp: Date,
            level: { type: String, enum: ['INFO', 'WARNING', 'ERROR'], default: 'INFO' },
            message: String,
            details: String
        }
    ],
    
    // Approval for Production Migration
    productionMigration: {
        readyForProduction: { type: Boolean, default: false },
        approvedBy: String,
        approvedAt: Date,
        productionCertificateHash: String, // Reference to real certificate after migration
        migrationStatus: {
            type: String,
            enum: ['NOT_MIGRATED', 'PENDING', 'MIGRATED', 'FAILED'],
            default: 'NOT_MIGRATED'
        },
        migrationNotes: String
    },
    
    // Auto Cleanup
    autoCleanup: {
        enabled: { type: Boolean, default: true },
        cleanupDate: Date,
        cleanupReason: String
    },
    
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

// Index for sandbox queries
sandboxCertificateSchema.index({ isSandbox: 1, institutionAddress: 1 });
sandboxCertificateSchema.index({ status: 1, expiresAt: 1 });

// Method: Log test activity
sandboxCertificateSchema.methods.logTestActivity = function(level, message, details) {
    this.testLog.push({
        timestamp: new Date(),
        level,
        message,
        details
    });
    return this.save();
};

// Method: Record verification attempt
sandboxCertificateSchema.methods.recordVerificationAttempt = function(attemptedBy, result, duration, response) {
    this.verificationAttempts.push({
        attemptedBy,
        attemptedAt: new Date(),
        result,
        duration,
        response
    });
    return this.save();
};

// Method: Complete test
sandboxCertificateSchema.methods.completeTest = function(result, outcome) {
    this.testConfig.testResult = result;
    this.testConfig.actualOutcome = outcome;
    this.status = result === 'PASSED' ? 'COMPLETED' : 'FAILED';
    this.updatedAt = new Date();
    return this.save();
};

// Method: Mark ready for production
sandboxCertificateSchema.methods.markReadyForProduction = function(approvedBy) {
    this.productionMigration.readyForProduction = true;
    this.productionMigration.approvedBy = approvedBy;
    this.productionMigration.approvedAt = new Date();
    return this.save();
};

// Method: Migrate to production
sandboxCertificateSchema.methods.migrateToProduction = function(productionCertificateHash) {
    this.productionMigration.productionCertificateHash = productionCertificateHash;
    this.productionMigration.migrationStatus = 'MIGRATED';
    this.status = 'ARCHIVED';
    return this.save();
};

// Method: Get test summary
sandboxCertificateSchema.methods.getTestSummary = function() {
    return {
        testId: this.sandboxCertId,
        purpose: this.testConfig.purposeOfTest,
        result: this.testConfig.testResult,
        duration: this.testMetrics.totalTestDurationMs,
        verifications: this.verificationAttempts.length,
        successfulVerifications: this.verificationAttempts.filter(v => v.result === 'SUCCESS').length,
        logs: this.testLog,
        readyForProduction: this.productionMigration.readyForProduction,
        migrationStatus: this.productionMigration.migrationStatus
    };
};

module.exports = mongoose.model('SandboxCertificate', sandboxCertificateSchema);

// ============ SANDBOX SERVICE ============

// server/services/sandboxService.js
const SandboxCertificate = require('../models/SandboxCertificate');
const crypto = require('crypto');

class SandboxService {
    /**
     * Create sandbox certificate for testing
     */
    static async createSandboxCertificate(institutionData, testConfig) {
        try {
            const sandboxCertId = `SANDBOX_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
            const certificateHash = crypto
                .createHash('sha256')
                .update(JSON.stringify(testConfig))
                .digest('hex');

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // Expires in 30 days

            const sandboxCert = new SandboxCertificate({
                sandboxCertId,
                certificateHash,
                sha256: certificateHash,
                institutionAddress: institutionData.walletAddress,
                institutionCode: institutionData.institutionCode,
                institutionName: institutionData.name,
                testData: testConfig.data,
                testConfig: testConfig.config,
                expiresAt,
                blockchain: {
                    network: testConfig.network || 'GANACHE_TEST'
                }
            });

            await sandboxCert.save();
            await sandboxCert.logTestActivity(
                'INFO',
                'Sandbox certificate created',
                `ID: ${sandboxCertId}`
            );

            return {
                success: true,
                sandboxCert,
                message: 'Sandbox certificate created for testing'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Simulate certificate issuance in sandbox
     */
    static async simulateIssuance(sandboxCertId, config) {
        try {
            const sandboxCert = await SandboxCertificate.findOne({ sandboxCertId });
            if (!sandboxCert) {
                return { success: false, error: 'Sandbox certificate not found' };
            }

            const startTime = Date.now();

            // Simulate blockchain write
            if (config.includeBlockchain) {
                const bcStartTime = Date.now();
                // Simulate blockchain delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                sandboxCert.blockchain.isOnChain = true;
                sandboxCert.blockchain.transactionHash = `0x${crypto.randomBytes(32).toString('hex')}`;
                sandboxCert.blockchain.blockNumber = Math.floor(Math.random() * 1000000);
                sandboxCert.testMetrics.blockchainConfirmationTimeMs = Date.now() - bcStartTime;

                await sandboxCert.logTestActivity(
                    'INFO',
                    'Blockchain simulation',
                    `TX: ${sandboxCert.blockchain.transactionHash}`
                );
            }

            sandboxCert.testMetrics.issueTimeMs = Date.now() - startTime;
            sandboxCert.testConfig.testResult = 'PASSED';
            sandboxCert.status = 'COMPLETED';

            await sandboxCert.save();

            return {
                success: true,
                sandboxCert,
                summary: sandboxCert.getTestSummary()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Cleanup expired sandbox certificates
     */
    static async cleanupExpiredSandboxCerts() {
        try {
            const result = await SandboxCertificate.deleteMany({
                expiresAt: { $lt: new Date() },
                autoCleanup: { enabled: true }
            });

            return {
                success: true,
                deletedCount: result.deletedCount
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get all sandbox tests for institution
     */
    static async getInstitutionSandboxTests(institutionAddress) {
        try {
            const tests = await SandboxCertificate.find({
                institutionAddress,
                status: { $ne: 'ARCHIVED' }
            }).sort({ createdAt: -1 });

            return {
                success: true,
                tests,
                count: tests.length,
                summary: {
                    active: tests.filter(t => t.status === 'ACTIVE').length,
                    completed: tests.filter(t => t.status === 'COMPLETED').length,
                    failed: tests.filter(t => t.status === 'FAILED').length
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = SandboxService;