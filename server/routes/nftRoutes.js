const express = require('express');
const router = express.Router();
const Certificate = require('../models/Certificate');
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto'); // Built-in node module

// SIMULATED MINT ROUTE
router.post('/mint', authMiddleware, async (req, res) => {
    try {
        const { certificateHash, studentWalletAddress } = req.body;

        // 1. Find Certificate
        const certificate = await Certificate.findOne({ certificateHash });
        if (!certificate) return res.status(404).json({ success: false, error: 'Certificate not found' });

        if (certificate.nftTokenId) {
            return res.status(400).json({ success: false, error: 'Already minted' });
        }

        // 2. GENERATE FAKE BLOCKCHAIN DATA 🎲
        // Random Token ID (e.g., 1042)
        const fakeTokenId = Math.floor(Math.random() * 10000) + 1;
        
        // Random Transaction Hash (looks like 0x123...)
        const fakeTxHash = "0x" + crypto.randomBytes(32).toString('hex');
        
        // Random Block Number
        const fakeBlockNumber = 18450000 + Math.floor(Math.random() * 1000);

        // 3. Save to Database
        certificate.nftTokenId = fakeTokenId;
        certificate.nftTransactionHash = fakeTxHash;
        certificate.nftMintedAt = new Date();
        certificate.nftBlockNumber = fakeBlockNumber;
        // Save the fake wallet address passed from frontend (or generate one)
        certificate.studentWalletAddress = studentWalletAddress || "0x" + crypto.randomBytes(20).toString('hex');
        
        await certificate.save();

        // 4. Return Success
        res.json({
            success: true,
            message: 'Certificate minted as NFT successfully!',
            nft: {
                tokenId: fakeTokenId,
                transactionHash: fakeTxHash,
                blockNumber: fakeBlockNumber,
                walletAddress: certificate.studentWalletAddress
            }
        });

    } catch (error) {
        console.error('Simulated Mint Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;