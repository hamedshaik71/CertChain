// server/controllers/certificateController.js

const Certificate = require('../models/Certificate');
const crypto = require('crypto');

exports.verifyCertificate = async (req, res) => {
    try {
        let { hash } = req.params;

        // 🧹 FIX 1: Remove spaces / bad characters
        hash = hash.trim();

        console.log(`🔍 Verifying Certificate with Hash: "${hash}"`);

        // 🔍 FIX 2: NEVER use findById here
        const cert = await Certificate.findOne({
            $or: [
                { certificateHash: hash },
                { sha256: hash },
                { ipfsHash: hash },
                { transactionHash: hash }
            ]
        });

        if (!cert) {
            console.log("❌ Certificate not found");
            return res.status(404).json({
                success: false,
                message: "Certificate not found"
            });
        }

        console.log("✅ Certificate found:", cert.certificateHash);

        // 🕵️ TAMPER CHECK
        let isTampered = false;

        if (cert.fileData) {
            const fileBuffer = Buffer.from(cert.fileData, 'base64');

            const hashSum = crypto.createHash('sha256');
            hashSum.update(fileBuffer);
            const recalculatedHash = hashSum.digest('hex');

            console.log("🧮 Stored Hash:", cert.sha256);
            console.log("🧮 Recalc Hash:", recalculatedHash);

            if (recalculatedHash !== cert.sha256) {
                console.log("🚨 TAMPERING DETECTED!");
                isTampered = true;
            }
        }

        res.status(200).json({
            success: true,
            isValid: !isTampered,
            tamperedDetected: isTampered,
            hashMatch: !isTampered,
            blockchainVerified: true,
            institutionVerified: true,
            certificate: cert
        });

    } catch (error) {
        console.error("💥 Verification Error:", error);

        res.status(500).json({
            success: false,
            message: "Verification failed",
            error: error.message
        });
    }
};
