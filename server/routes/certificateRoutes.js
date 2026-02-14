// server/routes/certificateRoutes.js
const express = require('express');
const router = express.Router();
const Certificate = require('../models/Certificate');
const Institution = require('../models/Institution');
const Student = require('../models/Student');
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Helper function to generate unique certificate hash
const generateCertificateHash = (data) => {
    const dataString = JSON.stringify({
        studentCode: data.studentCode,
        courseName: data.courseName,
        grade: data.grade,
        issueDate: data.issueDate,
        institutionAddress: data.institutionAddress,
        timestamp: Date.now(),
        random: crypto.randomBytes(8).toString('hex')
    });
    return crypto.createHash('sha256').update(dataString).digest('hex');
};

// Helper function for file upload
async function uploadFile(fileBuffer) {
    if (!fileBuffer) {
        return { hash: null, data: null, size: 0 };
    }
    const base64File = fileBuffer.toString('base64');
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    return { hash, data: base64File, size: fileBuffer.length };
}

// =========================================================================
// ✅ ISSUE CERTIFICATE (Starts Workflow - Status: PENDING_LEVEL_1)
// =========================================================================
router.post('/issue', 
    authMiddleware, 
    upload.single('certificateFile'),
    async (req, res) => {
    try {
        console.log('📜 Certificate issue request (Initiating 3-Level Workflow)');

        // 1. Get and Validate Institution
        let institution;
        if (req.user.institution) {
            institution = req.user.institution;
        } else if (req.user.institutionId) {
            institution = await Institution.findById(req.user.institutionId);
        } else if (req.user.email) {
            institution = await Institution.findOne({ email: req.user.email });
        }
        
        if (!institution) {
            return res.status(404).json({
                success: false,
                error: 'INSTITUTION_NOT_FOUND',
                message: 'Institution not found for the authenticated user'
            });
        }

        // Check if institution is approved
        if (institution.status?.application !== 'APPROVED') {
            return res.status(403).json({
                success: false,
                error: 'INSTITUTION_NOT_APPROVED',
                message: 'Institution must be approved to issue certificates'
            });
        }

        const {
            studentCode,
            courseName,
            grade,
            issueDate,
            category = 'COURSE',
            expiryDate,
            metadata
        } = req.body;

        // Validate required fields
        if (!studentCode || !courseName || !grade) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_FIELDS',
                message: 'Student code, course name, and grade are required'
            });
        }

        // 2. Find existing student
        const student = await Student.findOne({ studentCode });
        
        if (!student) {
            return res.status(404).json({
                success: false,
                error: 'STUDENT_NOT_FOUND',
                message: `Student with code ${studentCode} not found.`
            });
        }

        // Verify student belongs to this institution
        const institutionEmail = institution.email.toLowerCase();
        const studentInstitutionAddress = student.institutionAddress?.toLowerCase();
        
        if (studentInstitutionAddress !== institutionEmail && 
            studentInstitutionAddress !== institution.institutionCode?.toLowerCase()) {
            return res.status(403).json({
                success: false,
                error: 'STUDENT_NOT_FROM_INSTITUTION',
                message: 'This student is not registered with your institution'
            });
        }

        // Handle file upload
        const fileData = req.file ? await uploadFile(req.file.buffer) : { hash: null, data: null, size: 0 };

        // 3. Generate Hashes
        const certificateData = {
            studentCode,
            courseName,
            grade,
            issueDate: issueDate || new Date().toISOString(),
            institutionAddress: institution.email
        };

        const sha256Hash = generateCertificateHash(certificateData);
        // Generate the CERT- ID
        const certificateHash = `CERT-${Date.now()}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

        // 4. Create Certificate Object
        // ⚠️ CRITICAL: Status is PENDING_LEVEL_1. Not written to JSON yet.
        const certificate = new Certificate({
            certificateHash,
            sha256: sha256Hash,
            studentCode: student.studentCode,
            studentName: student.fullName,
            studentEmail: student.email,
            institutionAddress: institution.email,
            institutionName: institution.name,
            courseName,
            grade,
            category,
            issueDate: issueDate ? new Date(issueDate) : new Date(),
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            status: 'PENDING_LEVEL_1',
            metadata: metadata || {},
            ipfsHash: fileData.hash,
            fileData: fileData.data,
            fileSize: fileData.size,
            transactionHash: null, // Will be generated after Level 3
            approvals: {
                level1: { status: 'PENDING' },
                level2: { status: 'PENDING' },
                level3: { status: 'PENDING' }
            },
            lifecycle: [{
                event: 'CREATED',
                actor: institution.email,
                timestamp: new Date(),
                details: 'Certificate created by institution, awaiting Level 1 approval'
            }]
        });

        await certificate.save();

        // Update institution statistics
        if (institution.statistics) {
            institution.statistics.certificatesIssued = (institution.statistics.certificatesIssued || 0) + 1;
            await institution.save();
        }

        res.status(201).json({
            success: true,
            message: 'Certificate submitted for Level 1 approval',
            certificate: {
                id: certificate._id,
                certificateHash: certificate.certificateHash,
                status: certificate.status
            }
        });

    } catch (error) {
        console.error('Certificate issue error:', error);
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'DUPLICATE_CERTIFICATE',
                message: 'A certificate with this hash already exists.'
            });
        }
        res.status(500).json({
            success: false,
            error: 'ISSUE_FAILED',
            message: error.message
        });
    }
});

// =========================================================================
// ✅ PUBLIC VERIFICATION (Reads from JSON first, then DB)
// =========================================================================
router.get('/verify/:hash', async (req, res) => {
    try {
        let { hash } = req.params;
        hash = hash.trim();

        console.log(`🔍 Verification Request: ${hash}`);

        // 1️⃣ CHECK JSON LEDGER FIRST (The "Blockchain")
        // We reload the file every time to ensure we see new approvals instantly
        let mockLedger = [];
        try {
            const ledgerPath = path.join(__dirname, '../mockBlockchain.json');
            if (fs.existsSync(ledgerPath)) {
                const data = fs.readFileSync(ledgerPath, 'utf8');
                mockLedger = JSON.parse(data);
            }
        } catch(e) {
            console.error("Ledger Read Error:", e);
        }

        const ledgerCert = mockLedger.find(c => 
            c.certificateHash === hash || 
            c.sha256Hash === hash || 
            c.transactionHash === hash
        );

        if (ledgerCert) {
            console.log("✅ Found in JSON Ledger");
            return res.json({
                success: true,
                isValid: true,
                blockchainVerified: true,
                source: "LEDGER",
                certificate: ledgerCert
            });
        }

        // 2️⃣ CHECK DATABASE (Fallback for Pending or Legacy)
        const certificate = await Certificate.findOne({
            $or: [
                { certificateHash: { $regex: new RegExp(`^${hash}$`, 'i') } },
                { sha256: hash },
                { transactionHash: hash },
                { _id: hash.match(/^[0-9a-fA-F]{24}$/) ? hash : null }
            ]
        });

        if (!certificate) {
            console.log("❌ Certificate not found in DB");
            return res.status(404).json({
                success: false,
                message: "Certificate not found on Blockchain or Database",
                isValid: false
            });
        }

        // Check tamper state for DB items
        let tamperedDetected = false;
        if (certificate.fileData) {
            const fileBuffer = Buffer.from(certificate.fileData, 'base64');
            const calculatedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            if (calculatedHash !== certificate.sha256) tamperedDetected = true;
        }

        const isValid = certificate.status === 'ISSUED' && !tamperedDetected;

        res.json({
            success: true,
            isValid,
            source: "DATABASE",
            certificate: {
                id: certificate._id,
                certificateHash: certificate.certificateHash || certificate._id,
                studentName: certificate.studentName,
                courseName: certificate.courseName,
                institutionName: certificate.institutionName,
                grade: certificate.grade,
                issueDate: certificate.issueDate,
                status: certificate.status,
                sha256Hash: certificate.sha256,
                transactionHash: certificate.transactionHash,
                fileData: certificate.fileData
            }
        });

    } catch (error) {
        console.error('Verify Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get certificate by ID
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const certificate = await Certificate.findById(req.params.id);
        if (!certificate) return res.status(404).json({ success: false, message: 'Not Found' });
        res.json({ success: true, certificate });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Search certificates
router.post('/search', authMiddleware, async (req, res) => {
    try {
        const { studentCode, studentEmail, certificateHash } = req.body;
        const query = {};
        if (studentCode) query.studentCode = studentCode;
        if (studentEmail) query.studentEmail = studentEmail;
        if (certificateHash) {
            query.$or = [{ certificateHash }, { sha256: certificateHash }];
        }
        const certificates = await Certificate.find(query).sort({ createdAt: -1 });
        res.json({ success: true, count: certificates.length, certificates });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get certificates for institution
router.get('/institution', authMiddleware, async (req, res) => {
    try {
        let institution;
        if (req.user.institution) {
            institution = req.user.institution;
        } else if (req.user.institutionId) {
            institution = await Institution.findById(req.user.institutionId);
        } else if (req.user.email) {
            institution = await Institution.findOne({ email: req.user.email });
        }
        
        if (!institution) {
            return res.status(404).json({ success: false, message: 'Institution not found' });
        }

        const certificates = await Certificate.find({
            institutionAddress: institution.email
        }).sort({ createdAt: -1 });

        res.json({ success: true, count: certificates.length, certificates });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/log-verification', async (req, res) => {
    res.json({ success: true });
});

module.exports = router;