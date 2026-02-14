const express = require('express');
const router = express.Router();
const Certificate = require('../models/Certificate');
const crypto = require('crypto');

// 1. Import Controllers
const adminController = require('../controllers/adminController');
const approvalController = require('../controllers/approvalController'); 
const authController = require('../controllers/authController');

// 👇 IMPORT THE LEDGER WRITER
const { addToLedger } = require('../utils/ledgerWriter');

// 2. Import Middleware
const { authMiddleware, adminMiddleware } = require('../middleware/auth'); 

// ==========================================
// 🔓 PUBLIC ROUTES
// ==========================================
router.post('/login', authController.login);

// ==========================================
// 🔒 PROTECTED ROUTES (Login + Admin Role)
// ==========================================

// --- 📊 Dashboard & Stats ---
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
    if (adminController.getDashboardStats) {
        return adminController.getDashboardStats(req, res);
    }
    return res.json({ success: true, message: "Stats endpoint active" });
});

// --- 🏫 Institution Management ---
router.get('/institution-applications', authMiddleware, adminMiddleware, adminController.getPendingApplications);
router.post('/institution-applications/:id/approve', authMiddleware, adminMiddleware, adminController.approveApplication);
router.post('/institution-applications/:id/reject', authMiddleware, adminMiddleware, adminController.rejectApplication);
router.post('/institutions/:id/lock', authMiddleware, adminMiddleware, adminController.lockInstitution);

router.get('/institutions', authMiddleware, adminMiddleware, async (req, res) => {
    if (adminController.getAllInstitutions) {
        return adminController.getAllInstitutions(req, res);
    }
    const Institution = require('../models/Institution');
    const institutions = await Institution.find().select('-passwordHash');
    res.json({ success: true, institutions });
});

// ==========================================
// 📜 CERTIFICATE APPROVAL WORKFLOW (3-LEVEL)
// ==========================================

// 1. Get Pending Certificates (Generic Fetch)
// Fetches anything that needs approval
router.get('/pending-approvals', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        // Fetch any certificate that is still in PENDING status
        const certificates = await Certificate.find({
            status: { $regex: 'PENDING' }
        }).sort({ createdAt: -1 });
        
        res.json({ success: true, count: certificates.length, certificates });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. PROCESS CERTIFICATE (Legacy Endpoint)
if (approvalController && approvalController.processCertificate) {
    router.post('/process-certificate', authMiddleware, adminMiddleware, approvalController.processCertificate);
}

// 3. ✅ MAIN APPROVE ROUTE (Handles Level 1, 2, and 3 + JSON Write)
router.post('/approve/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { level, remarks } = req.body; // Expects level: "1", "2", or "3"
        const adminEmail = req.user.email;

        console.log(`👨‍⚖️ Admin Approval Request: Level ${level} for Cert ${id}`);

        const certificate = await Certificate.findById(id);
        if (!certificate) return res.status(404).json({ success: false, message: "Certificate not found" });

        const approvalLevel = String(level);

        // --- LEVEL 1 ---
        if (approvalLevel === "1") {
            if (certificate.approvals.level1.status === "APPROVED") {
                return res.status(400).json({ success: false, message: "Level 1 already approved." });
            }
            certificate.approvals.level1 = { status: "APPROVED", approver: adminEmail, date: new Date(), remarks };
            certificate.status = "PENDING_LEVEL_2";
            certificate.lifecycle.push({ event: 'APPROVED_LEVEL_1', actor: adminEmail, timestamp: new Date(), details: remarks });
        } 
        
        // --- LEVEL 2 ---
        else if (approvalLevel === "2") {
            if (certificate.approvals.level1.status !== "APPROVED") {
                return res.status(400).json({ success: false, message: "Level 1 approval required first." });
            }
            certificate.approvals.level2 = { status: "APPROVED", approver: adminEmail, date: new Date(), remarks };
            certificate.status = "PENDING_LEVEL_3";
            certificate.lifecycle.push({ event: 'APPROVED_LEVEL_2', actor: adminEmail, timestamp: new Date(), details: remarks });
        } 
        
        // --- LEVEL 3 (FINAL) ---
        else if (approvalLevel === "3") {
            if (certificate.approvals.level2.status !== "APPROVED") {
                return res.status(400).json({ success: false, message: "Level 2 approval required first." });
            }

            // Update DB
            certificate.approvals.level3 = { status: "APPROVED", approver: adminEmail, date: new Date(), remarks };
            certificate.status = "ISSUED"; // Final Status
            
            // Generate Blockchain Data (Simulated)
            certificate.transactionHash = "0x" + crypto.randomBytes(32).toString('hex');
            certificate.blockNumber = Math.floor(Math.random() * 1000000) + 123456;

            certificate.lifecycle.push({ event: 'ISSUED', actor: adminEmail, timestamp: new Date(), details: "Final Approval & Blockchain Write" });

            // 🚀 WRITE TO JSON LEDGER
            addToLedger(certificate);
            console.log(`✅ Certificate ${certificate.certificateHash} finalized and written to Ledger.`);
        } 
        else {
            // Fallback for generic "approve" calls (Treat as final if no level specified)
            // Useful if your frontend just sends a generic approval signal
            if (!level) {
                certificate.status = "ISSUED";
                certificate.transactionHash = "0x" + crypto.randomBytes(32).toString('hex');
                addToLedger(certificate);
            } else {
                return res.status(400).json({ success: false, message: "Invalid Level" });
            }
        }

        await certificate.save();

        res.json({
            success: true,
            message: approvalLevel === "3" ? "Certificate Fully Issued & On-Chain!" : `Level ${approvalLevel} Approved`,
            certificate
        });

    } catch (error) {
        console.error("Approval Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Reject Certificate
router.post('/reject/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminEmail = req.user.email;

        const certificate = await Certificate.findById(id);
        if (!certificate) return res.status(404).json({ success: false, message: "Not Found" });

        certificate.status = "REJECTED";
        certificate.lifecycle.push({
            event: 'REJECTED',
            actor: adminEmail,
            timestamp: new Date(),
            details: reason || "Rejected by Admin"
        });

        await certificate.save();
        res.json({ success: true, message: "Certificate Rejected" });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;