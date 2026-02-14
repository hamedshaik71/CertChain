// server/routes/features.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const AccessCode = require('../models/AccessCode');
const Admin = require('../models/Admin');
const InstitutionApplication = require('../models/InstitutionApplication');
const CertificateApprovalQueue = require('../models/CertificateApprovalQueue');
const CertificateRevocation = require('../models/CertificateRevocation');
const CertificateTemplate = require('../models/CertificateTemplate');
const SandboxService = require('../services/sandboxService');
const DualVerificationService = require('../services/dualVerificationService');
const VerificationRequestService = require('../services/verificationRequestService');
const AdminRiskScoringService = require('../services/adminRiskScoringService');
const InternalVerificationService = require('../services/internalVerificationService');

// Middleware functions
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            throw new Error('No token provided');
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate' });
    }
};

const roleCheck = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.adminLevel)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        next();
    };
};

// ============ FEATURE 1: ACCESS CODE MANAGEMENT ============
router.post('/access-code/generate', authenticate, async (req, res) => {
    try {
        const { role, institutionCode } = req.body;
        
        const result = await DualVerificationService.setupDualVerification(
            req.user.institutionAddress,
            req.user.walletAddress,
            role
        );
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/access-codes/:institutionAddress', authenticate, async (req, res) => {
    try {
        const codes = await DualVerificationService.getInstitutionAccessCodes(
            req.params.institutionAddress
        );
        res.json({ success: true, codes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ FEATURE 4: DUAL VERIFICATION LOGIN ============
router.post('/login/dual-verify', async (req, res) => {
    try {
        const { walletAddress, institutionCode, accessCode } = req.body;
        
        const result = await DualVerificationService.verifyAdminAccess(
            walletAddress,
            institutionCode,
            accessCode
        );
        
        if (result.success) {
            const token = jwt.sign(
                result.admin,
                process.env.JWT_SECRET,
                { expiresIn: '30d' }
            );
            res.json({ success: true, token, admin: result.admin });
        } else {
            res.status(401).json(result);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ FEATURE 3: INSTITUTION APPLICATION ============
router.post('/institution/apply', async (req, res) => {
    try {
        const {
            institutionName,
            walletAddress,
            contactEmail,
            accreditationDetails
        } = req.body;
        
        const app = new InstitutionApplication({
            applicationId: `APP_${Date.now()}`,
            institutionName,
            walletAddress,
            contactEmail,
            accreditationDetails
        });
        
        await app.save();
        res.json({ success: true, applicationId: app.applicationId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/applications/pending', authenticate, roleCheck(['SUPER_ADMIN']), async (req, res) => {
    try {
        const apps = await InstitutionApplication.find({
            status: 'UNDER_REVIEW'
        }).sort({ submittedAt: -1 });
        
        res.json({ success: true, applications: apps });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/application/:appId/approve', authenticate, roleCheck(['SUPER_ADMIN']), async (req, res) => {
    try {
        const app = await InstitutionApplication.findOne({
            applicationId: req.params.appId
        });
        
        const approvalCode = `${Date.now().toString(36).toUpperCase()}`;
        await app.approve(req.user.walletAddress, approvalCode);
        
        res.json({ success: true, approvalCode });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ FEATURE 6: CERTIFICATE APPROVAL QUEUE ============
router.post('/certificate/submit-approval', authenticate, roleCheck(['DEPARTMENT_ADMIN']), async (req, res) => {
    try {
        const { certificateData, attachmentFile } = req.body;
        
        const queue = new CertificateApprovalQueue({
            queueId: `QUE_${Date.now()}`,
            certificateData,
            submittedBy: {
                walletAddress: req.user.walletAddress,
                email: req.user.email,
                fullName: req.user.fullName,
                adminLevel: req.user.adminLevel
            },
            attachmentFile,
            institutionAddress: req.user.institutionAddress
        });
        
        await queue.save();
        res.json({ success: true, queueId: queue.queueId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/approval-queue', authenticate, roleCheck(['REGISTRAR', 'DEPARTMENT_ADMIN']), async (req, res) => {
    try {
        const queue = await CertificateApprovalQueue.find({
            institutionAddress: req.user.institutionAddress,
            status: { $in: ['PENDING', 'APPROVED'] }
        }).sort({ createdAt: -1 });
        
        res.json({ success: true, queue });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/approval-queue/:queueId/validate', authenticate, roleCheck(['IT_ADMIN']), async (req, res) => {
    try {
        const { decision, comments, issues } = req.body;
        const queue = await CertificateApprovalQueue.findOne({
            queueId: req.params.queueId
        });
        
        await queue.validate(req.user.walletAddress, decision, comments, issues);
        res.json({ success: true, queue });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ FEATURE 7: INTERNAL VERIFICATION ============
router.post('/certificate/verify-before-blockchain', authenticate, async (req, res) => {
    try {
        const { certificateData } = req.body;
        
        const verification = await InternalVerificationService.verifyBeforeBlockchainWrite(
            certificateData
        );
        
        if (!verification.isValid) {
            return res.status(400).json({
                success: false,
                errors: verification.errors,
                warnings: verification.warnings
            });
        }
        
        res.json({
            success: true,
            verified: true,
            recommendations: verification.recommendations,
            metadata: verification.metadata
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ FEATURE 8: REVOCATION WITH AUTHORITY ============
router.post('/certificate/revoke-with-authority', authenticate, roleCheck(['REGISTRAR']), async (req, res) => {
    try {
        const {
            certificateHash,
            reason,
            description,
            evidence
        } = req.body;
        
        const revocation = new CertificateRevocation({
            revocationId: `REV_${Date.now()}`,
            certificateHash,
            reason,
            description,
            evidence,
            authority: {
                walletAddress: req.user.walletAddress,
                email: req.user.email,
                fullName: req.user.fullName,
                adminLevel: req.user.adminLevel
            }
        });
        
        await revocation.save();
        res.json({ success: true, revocationId: revocation.revocationId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ FEATURE 9: CERTIFICATE TEMPLATES ============
router.post('/template/create', authenticate, roleCheck(['DEPARTMENT_ADMIN']), async (req, res) => {
    try {
        const {
            templateName,
            category,
            validityRules,
            requiredFields,
            design
        } = req.body;
        
        const template = new CertificateTemplate({
            templateId: `TPL_${Date.now()}`,
            templateName,
            category,
            validityRules,
            requiredFields,
            design,
            institutionAddress: req.user.institutionAddress,
            createdBy: req.user.walletAddress
        });
        
        await template.save();
        res.json({ success: true, templateId: template.templateId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/templates/:institutionAddress', async (req, res) => {
    try {
        const templates = await CertificateTemplate.find({
            institutionAddress: req.params.institutionAddress,
            isActive: true
        });
        
        res.json({ success: true, templates });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ FEATURE 10: SANDBOX MODE ============
router.post('/sandbox/create', authenticate, roleCheck(['DEPARTMENT_ADMIN']), async (req, res) => {
    try {
        const result = await SandboxService.createSandboxCertificate(
            {
                walletAddress: req.user.institutionAddress,
                institutionCode: req.user.institutionCode,
                name: req.user.institutionName
            },
            req.body
        );
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/sandbox/tests/:institutionAddress', authenticate, async (req, res) => {
    try {
        const result = await SandboxService.getInstitutionSandboxTests(
            req.params.institutionAddress
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ FEATURE 11: EMPLOYER VERIFICATION ============
router.post('/verification/request/create', async (req, res) => {
    try {
        const result = await VerificationRequestService.createVerificationRequest(
            req.body.employer,
            req.body.certificateHash,
            req.body.purpose,
            req.body.details
        );
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/verification/requests/:studentCode', authenticate, async (req, res) => {
    try {
        const result = await VerificationRequestService.getStudentPendingRequests(
            req.params.studentCode
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/verification/:requestId/approve', authenticate, async (req, res) => {
    try {
        const result = await VerificationRequestService.studentControlledVerification(
            req.params.requestId,
            { ...req.body, approved: true }
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ FEATURE 12: ADMIN RISK SCORING ============
router.get('/risk-score/:adminWallet', authenticate, roleCheck(['SUPER_ADMIN']), async (req, res) => {
    try {
        const result = await AdminRiskScoringService.calculateAdminRiskScore(
            req.params.adminWallet
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/risk-report/:institutionAddress', authenticate, roleCheck(['SUPER_ADMIN']), async (req, res) => {
    try {
        const result = await AdminRiskScoringService.getInstitutionRiskReport(
            req.params.institutionAddress
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/risk-monitoring/run', authenticate, roleCheck(['SUPER_ADMIN']), async (req, res) => {
    try {
        const result = await AdminRiskScoringService.runAutomatedRiskMonitoring();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;