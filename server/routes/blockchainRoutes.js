const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchainService');
const crypto = require('crypto');

// ============================================================================
// 🔗 STORE CERTIFICATE HASH ON BLOCKCHAIN
// ============================================================================
router.post('/store', async (req, res) => {
    try {
        const { certificateHash, studentCode, courseName, institutionName } = req.body;

        if (!certificateHash || !studentCode || !courseName) {
            return res.status(400).json({
                success: false,
                message: 'certificateHash, studentCode, and courseName are required'
            });
        }

        console.log(`🔗 Storing on blockchain: ${courseName} for ${studentCode}`);

        const result = await blockchainService.storeCertificateHash(
            certificateHash,
            studentCode,
            courseName
        );

        // Update certificate in MongoDB if you have it
        try {
            const Certificate = require('../models/Certificate');
            await Certificate.findOneAndUpdate(
                { certificateHash },
                {
                    $set: {
                        blockchainTx: result.transactionHash,
                        blockNumber: result.blockNumber,
                        blockchainNetwork: result.network,
                        blockchainStatus: result.status,
                        storedOnChain: true,
                        chainTimestamp: new Date(result.timestamp)
                    }
                }
            );
        } catch (dbError) {
            console.log('DB update skipped:', dbError.message);
        }

        res.json({
            success: true,
            message: 'Certificate hash stored on blockchain!',
            blockchain: result
        });

    } catch (error) {
        console.error('Blockchain store error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================================
// 🔍 VERIFY CERTIFICATE ON BLOCKCHAIN
// ============================================================================
router.post('/verify', async (req, res) => {
    try {
        const { certificateHash } = req.body;

        if (!certificateHash) {
            return res.status(400).json({
                success: false,
                message: 'certificateHash is required'
            });
        }

        const result = await blockchainService.verifyCertificateHash(certificateHash);

        res.json({
            success: true,
            verified: result.exists,
            blockchain: result
        });

    } catch (error) {
        console.error('Blockchain verify error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================================
// 📊 GET BLOCKCHAIN STATS
// ============================================================================
router.get('/stats', async (req, res) => {
    try {
        const stats = await blockchainService.getBlockchainStats();
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================================
// 📋 GET TRANSACTION HISTORY
// ============================================================================
router.get('/transactions', async (req, res) => {
    try {
        res.json({
            success: true,
            transactions: blockchainService.transactionHistory.slice(-50).reverse()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================================================
// 🔗 GENERATE CERTIFICATE HASH
// ============================================================================
router.post('/generate-hash', async (req, res) => {
    try {
        const { studentCode, courseName, institutionName, grade, issueDate } = req.body;

        const dataString = `${studentCode}-${courseName}-${institutionName}-${grade}-${issueDate}-${Date.now()}`;
        const hash = crypto.createHash('sha256').update(dataString).digest('hex');

        res.json({
            success: true,
            certificateHash: hash,
            dataUsed: dataString
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;