// server/routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Certificate = require('../models/Certificate');
const Student = require('../models/Student');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// ==================== MIDDLEWARE ====================

// Optional auth middleware - doesn't require auth but uses it if present
const optionalAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        req.student = null;
        return next();
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.student = decoded;
        next();
    } catch (error) {
        req.student = null;
        next();
    }
};

// Required auth middleware
const requireAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.student = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

// ==================== CERTIFICATE ROUTES ====================

// Get certificates for a student by email
router.get('/student/:email', optionalAuth, async (req, res) => {
    try {
        const { email } = req.params;
        console.log('📜 Fetching certificates for:', email);
        
        // Find certificates by student email
        const certificates = await Certificate.find({ 
            studentEmail: { $regex: new RegExp(`^${email}$`, 'i') },
            status: { $in: ['ISSUED', 'VERIFIED'] }
        }).sort({ createdAt: -1 });

        console.log(`📜 Found ${certificates.length} certificates for ${email}`);

        // Format certificates for frontend
        const formattedCerts = certificates.map(cert => ({
            id: cert._id.toString(),
            certificateHash: cert.certificateHash,
            sha256Hash: cert.sha256,
            courseName: cert.courseName,
            institutionName: cert.institutionName,
            studentName: cert.studentName,
            studentEmail: cert.studentEmail,
            studentCode: cert.studentCode,
            grade: cert.grade,
            category: cert.category || 'COURSE',
            issueDate: cert.issueDate,
            expiryDate: cert.expiryDate,
            transactionHash: cert.transactionHash,
            blockNumber: cert.blockNumber,
            ipfsHash: cert.ipfsHash || null,
            status: cert.status,
            verified: cert.verified,
            verificationCount: cert.verificationCount || 0
        }));

        res.json({
            success: true,
            count: formattedCerts.length,
            certificates: formattedCerts
        });

    } catch (error) {
        console.error('❌ Error fetching student certificates:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            certificates: []
        });
    }
});

// Get all certificates for authenticated student
router.get('/my-certificates', requireAuth, async (req, res) => {
    try {
        const certificates = await Certificate.find({ 
            studentEmail: req.student.email,
            status: { $in: ['ISSUED', 'VERIFIED'] }
        }).sort({ createdAt: -1 });

        const formattedCerts = certificates.map(cert => ({
            id: cert._id.toString(),
            certificateHash: cert.certificateHash,
            sha256Hash: cert.sha256,
            courseName: cert.courseName,
            institutionName: cert.institutionName,
            studentName: cert.studentName,
            grade: cert.grade,
            category: cert.category || 'COURSE',
            issueDate: cert.issueDate,
            transactionHash: cert.transactionHash,
            blockNumber: cert.blockNumber,
            status: cert.status,
            verified: cert.verified
        }));

        res.json({
            success: true,
            certificates: formattedCerts
        });

    } catch (error) {
        console.error('❌ Error fetching certificates:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Download certificate
router.get('/download/:hash', async (req, res) => {
    try {
        const { hash } = req.params;
        console.log('📥 Download request for:', hash);
        
        // Build query to find certificate
        const queryConditions = [
            { certificateHash: hash },
            { sha256: hash }
        ];
        
        // Only add _id query if hash is a valid ObjectId
        if (hash.match(/^[0-9a-fA-F]{24}$/)) {
            queryConditions.push({ _id: hash });
        }
        
        const certificate = await Certificate.findOne({
            $or: queryConditions
        });

        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: 'Certificate not found'
            });
        }

        // If certificate has stored PDF data
        if (certificate.fileData) {
            try {
                const buffer = Buffer.from(certificate.fileData, 'base64');
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=certificate-${hash.substring(0, 8)}.pdf`);
                return res.send(buffer);
            } catch (pdfError) {
                console.error('PDF generation error:', pdfError);
                // Fall through to HTML generation
            }
        }

        // Generate beautiful HTML certificate
        const verifyUrl = `${req.protocol}://${req.get('host')}/verify/${certificate.certificateHash}`;
        const html = generateCertificateHTML(certificate, verifyUrl);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename=certificate-${hash.substring(0, 8)}.html`);
        res.send(html);

    } catch (error) {
        console.error('❌ Download error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== STUDENT AUTH ROUTES ====================

// Student Registration
router.post('/register', async (req, res) => {
    try {
        const { 
            studentCode, 
            fullName, 
            email, 
            password, 
            phone,
            institutionId,
            institutionAddress,
            institutionName,
            program,
            department
        } = req.body;

        // Validate required fields
        if (!email || !fullName) {
            return res.status(400).json({
                success: false,
                message: 'Email and full name are required'
            });
        }

        // Check if student already exists
        const existingStudent = await Student.findOne({
            $or: [
                { email: email.toLowerCase() },
                ...(studentCode ? [{ studentCode }] : [])
            ]
        });

        if (existingStudent) {
            return res.status(400).json({
                success: false,
                message: 'A student with this email or code already exists'
            });
        }

        // Generate student code if not provided
        const finalStudentCode = studentCode || Student.generateStudentCode('STU');

        // Create new student
        const student = new Student({
            studentCode: finalStudentCode,
            fullName,
            email: email.toLowerCase(),
            phone,
            institutionId,
            institutionAddress,
            institutionName,
            program,
            department,
            status: 'ACTIVE'
        });

        // Set password if provided
        if (password) {
            student.setPassword(password);
        }

        // Generate verification token
        student.generateVerificationToken();

        await student.save();

        console.log('✅ Student registered:', student.email);

        res.status(201).json({
            success: true,
            message: 'Student registered successfully',
            student: student.getPublicProfile()
        });

    } catch (error) {
        console.error('❌ Student registration error:', error);
        
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'A student with this email or code already exists'
            });
        }
        
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Student Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const student = await Student.findOne({ 
            email: email.toLowerCase() 
        });

        if (!student) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        if (!student.passwordHash) {
            return res.status(401).json({
                success: false,
                message: 'Password not set. Please contact your institution or reset your password.'
            });
        }

        const isMatch = student.verifyPassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update login tracking
        student.lastLogin = new Date();
        student.loginCount = (student.loginCount || 0) + 1;
        await student.save();

        // Generate JWT token
        const token = jwt.sign(
            {
                id: student._id,
                email: student.email,
                studentCode: student.studentCode,
                name: student.fullName,
                type: 'student'
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('✅ Student logged in:', student.email);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            student: student.getPublicProfile()
        });

    } catch (error) {
        console.error('❌ Student login error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get student profile
router.get('/profile', requireAuth, async (req, res) => {
    try {
        const student = await Student.findById(req.student.id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Get certificate count
        const certificateCount = await Certificate.countDocuments({
            studentEmail: student.email,
            status: { $in: ['ISSUED', 'VERIFIED'] }
        });

        res.json({
            success: true,
            student: {
                ...student.getPublicProfile(),
                certificateCount
            }
        });

    } catch (error) {
        console.error('❌ Profile fetch error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Update student profile
router.put('/profile', requireAuth, async (req, res) => {
    try {
        const { fullName, phone, program, department } = req.body;

        const student = await Student.findById(req.student.id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Update allowed fields
        if (fullName) student.fullName = fullName;
        if (phone) student.phone = phone;
        if (program) student.program = program;
        if (department) student.department = department;

        await student.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            student: student.getPublicProfile()
        });

    } catch (error) {
        console.error('❌ Profile update error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Change password
router.post('/change-password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters'
            });
        }

        const student = await Student.findById(req.student.id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Verify current password
        if (!student.verifyPassword(currentPassword)) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Set new password
        student.setPassword(newPassword);
        await student.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('❌ Password change error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        const student = await Student.findOne({ email: email.toLowerCase() });

        if (!student) {
            // Don't reveal if email exists
            return res.json({
                success: true,
                message: 'If an account exists with this email, a reset link will be sent.'
            });
        }

        // Generate reset token
        const resetToken = student.generateResetToken();
        await student.save();

        // In production, send email with reset link
        // For now, just return success
        console.log('🔑 Password reset token generated for:', email);
        console.log('   Token:', resetToken);

        res.json({
            success: true,
            message: 'If an account exists with this email, a reset link will be sent.',
            // Remove in production:
            resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
        });

    } catch (error) {
        console.error('❌ Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token and new password are required'
            });
        }

        const student = await Student.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!student) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Set new password
        student.setPassword(newPassword);
        student.resetPasswordToken = undefined;
        student.resetPasswordExpires = undefined;
        await student.save();

        res.json({
            success: true,
            message: 'Password reset successfully. You can now login with your new password.'
        });

    } catch (error) {
        console.error('❌ Reset password error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Verify email
router.get('/verify-email/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const student = await Student.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: new Date() }
        });

        if (!student) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification token'
            });
        }

        student.isVerified = true;
        student.verificationToken = undefined;
        student.verificationTokenExpires = undefined;
        await student.save();

        res.json({
            success: true,
            message: 'Email verified successfully'
        });

    } catch (error) {
        console.error('❌ Email verification error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== HELPER FUNCTIONS ====================

function generateCertificateHTML(certificate, verifyUrl) {
    const issueDate = new Date(certificate.issueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate - ${certificate.courseName}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Open Sans', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        
        .certificate-wrapper {
            background: white;
            max-width: 900px;
            width: 100%;
            position: relative;
            box-shadow: 0 30px 100px rgba(0, 0, 0, 0.4);
        }
        
        .certificate {
            padding: 60px;
            position: relative;
        }
        
        /* Decorative borders */
        .certificate::before {
            content: '';
            position: absolute;
            top: 15px;
            left: 15px;
            right: 15px;
            bottom: 15px;
            border: 3px solid #667eea;
        }
        
        .certificate::after {
            content: '';
            position: absolute;
            top: 25px;
            left: 25px;
            right: 25px;
            bottom: 25px;
            border: 1px solid #e5e7eb;
        }
        
        .content {
            position: relative;
            z-index: 1;
            text-align: center;
        }
        
        /* Header */
        .header {
            margin-bottom: 40px;
        }
        
        .logo {
            font-size: 70px;
            margin-bottom: 20px;
            display: inline-block;
            animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        
        .title {
            font-family: 'Playfair Display', serif;
            font-size: 48px;
            color: #1a202c;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 8px;
            margin-bottom: 10px;
        }
        
        .subtitle {
            font-size: 16px;
            color: #667eea;
            letter-spacing: 4px;
            text-transform: uppercase;
            font-weight: 600;
        }
        
        /* Main content */
        .main-content {
            margin: 50px 0;
        }
        
        .presented-to {
            font-size: 14px;
            color: #6b7280;
            letter-spacing: 3px;
            text-transform: uppercase;
            margin-bottom: 20px;
        }
        
        .student-name {
            font-family: 'Playfair Display', serif;
            font-size: 52px;
            color: #1a202c;
            font-weight: 700;
            margin-bottom: 30px;
            position: relative;
            display: inline-block;
        }
        
        .student-name::after {
            content: '';
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 60%;
            height: 3px;
            background: linear-gradient(90deg, transparent, #667eea, transparent);
        }
        
        .course-section {
            margin: 40px 0;
        }
        
        .course-label {
            font-size: 14px;
            color: #6b7280;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-bottom: 15px;
        }
        
        .course-name {
            font-family: 'Playfair Display', serif;
            font-size: 32px;
            color: #374151;
            font-weight: 600;
        }
        
        /* Details grid */
        .details {
            display: flex;
            justify-content: center;
            gap: 60px;
            margin: 40px 0;
            flex-wrap: wrap;
        }
        
        .detail-item {
            text-align: center;
            min-width: 150px;
        }
        
        .detail-label {
            font-size: 11px;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 8px;
        }
        
        .detail-value {
            font-size: 18px;
            color: #1a202c;
            font-weight: 600;
        }
        
        /* Blockchain badge */
        .blockchain-badge {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 14px 30px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 600;
            margin-top: 30px;
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }
        
        /* Verification section */
        .verification {
            background: linear-gradient(135deg, #f9fafb, #f3f4f6);
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 30px;
            margin-top: 40px;
            text-align: left;
        }
        
        .verification-title {
            font-size: 14px;
            color: #374151;
            font-weight: 600;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .verification-title::before {
            content: '🔐';
            font-size: 20px;
        }
        
        .hash-container {
            margin: 15px 0;
        }
        
        .hash-label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 5px;
        }
        
        .hash {
            font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
            font-size: 12px;
            color: #667eea;
            word-break: break-all;
            background: white;
            padding: 12px 15px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }
        
        .verify-link-container {
            margin-top: 20px;
            text-align: center;
        }
        
        .verify-link {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            padding: 10px 20px;
            border: 2px solid #667eea;
            border-radius: 8px;
            transition: all 0.3s ease;
        }
        
        .verify-link:hover {
            background: #667eea;
            color: white;
        }
        
        /* Footer */
        .footer {
            margin-top: 50px;
            text-align: center;
        }
        
        .signature {
            display: inline-block;
            min-width: 280px;
            border-top: 2px solid #1a202c;
            padding-top: 15px;
        }
        
        .signature-name {
            font-weight: 600;
            color: #1a202c;
            font-size: 16px;
        }
        
        .signature-title {
            font-size: 13px;
            color: #6b7280;
            margin-top: 5px;
        }
        
        /* Print button */
        .print-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 16px 32px;
            border-radius: 50px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 10px 40px rgba(102, 126, 234, 0.5);
            transition: all 0.3s ease;
            z-index: 100;
        }
        
        .print-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 50px rgba(102, 126, 234, 0.6);
        }
        
        /* Print styles */
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .certificate-wrapper {
                box-shadow: none;
                max-width: 100%;
            }
            
            .print-btn {
                display: none !important;
            }
            
            .logo {
                animation: none;
            }
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .certificate {
                padding: 30px;
            }
            
            .title {
                font-size: 32px;
                letter-spacing: 4px;
            }
            
            .student-name {
                font-size: 36px;
            }
            
            .course-name {
                font-size: 24px;
            }
            
            .details {
                gap: 30px;
            }
            
            .logo {
                font-size: 50px;
            }
        }
    </style>
</head>
<body>
    <div class="certificate-wrapper">
        <div class="certificate">
            <div class="content">
                <div class="header">
                    <div class="logo">🎓</div>
                    <h1 class="title">Certificate</h1>
                    <p class="subtitle">of Achievement</p>
                </div>
                
                <div class="main-content">
                    <p class="presented-to">This is to certify that</p>
                    <h2 class="student-name">${certificate.studentName}</h2>
                    
                    <div class="course-section">
                        <p class="course-label">has successfully completed</p>
                        <h3 class="course-name">${certificate.courseName}</h3>
                    </div>
                    
                    <div class="details">
                        <div class="detail-item">
                            <p class="detail-label">Institution</p>
                            <p class="detail-value">${certificate.institutionName}</p>
                        </div>
                        <div class="detail-item">
                            <p class="detail-label">Grade Achieved</p>
                            <p class="detail-value">${certificate.grade}</p>
                        </div>
                        <div class="detail-item">
                            <p class="detail-label">Date of Issue</p>
                            <p class="detail-value">${issueDate}</p>
                        </div>
                    </div>
                    
                    <span class="blockchain-badge">
                        <span>⛓️</span>
                        <span>Verified on Blockchain</span>
                    </span>
                </div>
                
                <div class="verification">
                    <p class="verification-title">Verification Details</p>
                    
                    <div class="hash-container">
                        <p class="hash-label">Certificate Hash:</p>
                        <p class="hash">${certificate.certificateHash}</p>
                    </div>
                    
                    ${certificate.transactionHash ? `
                    <div class="hash-container">
                        <p class="hash-label">Blockchain Transaction:</p>
                        <p class="hash">${certificate.transactionHash}</p>
                    </div>
                    ` : ''}
                    
                    <div class="verify-link-container">
                        <a href="${verifyUrl}" class="verify-link" target="_blank">
                            <span>🔍</span>
                            <span>Verify Online</span>
                        </a>
                    </div>
                </div>
                
                <div class="footer">
                    <div class="signature">
                        <p class="signature-name">${certificate.institutionName}</p>
                        <p class="signature-title">Authorized Signatory</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <button class="print-btn" onclick="window.print()">
        <span>🖨️</span>
        <span>Print Certificate</span>
    </button>
</body>
</html>`;
}

module.exports = router;