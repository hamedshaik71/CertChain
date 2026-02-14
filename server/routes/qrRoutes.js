// backend/routes/qrRoutes.js

const express = require('express');
const router = express.Router();
const qrService = require('../services/qrService');
const Certificate = require('../models/Certificate');

// Generate Smart QR for certificate
router.get('/generate/:hash', async (req, res) => {
    try {
        const { hash } = req.params;
        const { style, width } = req.query;

        // Verify certificate exists
        const certificate = await Certificate.findOne({
            $or: [
                { certificateHash: hash },
                { sha256: hash }
            ]
        });

        if (!certificate) {
            return res.status(404).json({
                success: false,
                error: 'Certificate not found'
            });
        }

        // Generate QR
        const result = await qrService.generateSmartQR(hash, {
            width: parseInt(width) || 300
        });

        if (result.success) {
            res.json({
                success: true,
                certificate: {
                    studentName: certificate.studentName,
                    courseName: certificate.courseName,
                    grade: certificate.grade
                },
                qr: {
                    dataURL: result.qrCodeDataURL,
                    actions: result.actions
                }
            });
        } else {
            res.status(500).json(result);
        }

    } catch (error) {
        console.error('QR generate error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get QR code as image
router.get('/image/:hash', async (req, res) => {
    try {
        const { hash } = req.params;
        const { style, width } = req.query;

        const result = await qrService.generateSmartQR(hash, {
            width: parseInt(width) || 300
        });

        if (result.success) {
            res.set('Content-Type', 'image/png');
            res.send(result.qrCodeBuffer);
        } else {
            res.status(500).json(result);
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get all action URLs for a certificate
router.get('/actions/:hash', async (req, res) => {
    try {
        const { hash } = req.params;
        const actions = qrService.generateActionURLs(hash);
        
        res.json({
            success: true,
            actions
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;