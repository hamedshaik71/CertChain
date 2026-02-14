// server/routes/publicRoutes.js
const express = require('express');
const router = express.Router();
const Certificate = require('../models/Certificate');
const crypto = require('crypto');

// ✅ ROBUST PUBLIC VERIFICATION ENDPOINT
router.get('/verify/:hash', async (req, res) => {
    try {
        let { hash } = req.params;
        hash = hash.trim(); // Remove accidental spaces

        console.log(`🔍 Public verification request for: ${hash}`);

        // 1. CONSTRUCT SAFE QUERY
        // We use a safe query array to prevent MongoDB CastErrors (The 500 Error Source)
        const queryConditions = [
            { certificateHash: hash }, // Exact match
            { certificateHash: { $regex: new RegExp(`^${hash}$`, 'i') } }, // Case insensitive CERT- match
            { sha256: hash },
            { transactionHash: hash }
        ];

        // 🛑 CRITICAL FIX: Only search _id if the input looks like a MongoDB ID (24 hex chars)
        // If we search _id with "CERT-...", Mongoose throws a 500 Error.
        if (hash.match(/^[0-9a-fA-F]{24}$/)) {
            queryConditions.push({ _id: hash });
        }

        // 2. EXECUTE QUERY
        const certificate = await Certificate.findOne({ $or: queryConditions });

        if (!certificate) {
            console.log("❌ Certificate not found in DB");
            return res.status(404).json({
                success: false,
                verified: false,
                isValid: false,
                tamperedDetected: true,
                message: 'No certificate found with this ID or Hash'
            });
        }

        console.log(`✅ Found: ${certificate.certificateHash}`);

        // 3. TAMPER DETECTION (Security Check)
        let tamperedDetected = false;
        
        // If file data exists, verify its integrity matches the stored hash
        if (certificate.fileData) {
            try {
                const fileBuffer = Buffer.from(certificate.fileData, 'base64');
                const recalculatedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
                
                if (recalculatedHash !== certificate.sha256) {
                    console.warn("🚨 TAMPER WARNING: Database file does not match stored hash!");
                    tamperedDetected = true;
                }
            } catch (err) {
                console.error("Hash calculation error:", err);
            }
        }

        // 4. CHECK VALIDITY STATUS
        const isValid = (certificate.status === 'ISSUED' || certificate.status === 'ACTIVE') && 
                        !tamperedDetected;

        // 5. UPDATE STATS
        // Increment verification count silently (don't fail if this errors)
        try {
            certificate.verificationCount = (certificate.verificationCount || 0) + 1;
            await certificate.save();
        } catch (e) { console.log("Stats update skipped"); }

        // 6. RETURN FORMATTED RESPONSE
        res.json({
            success: true,
            isValid: isValid, // Frontend uses this
            verified: isValid, // Legacy support
            blockchainVerified: !!certificate.transactionHash,
            hashMatch: !tamperedDetected,
            tamperedDetected: tamperedDetected,
            certificate: {
                id: certificate._id,
                studentName: certificate.studentName,
                studentEmail: certificate.studentEmail,
                studentCode: certificate.studentCode,
                courseName: certificate.courseName,
                institutionName: certificate.institutionName,
                institutionAddress: certificate.institutionAddress,
                issueDate: certificate.issueDate,
                expiryDate: certificate.expiryDate,
                grade: certificate.grade,
                
                // IDs
                certificateHash: certificate.certificateHash, // The CERT- ID
                transactionHash: certificate.transactionHash,
                sha256Hash: certificate.sha256,
                
                // Status
                status: certificate.status,
                category: certificate.category,
                verificationCount: certificate.verificationCount,
                
                // Data for Download
                fileData: certificate.fileData
            }
        });

    } catch (error) {
        console.error('💥 Verification Fatal Error:', error);
        res.status(500).json({
            success: false,
            verified: false,
            error: 'VERIFICATION_ERROR',
            message: 'Internal Server Error during verification'
        });
    }
});

// ✅ LOGGING ENDPOINT (Frontend calls this to log viewing history)
router.post('/log-verification', async (req, res) => {
    try {
        const { certificateId, viewerInfo, timestamp } = req.body;
        // You can save this to a VerificationLog model if you have one
        // console.log(`📝 Logged view for ${certificateId}`);
        res.json({ success: true });
    } catch (error) {
        // Don't crash for logging
        res.status(200).json({ success: false }); 
    }
});

module.exports = router;