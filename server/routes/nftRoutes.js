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

// ✅ ADD THIS: GET NFT BY TOKEN ID (for NFTViewer component)
router.get('/:tokenId', async (req, res) => {
    try {
        const { tokenId } = req.params;
        
        // Find certificate with this NFT token ID
        const certificate = await Certificate.findOne({ 
            nftTokenId: parseInt(tokenId) 
        });

        if (certificate) {
            // Return real certificate data as NFT
            return res.json({
                success: true,
                nft: {
                    tokenId: certificate.nftTokenId,
                    contractAddress: "0x" + crypto.randomBytes(20).toString('hex'), // Fake contract
                    network: 'Ethereum Mainnet (Simulated)',
                    standard: 'ERC-721',
                    transactionHash: certificate.nftTransactionHash,
                    blockNumber: certificate.nftBlockNumber,
                    walletAddress: certificate.studentWalletAddress,
                    mintedAt: certificate.nftMintedAt,
                    metadata: {
                        name: `${certificate.courseName} Certificate NFT`,
                        description: `Certificate awarded to ${certificate.studentName} for completing ${certificate.courseName} with grade ${certificate.grade}`,
                        image: `https://via.placeholder.com/500x500/6366f1/ffffff?text=${encodeURIComponent(certificate.courseName)}`,
                        attributes: [
                            { trait_type: "Student Name", value: certificate.studentName },
                            { trait_type: "Course", value: certificate.courseName },
                            { trait_type: "Grade", value: certificate.grade },
                            { trait_type: "Institution", value: certificate.institutionName },
                            { trait_type: "Issue Date", value: new Date(certificate.issueDate).toLocaleDateString() }
                        ]
                    },
                    certificate: {
                        studentName: certificate.studentName,
                        courseName: certificate.courseName,
                        grade: certificate.grade,
                        institutionName: certificate.institutionName,
                        issueDate: certificate.issueDate,
                        certificateHash: certificate.certificateHash
                    }
                }
            });
        } else {
            // Return simulated NFT data if not found in DB
            return res.json({
                success: true,
                nft: {
                    tokenId: tokenId,
                    contractAddress: "0x" + crypto.randomBytes(20).toString('hex'),
                    network: 'Ethereum Mainnet (Simulated)',
                    standard: 'ERC-721',
                    transactionHash: "0x" + crypto.randomBytes(32).toString('hex'),
                    blockNumber: 18450000 + Math.floor(Math.random() * 1000),
                    walletAddress: "0x" + crypto.randomBytes(20).toString('hex'),
                    mintedAt: new Date(),
                    metadata: {
                        name: `Certificate NFT #${tokenId}`,
                        description: 'Blockchain-verified educational certificate (Simulated)',
                        image: `https://via.placeholder.com/500x500/6366f1/ffffff?text=NFT+${tokenId}`,
                        attributes: [
                            { trait_type: "Token ID", value: tokenId },
                            { trait_type: "Type", value: "Certificate" },
                            { trait_type: "Status", value: "Simulated" }
                        ]
                    }
                }
            });
        }
    } catch (error) {
        console.error('NFT fetch error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ✅ ADD THIS: VERIFY NFT CERTIFICATE (Optional endpoint)
router.post('/verify', async (req, res) => {
    try {
        const { tokenId, certificateHash } = req.body;
        
        let certificate;
        if (tokenId) {
            certificate = await Certificate.findOne({ nftTokenId: parseInt(tokenId) });
        } else if (certificateHash) {
            certificate = await Certificate.findOne({ certificateHash });
        }

        if (certificate && certificate.nftTokenId) {
            res.json({
                success: true,
                verified: true,
                message: 'NFT Certificate verified successfully',
                nft: {
                    tokenId: certificate.nftTokenId,
                    transactionHash: certificate.nftTransactionHash,
                    blockNumber: certificate.nftBlockNumber,
                    walletAddress: certificate.studentWalletAddress,
                    mintedAt: certificate.nftMintedAt
                }
            });
        } else {
            res.json({
                success: false,
                verified: false,
                message: 'NFT not found or not minted yet'
            });
        }
    } catch (error) {
        console.error('NFT verify error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ✅ ADD THIS: GET CONTRACT INFO (Simulated)
router.get('/contract/info', async (req, res) => {
    try {
        res.json({
            success: true,
            contract: {
                address: "0x" + crypto.randomBytes(20).toString('hex'),
                network: 'Ethereum Mainnet (Simulated)',
                name: 'CertChain NFT Contract',
                symbol: 'CERT',
                totalSupply: Math.floor(Math.random() * 1000) + 100,
                initialized: true,
                type: 'SIMULATED'
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;