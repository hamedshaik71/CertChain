// server/server.js - COMPLETE FIXED VERSION WITH HIERARCHICAL APPROVAL WORKFLOW
require('dotenv').config();

console.log('🔧 Environment Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');

const express = require('express');
const cors = require('cors');
BigInt.prototype.toJSON = function() { return this.toString() };
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { Web3 } = require('web3');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const blockchainRoutes = require('./routes/blockchainRoutes');
const badgeRoutes = require('./routes/badgeRoutes');

// ✅ Import routes at the top (but don't use them yet)
const publicRoutes = require('./routes/publicRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const studentRoutes = require('./routes/studentRoutes');
const nftRoutes = require('./routes/nftRoutes');              // ← ONLY ADD THIS ONE LINE
const resumeRoutes = require('./routes/resumeRoutes'); 

// ✅ JSON File Storage (backup + fallback)
const { StudentStorage } = require('./services/jsonStorage');

// ADD THESE LINES AFTER EXISTING IMPORTS
const cloudinary = require('./config/cloudinaryConfig');
const { generateCertificatePDF } = require('./utils/certificateGenerator');
const { uploadCertificateToCloudinary } = require('./utils/cloudinaryUploader');

dotenv.config();

// ============ SETUP ============

const app = express();

const web3 = new Web3(process.env.WEB3_RPC_URL || 'http://127.0.0.1:7545');
console.log(`🔗 Web3 connected to: ${process.env.WEB3_RPC_URL || 'http://127.0.0.1:7545'}`);

app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5000',
        'http://127.0.0.1:5000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',

        // ✅ ADD THIS 👇
        'https://certchain-frontend-s4y2.onrender.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.options('*', cors());

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============ MOUNT ROUTE MODULES ============
// ✅ Each route should be registered ONCE with correct path

// Public routes (for public verification)
app.use('/api/public', publicRoutes);

// Certificate routes (all certificate operations)
app.use('/api/certificates', certificateRoutes);

// Student routes (student-specific endpoints)
app.use('/api/student', studentRoutes);  // ← Changed from /api/certificates to /api/student

// Blockchain routes
app.use('/api/blockchain', blockchainRoutes);

// NFT routes
app.use('/api/nft', nftRoutes);

// Badge routes
app.use('/api/badges', badgeRoutes);

// Resume verification routes
app.use('/api/resume', resumeRoutes);

// ============ FILE UPLOAD SETUP ============

const uploadDirs = ['uploads', 'uploads/documents', 'uploads/certificates'];
uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
    }
});

const certificateUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

const institutionStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/documents/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const institutionUpload = multer({
    storage: institutionStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/jpg',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, JPG, PNG, DOC allowed.'), false);
        }
    }
});

const institutionDocUpload = institutionUpload.fields([
    { name: 'accreditationProof', maxCount: 1 },
    { name: 'officialLetter', maxCount: 1 },
    { name: 'identityProof', maxCount: 1 }
]);

// ============ ADMIN ACCESS CONTROL SYSTEM ============

const ADMIN_CREDENTIALS = {
    admin1: {
        email: 'admin1@certchain.io',
        secretCode: 'CHAIN_ADMIN_001_7F9E2B4C8D1A5F6E',
        mnemonic: 'abandon ability able about above absent absorb abstract academy accept accident account',
        role: 'SUPER_ADMIN',
        wallet: null,
        active: true,
        createdAt: new Date('2024-01-01')
    },
    admin2: {
        email: 'admin2@certchain.io',
        secretCode: 'CHAIN_ADMIN_002_3K9P2Q8R1L5M6N4O',
        mnemonic: 'access accident account accuse achieve acid acoustic acquire across act action actress',
        role: 'DEPARTMENT_ADMIN',
        wallet: null,
        active: true,
        createdAt: new Date('2024-01-02')
    },
    admin3: {
        email: 'admin3@certchain.io',
        secretCode: 'CHAIN_ADMIN_003_6T2U9V4W7X1Y3Z8A',
        mnemonic: 'actual adams address adjust admit adobe adopt advance advice aerobic affair afford',
        role: 'REGISTRAR',
        wallet: null,
        active: true,
        createdAt: new Date('2024-01-03')
    },
    admin4: {
        email: 'admin4@certchain.io',
        secretCode: 'CHAIN_ADMIN_004_9B5C1D2E3F4G5H6I',
        mnemonic: 'afraid after again against age agenda agree ahead aim air airport aisle',
        role: 'IT_ADMIN',
        wallet: null,
        active: true,
        createdAt: new Date('2024-01-04')
    },
    admin5: {
        email: 'admin5@certchain.io',
        secretCode: 'CHAIN_ADMIN_005_2K7L4M9N3O1P6Q8R',
        mnemonic: 'alarm album alcohol alert alien align alive allow almost alone along already',
        role: 'SUPER_ADMIN',
        wallet: null,
        active: true,
        createdAt: new Date('2024-01-05')
    }
};

const initializeAdminWallets = () => {
    try {
        for (const [key, admin] of Object.entries(ADMIN_CREDENTIALS)) {
            const hdWallet = web3.eth.accounts.wallet.create(1);
            admin.wallet = hdWallet[0].address;
            console.log(`✅ Admin ${key}: ${admin.email} → ${admin.wallet}`);
        }
    } catch (error) {
        console.error('❌ Failed to initialize admin wallets:', error.message);
    }
};

initializeAdminWallets();

// ============ DATABASE CONNECTION ============

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/certificate-system', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection failed:', err.message));

mongoose.connection.on('error', (err) => {
    console.error('MongoDB runtime error:', err);
});

// ============ SMART CONTRACT SETUP ============

let contract = null;
try {
    const CONTRACT_ABI = require('./abi/CertificateVerification.json');
    contract = new web3.eth.Contract(CONTRACT_ABI, process.env.CONTRACT_ADDRESS);
    console.log(`✅ Smart Contract loaded: ${process.env.CONTRACT_ADDRESS}`);
} catch (error) {
    console.warn('⚠️  Contract ABI not found, but server will continue');
}

// ============ MODELS ============

const Institution = require('./models/Institution');
const Student = require('./models/Student');
const Certificate = require('./models/Certificate');
let InternalVerificationService, CertificateApprovalQueue;
try {
    InternalVerificationService = require('./services/internalVerificationService');
    CertificateApprovalQueue = require('./models/CertificateApprovalQueue');
} catch (e) {
    console.warn('⚠️  Optional models not found, continuing without them');
}

// ============ MIDDLEWARE ============

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'NO_TOKEN' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token verification error:', error.message);
        res.status(401).json({ error: 'INVALID_TOKEN' });
    }
};

const roleCheck = (allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user.role || req.user.adminLevel;
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ error: 'FORBIDDEN' });
        }
        next();
    };
};

// ============ UTILITY FUNCTIONS ============

function generateCertificateHash(data) {
    const hashInput = JSON.stringify({
        studentCode: data.studentCode,
        courseName: data.courseName,
        grade: data.grade,
        issueDate: data.issueDate,
        institutionAddress: data.institutionAddress
    });
    return crypto.createHash('sha256').update(hashInput).digest('hex');
}

async function uploadFile(fileBuffer) {
    if (!fileBuffer) {
        return { hash: 'no-file', data: null, size: 0 };
    }
    const base64File = fileBuffer.toString('base64');
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    console.log('✅ File stored in database (IPFS disabled)');
    return { hash, data: base64File, size: fileBuffer.length };
}

// ============ ADMIN VERIFICATION ============

const verifyAdminCredentials = (email, secretCode, mnemonic12Words) => {
    const admin = Object.values(ADMIN_CREDENTIALS).find(
        a => a.email === email && a.active
    );

    if (!admin) {
        return { success: false, error: 'ADMIN_NOT_FOUND', message: 'Admin email not recognized' };
    }
    if (admin.secretCode !== secretCode) {
        return { success: false, error: 'INVALID_SECRET_CODE', message: 'Secret blockchain code is incorrect' };
    }
    if (admin.mnemonic !== mnemonic12Words) {
        return { success: false, error: 'INVALID_MNEMONIC', message: '12-word mnemonic phrase is incorrect' };
    }

    return {
        success: true,
        admin: {
            email: admin.email,
            wallet: admin.wallet,
            role: admin.role,
            secretCode: admin.secretCode.substring(0, 16) + '****',
            createdAt: admin.createdAt
        }
    };
};

const getAdminPermissions = (role) => {
    const permissions = {
        SUPER_ADMIN: [
            'APPROVE_INSTITUTION', 'REJECT_INSTITUTION', 'MANAGE_ADMINS',
            'VIEW_ALL_CERTIFICATES', 'ISSUE_CERTIFICATE', 'REVOKE_CERTIFICATE',
            'VIEW_ANALYTICS', 'MANAGE_APPROVAL_QUEUE', 'LEVEL_3_APPROVAL'
        ],
        DEPARTMENT_ADMIN: [
            'SUBMIT_CERTIFICATE_FOR_APPROVAL', 'VIEW_OWN_CERTIFICATES',
            'VIEW_OWN_STUDENTS', 'GENERATE_APPROVAL_CODES', 'LEVEL_1_APPROVAL'
        ],
        REGISTRAR: [
            'APPROVE_CERTIFICATES', 'REJECT_CERTIFICATES', 'REVOKE_CERTIFICATES',
            'SIGN_CERTIFICATES', 'VIEW_APPROVAL_QUEUE', 'LEVEL_2_APPROVAL'
        ],
        IT_ADMIN: [
            'VALIDATE_CERTIFICATES', 'MANAGE_USERS', 'VIEW_SYSTEM_LOGS',
            'MANAGE_SECURITY'
        ]
    };
    return permissions[role] || [];
};

// ============ ROUTES ============

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        contract: process.env.CONTRACT_ADDRESS,
        network: process.env.CHAIN_ID,
        backend: 'running',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        adminSystemReady: true,
        workflowEnabled: true
    });
});

app.get('/api/test', (req, res) => {
    res.json({ success: true, message: 'Backend is working!', timestamp: new Date() });
});

// Feature routes
try {
    const featureRoutes = require('./routes/features');
    app.use('/api', featureRoutes);
} catch (e) {
    console.warn('⚠️  Feature routes not found, skipping');
}

// ✅ View all students stored in JSON (Development only)
app.get('/api/dev/students', (req, res) => {
    const students = StudentStorage.getAll();

    console.log(`📊 Students in JSON file: ${students.length}`);
    students.forEach(s => {
        console.log(`   👤 ${s.fullName} | ${s.email} | ${s.studentCode} | Has Password: ${!!s.passwordHash}`);
    });

    res.json({
        success: true,
        source: 'JSON File',
        count: students.length,
        students: students.map(s => ({
            studentCode: s.studentCode,
            email: s.email,
            fullName: s.fullName,
            institutionName: s.institutionName,
            hasPassword: !!s.passwordHash,
            status: s.status,
            lastLogin: s.lastLogin,
            loginCount: s.loginCount,
            createdAt: s.createdAt
        }))
    });
});

// ✅ Sync between JSON and MongoDB
app.get('/api/dev/sync-students', async (req, res) => {
    try {
        const fromMongo = await StudentStorage.syncFromMongoDB(Student);
        const toMongo = await StudentStorage.syncToMongoDB(Student);

        res.json({
            success: true,
            message: 'Sync complete',
            importedFromMongoDB: fromMongo,
            exportedToMongoDB: toMongo,
            totalInJSON: StudentStorage.count()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// 1️⃣ INSTITUTION REGISTRATION
// ============================================================================

app.post('/api/institution/register', institutionDocUpload, async (req, res) => {
    try {
        console.log('📝 Institution registration request (Email/Password)');
        console.log('📋 Body fields:', Object.keys(req.body));
        console.log('📎 Files:', req.files ? Object.keys(req.files) : 'none');

        const {
            name,
            email,
            phone,
            address,
            website,
            accreditationId,
            password
        } = req.body;

        if (!name || !email || !accreditationId) {
            return res.status(400).json({
                error: 'MISSING_REQUIRED_FIELDS',
                message: 'Name, email, and accreditation ID are required',
                received: {
                    name: !!name,
                    email: !!email,
                    accreditationId: !!accreditationId
                }
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'INVALID_EMAIL',
                message: 'Please provide a valid email address'
            });
        }

        const existingEmail = await Institution.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            return res.status(400).json({
                error: 'EMAIL_ALREADY_REGISTERED',
                message: 'An institution with this email already exists'
            });
        }

        const existingAccreditation = await Institution.findOne({ accreditationId: accreditationId.toUpperCase().trim() });
        if (existingAccreditation) {
            return res.status(400).json({
                error: 'ACCREDITATION_ALREADY_REGISTERED',
                message: 'An institution with this accreditation ID already exists'
            });
        }

        const institutionCode = Institution.generateInstitutionCode(name);
        const tempPassword = password || crypto.randomBytes(8).toString('hex');

        const documentsData = {};

        if (req.files) {
            if (req.files.accreditationProof && req.files.accreditationProof[0]) {
                documentsData.accreditationProof = {
                    fileName: req.files.accreditationProof[0].originalname,
                    fileUrl: req.files.accreditationProof[0].path,
                    uploadedAt: new Date(),
                    verified: false
                };
            }
            if (req.files.officialLetter && req.files.officialLetter[0]) {
                documentsData.officialLetter = {
                    fileName: req.files.officialLetter[0].originalname,
                    fileUrl: req.files.officialLetter[0].path,
                    uploadedAt: new Date(),
                    verified: false
                };
            }
            if (req.files.identityProof && req.files.identityProof[0]) {
                documentsData.identityProof = {
                    fileName: req.files.identityProof[0].originalname,
                    fileUrl: req.files.identityProof[0].path,
                    uploadedAt: new Date(),
                    verified: false
                };
            }
        }

        const institution = new Institution({
            name: name.trim(),
            institutionCode,
            accreditationId: accreditationId.toUpperCase().trim(),
            email: email.toLowerCase().trim(),
            phone: phone || '',
            address: address || '',
            website: website || '',
            passwordHash: tempPassword,
            emailVerified: false,
            status: {
                application: 'PENDING',
                isLocked: false
            },
            documents: documentsData,
            settings: {
                sandboxMode: true
            }
        });

        const verificationToken = institution.generateEmailVerificationToken();

        await institution.save();

        console.log(`✅ Institution registered successfully!`);
        console.log(`   📛 Name: ${institution.name}`);
        console.log(`   🔑 Code: ${institutionCode}`);
        console.log(`   📧 Email: ${institution.email}`);
        console.log(`   🔐 Temp Password: ${tempPassword}`);
        console.log(`   📎 Documents: ${Object.keys(documentsData).length} uploaded`);

        res.json({
            success: true,
            message: 'Registration submitted successfully! Check your email to verify, then wait for admin approval.',
            institutionCode,
            institution: {
                name: institution.name,
                email: institution.email,
                institutionCode: institution.institutionCode,
                accreditationId: institution.accreditationId,
                status: institution.status.application,
                documentsUploaded: {
                    accreditationProof: !!documentsData.accreditationProof,
                    officialLetter: !!documentsData.officialLetter,
                    identityProof: !!documentsData.identityProof
                }
            },
            devInfo: process.env.NODE_ENV === 'development' ? {
                verificationToken,
                tempPassword,
                note: 'Use these for testing. Remove devInfo in production.'
            } : undefined
        });

    } catch (error) {
        console.error('❌ Institution registration error:', error);

        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                error: 'DUPLICATE_FIELD',
                message: `An institution with this ${field} already exists`,
                field
            });
        }

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: messages.join('. '),
                details: messages
            });
        }

        res.status(500).json({
            error: 'REGISTRATION_FAILED',
            message: error.message
        });
    }
});

// ============================================================================
// 2️⃣ STUDENT REGISTRATION
// ============================================================================

app.post('/api/student/register', async (req, res) => {
    try {
        console.log('📝 Student registration request');

        // ✅ CHANGE: Use 'let' so we can auto-fill institutionCode if missing
        let { email, fullName, password, institutionCode } = req.body;

        // 🟢 NEW LOGIC: Auto-fill Institution Code from Token
        // If the user didn't provide a code, check if they are a logged-in Institution
        if (!institutionCode && req.headers.authorization) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                if (token) {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-key');
                    // If the token belongs to an institution, use their code
                    if (decoded.role === 'institution' && decoded.institutionCode) {
                        institutionCode = decoded.institutionCode;
                        console.log(`🤖 Auto-filled Institution Code from Token: ${institutionCode}`);
                    }
                }
            } catch (tokenError) {
                // Ignore errors here (it might be a student registering publicly without a token)
            }
        }

        // 🔴 VALIDATION (Runs after auto-fill attempt)
        if (!email || !fullName || !password || !institutionCode) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_FIELDS',
                message: 'Email, full name, password, and institution code are required'
            });
        }

        // Check institution exists and is approved
        let institution = null;
        try {
            // Trim whitespace to ensure match
            const cleanCode = institutionCode.trim();
            institution = await Institution.findOne({ institutionCode: cleanCode });
            
            // Update the variable to be the clean version
            institutionCode = cleanCode;
        } catch (dbErr) {
            console.warn('⚠️ MongoDB lookup failed, continuing with JSON only');
        }

        if (institution && institution.status.application !== 'APPROVED') {
            return res.status(403).json({
                success: false,
                error: 'INSTITUTION_NOT_APPROVED',
                message: 'Institution is not approved yet'
            });
        }

        // ✅ Save to JSON file FIRST (guaranteed persistence)
        let jsonStudent;
        try {
            jsonStudent = StudentStorage.register({
                email,
                fullName,
                password,
                institutionCode,
                institutionName: institution?.name || institutionCode,
                institutionAddress: institution?.blockchain?.walletAddress || institution?.email || institutionCode
            });
            console.log(`✅ [JSON] Student saved: ${jsonStudent.email}`);
        } catch (jsonError) {
            // Check if duplicate
            if (jsonError.message.includes('ALREADY_REGISTERED') || jsonError.message.includes('EXISTS')) {
                return res.status(400).json({
                    success: false,
                    error: 'EMAIL_ALREADY_REGISTERED',
                    message: 'A student with this email already exists'
                });
            }
            throw jsonError;
        }

        // ✅ ALSO save to MongoDB (best effort)
        let mongoStudent = null;
        try {
            const existing = await Student.findOne({ email: email.toLowerCase() });
            if (!existing) {
                mongoStudent = new Student({
                    studentCode: jsonStudent.studentCode,
                    email: email.toLowerCase(),
                    fullName,
                    // 👇 This ensures the code is saved in MongoDB for future queries
                    institutionCode: institutionCode, 
                    institutionAddress: institution?.blockchain?.walletAddress || institution?.email || institutionCode,
                    institutionName: institution?.name || institutionCode
                });
                mongoStudent.setPassword(password);
                await mongoStudent.save();
                console.log(`✅ [MongoDB] Student also saved to database`);
            }
        } catch (mongoError) {
            console.warn(`⚠️ [MongoDB] Save failed (JSON backup exists): ${mongoError.message}`);
        }

        // Update institution stats
        try {
            if (institution && institution.statistics) {
                institution.statistics.studentsEnrolled = (institution.statistics.studentsEnrolled || 0) + 1;
                await institution.save();
            }
        } catch (e) {
            console.warn('⚠️ Could not update institution stats');
        }

        console.log(`✅ Student registered successfully: ${jsonStudent.studentCode}`);
        console.log(`📊 Total students in JSON: ${StudentStorage.count()}`);

        res.json({
            success: true,
            message: 'Registration successful!',
            studentCode: jsonStudent.studentCode,
            student: {
                studentCode: jsonStudent.studentCode,
                fullName: jsonStudent.fullName,
                email: jsonStudent.email,
                institutionCode: institutionCode, 
                institutionName: jsonStudent.institutionName
            }
        });

    } catch (error) {
        console.error('❌ Student registration error:', error);
        res.status(500).json({
            success: false,
            error: 'REGISTRATION_FAILED',
            message: error.message
        });
    }
});
// ============================================================================
// 3️⃣ STUDENT LOGIN
// ============================================================================

app.post('/api/student/login', async (req, res) => {
    try {
        console.log('🔐 Student login request');
        console.log('📋 Received fields:', Object.keys(req.body));

        const { studentCode, email, password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_CREDENTIALS',
                message: 'Password is required'
            });
        }

        if (!studentCode && !email) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_CREDENTIALS',
                message: 'Student code or email is required'
            });
        }

        const identifier = email || studentCode;

        // ✅ TRY JSON FILE FIRST (always has data)
        console.log(`🔍 [JSON] Looking for student: ${identifier}`);
        const jsonResult = StudentStorage.login(identifier, password);

        if (jsonResult.success) {
            console.log(`✅ [JSON] Student authenticated: ${jsonResult.student.email}`);

            const token = jwt.sign(
                {
                    id: jsonResult.student.id,
                    studentCode: jsonResult.student.studentCode,
                    email: jsonResult.student.email,
                    fullName: jsonResult.student.fullName,
                    role: 'student',
                    institutionAddress: jsonResult.student.institutionAddress,
                    institutionName: jsonResult.student.institutionName
                },
                process.env.JWT_SECRET || 'secret-key',
                { expiresIn: '30d' }
            );

            return res.json({
                success: true,
                message: 'Login successful',
                token,
                student: jsonResult.student
            });
        }

        // ✅ FALLBACK: Try MongoDB
        console.log(`🔍 [MongoDB] JSON login failed, trying MongoDB...`);

        let student = null;
        try {
            if (email) {
                student = await Student.findOne({ email: email.toLowerCase() });
            }
            if (!student && studentCode) {
                student = await Student.findOne({ studentCode });
            }
        } catch (dbError) {
            console.warn(`⚠️ MongoDB lookup failed: ${dbError.message}`);
        }

        if (student) {
            if (!student.passwordHash) {
                return res.status(401).json({
                    success: false,
                    error: 'PASSWORD_NOT_SET',
                    message: 'Password not set. Please contact your institution.'
                });
            }

            if (!student.verifyPassword(password)) {
                return res.status(401).json({
                    success: false,
                    error: 'INVALID_CREDENTIALS',
                    message: 'Invalid email/student code or password'
                });
            }

            // Update login tracking
            student.lastLogin = new Date();
            student.loginCount = (student.loginCount || 0) + 1;
            await student.save();

            // ✅ Sync this student to JSON for future logins
            try {
                const existsInJson = StudentStorage.findByEmail(student.email);
                if (!existsInJson) {
                    StudentStorage.register({
                        studentCode: student.studentCode,
                        email: student.email,
                        fullName: student.fullName,
                        password: password, // We know it's correct
                        institutionName: student.institutionName,
                        institutionAddress: student.institutionAddress
                    });
                    console.log(`✅ [JSON] Synced MongoDB student to JSON file`);
                }
            } catch (syncError) {
                console.warn(`⚠️ JSON sync failed: ${syncError.message}`);
            }

            const token = jwt.sign(
                {
                    id: student._id,
                    studentCode: student.studentCode,
                    email: student.email,
                    fullName: student.fullName,
                    role: 'student',
                    institutionAddress: student.institutionAddress,
                    institutionName: student.institutionName
                },
                process.env.JWT_SECRET || 'secret-key',
                { expiresIn: '30d' }
            );

            console.log(`✅ [MongoDB] Student logged in: ${student.email}`);

            return res.json({
                success: true,
                message: 'Login successful',
                token,
                student: {
                    id: student._id,
                    studentCode: student.studentCode,
                    fullName: student.fullName,
                    email: student.email,
                    phone: student.phone,
                    institutionName: student.institutionName,
                    institutionAddress: student.institutionAddress,
                    program: student.program,
                    department: student.department,
                    status: student.status,
                    isVerified: student.isVerified,
                    lastLogin: student.lastLogin,
                    loginCount: student.loginCount
                }
            });
        }

        // ❌ Not found anywhere
        console.log(`❌ Student not found in JSON or MongoDB: ${identifier}`);
        return res.status(401).json({
            success: false,
            error: 'INVALID_CREDENTIALS',
            message: 'Invalid email/student code or password'
        });

    } catch (error) {
        console.error('❌ Student login error:', error);
        res.status(500).json({
            success: false,
            error: 'LOGIN_FAILED',
            message: error.message
        });
    }
});

// ============================================================================
// 4️⃣ INSTITUTION LOGIN
// ============================================================================

app.post('/api/institution/login', async (req, res) => {
    try {
        console.log('🔐 Institution login request (Email/Password)');

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'MISSING_CREDENTIALS',
                message: 'Email and password are required'
            });
        }

        const institution = await Institution.findOne({
            email: email.toLowerCase()
        }).select('+passwordHash');

        if (!institution) {
            return res.status(401).json({
                error: 'INVALID_CREDENTIALS',
                message: 'Invalid email or password'
            });
        }

        if (institution.status.application === 'PENDING') {
            return res.status(403).json({
                error: 'ACCOUNT_PENDING',
                message: 'Your institution is pending admin approval. Please wait.',
                status: 'PENDING'
            });
        }

        if (institution.status.application === 'REJECTED') {
            return res.status(403).json({
                error: 'ACCOUNT_REJECTED',
                message: `Your application was rejected. Reason: ${institution.rejection?.reason || 'Not specified'}`,
                status: 'REJECTED'
            });
        }

        if (institution.status.isLocked) {
            return res.status(403).json({
                error: 'ACCOUNT_LOCKED',
                message: `Account is locked. Reason: ${institution.status.lockReason || 'Contact admin'}`
            });
        }

        if (institution.loginAttempts?.cooldownUntil && new Date() < institution.loginAttempts.cooldownUntil) {
            return res.status(429).json({
                error: 'TOO_MANY_ATTEMPTS',
                message: 'Too many failed login attempts. Please try again later.',
                cooldownUntil: institution.loginAttempts.cooldownUntil
            });
        }

        const isPasswordValid = await institution.comparePassword(password);
        if (!isPasswordValid) {
            await institution.recordFailedLoginAttempt('Invalid password');
            return res.status(401).json({
                error: 'INVALID_CREDENTIALS',
                message: 'Invalid email or password'
            });
        }

        const token = jwt.sign(
            {
                institutionId: institution._id,
                email: institution.email,
                institutionCode: institution.institutionCode,
                role: 'institution',
                adminLevel: 'DEPARTMENT_ADMIN',
                name: institution.name,
                walletAddress: institution.blockchain?.walletAddress || null
            },
            process.env.JWT_SECRET || 'secret-key',
            { expiresIn: '30d' }
        );

        await institution.recordSuccessfulLogin({
            jwtToken: token,
            issuedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            isActive: true
        });

        console.log(`✅ Institution logged in: ${institution.institutionCode}`);

        res.json({
            success: true,
            token,
            institution: {
                name: institution.name,
                email: institution.email,
                institutionCode: institution.institutionCode,
                accreditationId: institution.accreditationId,
                status: institution.status.application,
                isApproved: institution.status.application === 'APPROVED',
                adminLevel: 'DEPARTMENT_ADMIN'
            }
        });

    } catch (error) {
        console.error('Institution login error:', error);
        res.status(500).json({
            error: 'LOGIN_FAILED',
            message: error.message
        });
    }
});

// ============================================================================
// 5️⃣ INSTITUTION EMAIL VERIFICATION
// ============================================================================

app.post('/api/institution/verify-email', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const institution = await Institution.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpiry: { $gt: new Date() }
        }).select('+emailVerificationToken +emailVerificationExpiry');

        if (!institution) {
            return res.status(400).json({
                error: 'INVALID_TOKEN',
                message: 'Invalid or expired verification token'
            });
        }

        await institution.confirmEmailVerification();

        console.log(`✅ Email verified for: ${institution.email}`);

        res.json({
            success: true,
            message: 'Email verified successfully! Your account is now pending admin approval.'
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// 6️⃣ FORGOT PASSWORD
// ============================================================================

app.post('/api/institution/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const institution = await Institution.findOne({ email: email.toLowerCase() });

        if (!institution) {
            return res.json({
                success: true,
                message: 'If an account with that email exists, a reset link has been sent.'
            });
        }

        const resetToken = institution.generatePasswordResetToken();
        await institution.save();

        console.log(`🔑 Password reset token for ${email}: ${resetToken}`);

        res.json({
            success: true,
            message: 'If an account with that email exists, a reset link has been sent.',
            devInfo: process.env.NODE_ENV === 'development' ? { resetToken } : undefined
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// 7️⃣ RESET PASSWORD
// ============================================================================

app.post('/api/institution/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const institution = await Institution.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpiry: { $gt: new Date() }
        }).select('+passwordResetToken +passwordResetExpiry +passwordHash');

        if (!institution) {
            return res.status(400).json({
                error: 'INVALID_TOKEN',
                message: 'Invalid or expired reset token'
            });
        }

        await institution.updatePassword(newPassword);

        console.log(`✅ Password reset for: ${institution.email}`);

        res.json({
            success: true,
            message: 'Password has been reset successfully. You can now login with your new password.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// 8️⃣ GET STUDENT CERTIFICATES
// ============================================================================

app.post('/api/student/certificates', async (req, res) => {
    try {
        console.log('📜 Fetching student certificates');

        const { studentCode, certificateHash } = req.body;

        if (!studentCode) {
            return res.status(400).json({ error: 'Missing student code' });
        }

        const student = await Student.findOne({ studentCode });
        if (!student) {
            return res.status(404).json({ error: 'INVALID_STUDENT_CODE' });
        }

        if (certificateHash) {
            const certificate = await Certificate.findOne({
                studentCode,
                $or: [{ certificateHash }, { sha256: certificateHash }]
            });

            if (!certificate) {
                return res.status(404).json({ error: 'CERTIFICATE_NOT_FOUND' });
            }

            if (certificate.status !== 'ISSUED') {
                return res.status(403).json({
                    error: 'CERTIFICATE_NOT_AVAILABLE',
                    message: 'This certificate is still pending approval or has been rejected'
                });
            }

            return res.json({ success: true, certificate });
        }

        const certificates = await Certificate.find({
            studentCode,
            status: 'ISSUED'
        });
        res.json({ success: true, certificates, count: certificates.length });

    } catch (error) {
        console.error('Get certificates error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// 9️⃣ PUBLIC VERIFICATION
// ============================================================================

app.get('/api/public/verify/:hash', async (req, res) => {
    try {
        console.log(`🔍 Public verification: ${req.params.hash}`);

        const { hash } = req.params;
        const certificate = await Certificate.findOne({
            $or: [{ certificateHash: hash }, { sha256: hash }],
            status: 'ISSUED'
        });

        if (!certificate) {
            return res.status(404).json({
                success: false,
                verified: false,
                error: 'CERTIFICATE_NOT_FOUND',
                message: 'No certificate found with this hash'
            });
        }

        certificate.verificationCount++;
        await certificate.save();

        res.json({
            success: true,
            verified: true,
            certificate: {
                studentName: certificate.studentName,
                institutionName: certificate.institutionName,
                courseName: certificate.courseName,
                grade: certificate.grade,
                issueDate: certificate.issueDate,
                status: certificate.status,
                verificationCount: certificate.verificationCount,
                transactionHash: certificate.transactionHash,
                blockNumber: certificate.blockNumber,
                onBlockchain: !!certificate.transactionHash
            }
        });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// 🔟 ISSUE CERTIFICATE (Starts Workflow at Level 1)
// ============================================================================

// ============================================================================
// 🔟 ISSUE CERTIFICATE (Enhanced with Cloudinary + PDF Generation)
// ============================================================================

app.post('/api/certificate/issue',
    authenticate,
    roleCheck(['institution']),
    certificateUpload.single('certificateFile'),
    async (req, res) => {
        try {
            console.log('📜 Institution initiating certificate workflow with Cloudinary...');

            const { studentCode, courseName, grade, issueDate, expiryDate, category } = req.body;

            if (!studentCode || !courseName || !grade || !issueDate) {
                return res.status(400).json({ 
                    error: 'MISSING_REQUIRED_FIELDS',
                    message: 'Student code, course name, grade, and issue date are required' 
                });
            }

            // 1. Validate Student
            const student = await Student.findOne({ studentCode });
            if (!student) {
                return res.status(404).json({ error: 'STUDENT_NOT_FOUND' });
            }

            // 2. Validate Institution
            const institution = await Institution.findOne({ email: req.user.email });
            if (!institution) {
                return res.status(404).json({ error: 'INSTITUTION_NOT_FOUND' });
            }

            if (institution.status.application !== 'APPROVED') {
                return res.status(403).json({ 
                    error: 'INSTITUTION_NOT_APPROVED',
                    message: 'Your institution must be approved before issuing certificates'
                });
            }

            // 3. Generate Certificate Hash (before PDF generation)
            const hashInput = JSON.stringify({
                studentCode,
                studentName: student.fullName,
                courseName,
                grade,
                issueDate,
                institution: req.user.email,
                timestamp: Date.now()
            });
            const certificateHash = crypto.createHash('sha256').update(hashInput).digest('hex');

            // 4. Generate QR Code URL
            const serverURL = process.env.SERVER_URL || 'http://localhost:5000';
            const qrCodeURL = `${serverURL}/certificate/${certificateHash}`;

            console.log('🔐 Certificate Hash:', certificateHash);
            console.log('📱 QR Code URL:', qrCodeURL);

            // 5. Generate PDF Certificate
            console.log('📄 Generating PDF certificate...');
            const pdfBuffer = await generateCertificatePDF({
                studentName: student.fullName,
                studentCode: student.studentCode,
                courseName,
                grade,
                issueDate,
                institutionName: institution.name,
                certificateHash,
                qrCodeURL
            });

            console.log(`✅ PDF generated: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

            // 6. Upload to Cloudinary
            const uploadResult = await uploadCertificateToCloudinary(pdfBuffer, {
                studentName: student.fullName,
                studentCode: student.studentCode,
                courseName,
                institutionName: institution.name
            });

            console.log('✅ Uploaded to Cloudinary:', uploadResult.url);

            // 7. Verify hash matches
            if (uploadResult.hash !== certificateHash) {
                console.warn('⚠️ Hash mismatch! Recalculating...');
                // Use the hash from uploaded file
                const finalHash = uploadResult.hash;
            }

            // 8. Create Certificate Record in Database
            const certificate = new Certificate({
                certificateHash: uploadResult.hash,
                sha256: uploadResult.hash,
                studentCode,
                studentName: student.fullName,
                studentEmail: student.email,
                institutionAddress: req.user.email,
                institutionName: institution.name,
                courseName,
                grade,
                issueDate: new Date(issueDate),
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                category: category || 'COURSE',
                
                // ✅ CLOUDINARY DATA
                ipfsHash: uploadResult.hash, // Reusing this field for compatibility
                cloudinaryUrl: uploadResult.url,
                cloudinaryPublicId: uploadResult.publicId,
                fileSize: uploadResult.size,
                
                qrCodeData: qrCodeURL,
                status: 'PENDING_LEVEL_1',
                approvals: {
                    level1: { status: 'PENDING' },
                    level2: { status: 'PENDING' },
                    level3: { status: 'PENDING' }
                }
            });

            await certificate.save();

            console.log(`✅ Certificate created in database: ${certificate._id}`);

            // 9. Return Success Response
            res.json({
                success: true,
                message: 'Certificate generated and submitted for Level 1 approval!',
                certificate: {
                    id: certificate._id,
                    certificateHash: uploadResult.hash,
                    qrCodeURL: qrCodeURL,
                    pdfUrl: uploadResult.url,
                    studentName: student.fullName,
                    courseName,
                    grade,
                    status: 'PENDING_LEVEL_1',
                    cloudinaryPublicId: uploadResult.publicId
                }
            });

        } catch (error) {
            console.error('❌ Certificate issuance error:', error);
            res.status(500).json({ 
                success: false,
                error: 'ISSUANCE_FAILED',
                message: error.message 
            });
        }
    }
);

// ============================================================================
// 🔍 VERIFY CERTIFICATE FROM CLOUDINARY
// ============================================================================

app.post('/api/certificate/verify-cloudinary', async (req, res) => {
    try {
        console.log('🔍 Verifying certificate from Cloudinary...');

        const { certificateHash } = req.body;

        if (!certificateHash) {
            return res.status(400).json({ 
                error: 'MISSING_HASH',
                message: 'Certificate hash is required' 
            });
        }

        // 1. Find certificate in database
        const certificate = await Certificate.findOne({
            $or: [
                { certificateHash },
                { sha256: certificateHash }
            ]
        });

        if (!certificate) {
            return res.status(404).json({
                success: false,
                verified: false,
                error: 'CERTIFICATE_NOT_FOUND',
                message: 'No certificate found with this hash'
            });
        }

        // 2. Fetch PDF from Cloudinary and verify hash
        let cloudinaryVerified = false;
        let fetchedHash = null;

        if (certificate.cloudinaryUrl) {
            try {
                const axios = require('axios');
                const response = await axios.get(certificate.cloudinaryUrl, {
                    responseType: 'arraybuffer'
                });

                const fetchedBuffer = Buffer.from(response.data);
                fetchedHash = crypto.createHash('sha256').update(fetchedBuffer).digest('hex');

                cloudinaryVerified = (fetchedHash === certificate.certificateHash);
                
                console.log('☁️  Cloudinary Hash:', fetchedHash);
                console.log('💾 Database Hash:', certificate.certificateHash);
                console.log('✅ Match:', cloudinaryVerified ? 'YES' : 'NO');

            } catch (fetchError) {
                console.warn('⚠️ Could not fetch from Cloudinary:', fetchError.message);
            }
        }

        // 3. Update verification count
        certificate.verificationCount = (certificate.verificationCount || 0) + 1;
        certificate.lastVerifiedAt = new Date();
        await certificate.save();

        // 4. Return verification result
        res.json({
            success: true,
            verified: cloudinaryVerified,
            certificate: {
                studentName: certificate.studentName,
                institutionName: certificate.institutionName,
                courseName: certificate.courseName,
                grade: certificate.grade,
                issueDate: certificate.issueDate,
                status: certificate.status,
                certificateHash: certificate.certificateHash,
                pdfUrl: certificate.cloudinaryUrl,
                qrCodeURL: certificate.qrCodeData,
                verificationCount: certificate.verificationCount,
                transactionHash: certificate.transactionHash,
                blockNumber: certificate.blockNumber,
                cloudinaryVerified,
                hashMatch: cloudinaryVerified
            }
        });

    } catch (error) {
        console.error('❌ Verification error:', error);
        res.status(500).json({ 
            success: false,
            error: 'VERIFICATION_FAILED',
            message: error.message 
        });
    }
});

// ============================================================================
// 1️⃣1️⃣ ADMIN APPROVAL WORKFLOW ROUTES
// ============================================================================

// Get Pending Approvals based on Admin Role
app.get('/api/admin/pending-approvals',
    authenticate,
    roleCheck(['admin']),
    async (req, res) => {
        try {
            console.log(`⚡ Admin fetching pending approvals. Level: ${req.user.adminLevel}`);

            const { adminLevel } = req.user;
            let queryStatus = '';

            if (adminLevel === 'DEPARTMENT_ADMIN') queryStatus = 'PENDING_LEVEL_1';
            else if (adminLevel === 'REGISTRAR') queryStatus = 'PENDING_LEVEL_2';
            else if (adminLevel === 'SUPER_ADMIN') queryStatus = 'PENDING_LEVEL_3';
            else {
                return res.json({ success: true, count: 0, certificates: [] });
            }

            const pendingCerts = await Certificate.find({ status: queryStatus }).sort({ createdAt: -1 });

            res.json({ success: true, count: pendingCerts.length, certificates: pendingCerts });

        } catch (error) {
            console.error('Pending approvals error:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// Process Certificate (Approve/Reject)
app.post('/api/admin/process-certificate',
    authenticate,
    roleCheck(['admin']),
    async (req, res) => {
        try {
            console.log(`⚡ Processing certificate. Action: ${req.body.action}`);

            const { certificateId, action, comments } = req.body;
            const { adminLevel, email } = req.user;

            const cert = await Certificate.findById(certificateId);
            if (!cert) return res.status(404).json({ error: 'CERTIFICATE_NOT_FOUND' });

            // Ensure 'approvals' object exists
            if (!cert.approvals) {
                cert.approvals = {
                    level1: { status: 'PENDING' },
                    level2: { status: 'PENDING' },
                    level3: { status: 'PENDING' }
                };
            }
            if (!cert.approvals.level1) cert.approvals.level1 = { status: 'PENDING' };
            if (!cert.approvals.level2) cert.approvals.level2 = { status: 'PENDING' };
            if (!cert.approvals.level3) cert.approvals.level3 = { status: 'PENDING' };

            // Map action to correct enum value
            let approvalStatus;
            if (action === 'APPROVE') {
                approvalStatus = 'APPROVED';
            } else if (action === 'REJECT') {
                approvalStatus = 'REJECTED';
            } else {
                approvalStatus = 'PENDING';
            }

            // --- LEVEL 1: DEPARTMENT ADMIN ---
            if (cert.status === 'PENDING_LEVEL_1' && adminLevel === 'DEPARTMENT_ADMIN') {
                cert.approvals.level1 = {
                    approvedBy: email,
                    date: new Date(),
                    comments: comments || 'Processed by Dept Admin',
                    status: approvalStatus
                };

                if (action === 'APPROVE') cert.status = 'PENDING_LEVEL_2';
                else if (action === 'REJECT') cert.status = 'REJECTED';
                else if (action === 'CORRECTION') cert.status = 'NEEDS_CORRECTION';
            }

            // --- LEVEL 2: REGISTRAR ---
            else if (cert.status === 'PENDING_LEVEL_2' && adminLevel === 'REGISTRAR') {
                cert.approvals.level2 = {
                    approvedBy: email,
                    date: new Date(),
                    comments: comments || 'Processed by Registrar',
                    status: approvalStatus
                };

                if (action === 'APPROVE') cert.status = 'PENDING_LEVEL_3';
                else if (action === 'REJECT') cert.status = 'REJECTED';
            }

            // --- LEVEL 3: SUPER ADMIN (FINAL) ---
            else if (cert.status === 'PENDING_LEVEL_3' && adminLevel === 'SUPER_ADMIN') {
                cert.approvals.level3 = {
                    approvedBy: email,
                    date: new Date(),
                    comments: comments || 'Processed by Super Admin',
                    status: approvalStatus
                };

                if (action === 'APPROVE') {
                    // Optional: Blockchain write
                    if (contract && req.user.wallet) {
                        try {
                            const hashBytes32 = '0x' + cert.certificateHash;
                            const tx = await contract.methods.issueCertificate(
                                hashBytes32,
                                cert.studentCode,
                                cert.courseName,
                                cert.grade,
                                Math.floor(cert.issueDate.getTime() / 1000),
                                cert.expiryDate ? Math.floor(cert.expiryDate.getTime() / 1000) : 0,
                                cert.ipfsHash || '',
                                cert.certificateHash
                            ).send({ from: req.user.wallet, gas: 3000000 });

                            cert.transactionHash = tx.transactionHash;
                            cert.blockNumber = tx.blockNumber;
                            console.log(`✅ Blockchain TX: ${tx.transactionHash}`);
                        } catch (bcError) {
                            console.warn('⚠️ Blockchain write failed:', bcError.message);
                        }
                    }
                    cert.status = 'ISSUED';
                    cert.verified = true;
                } else if (action === 'REJECT') {
                    cert.status = 'REJECTED';
                }
            } else {
                return res.status(403).json({
                    error: 'PERMISSION_DENIED',
                    message: `You (${adminLevel}) cannot process a certificate at stage: ${cert.status}`
                });
            }

            if (action === 'REJECT' || action === 'CORRECTION') {
                cert.rejectionReason = comments;
            }

            cert.markModified('approvals');
            await cert.save();

            console.log(`✅ Certificate ${action}: ${cert._id} → ${cert.status}`);

            res.json({
                success: true,
                message: `Certificate ${action.toLowerCase()}d successfully`,
                newStatus: cert.status
            });

        } catch (error) {
            console.error('Process error:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// ============================================================================
// 1️⃣2️⃣ INSTITUTION DASHBOARD
// ============================================================================

app.get('/api/institution/dashboard',
    authenticate,
    roleCheck(['institution']),
    async (req, res) => {
        try {
            console.log('📊 Fetching institution dashboard');

            const institutionQuery = req.user.walletAddress
                ? { 'blockchain.walletAddress': req.user.walletAddress }
                : { email: req.user.email };

            const institution = await Institution.findOne(institutionQuery);
            if (!institution) {
                return res.status(404).json({ error: 'INSTITUTION_NOT_FOUND' });
            }

            const certQuery = req.user.walletAddress
                ? { institutionAddress: req.user.walletAddress }
                : { institutionAddress: req.user.email };

            const allCertificates = await Certificate.find(certQuery).sort({ createdAt: -1 });
            const issuedCertificates = await Certificate.find({
                ...certQuery,
                status: 'ISSUED'
            });
            const pendingCertificates = await Certificate.find({
                ...certQuery,
                status: { $in: ['PENDING_LEVEL_1', 'PENDING_LEVEL_2', 'PENDING_LEVEL_3'] }
            });

            const studentQuery = req.user.walletAddress
                ? { institutionAddress: req.user.walletAddress }
                : { institutionAddress: req.user.email };

            const students = await Student.find(studentQuery);

            res.json({
                success: true,
                institution,
                stats: {
                    totalCertificates: allCertificates.length,
                    issuedCertificates: issuedCertificates.length,
                    pendingCertificates: pendingCertificates.length,
                    totalStudents: students.length,
                    certificatesRevoked: institution.statistics?.certificatesRevoked || 0
                },
                recentCertificates: allCertificates.slice(0, 10)
            });

        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// ============================================================================
// 1️⃣3️⃣ GET INSTITUTION STUDENTS
// ============================================================================

// ============================================================================
// 1️⃣3️⃣ GET INSTITUTION STUDENTS (FIXED)
// ============================================================================

app.get('/api/institution/students',
    authenticate,
    roleCheck(['institution']),
    async (req, res) => {
        try {
            console.log('👨‍🎓 Fetching institution students...');
            console.log(`   🔍 Logged in as: ${req.user.institutionCode} (${req.user.email})`);

            // 1. Define all possible ways a student might be linked to this institution
            const identifiers = [
                req.user.institutionCode,  // MATCH BY CODE (Most common)
                req.user.email             // MATCH BY EMAIL
            ];

            if (req.user.walletAddress) {
                identifiers.push(req.user.walletAddress); // MATCH BY WALLET
            }

            // 2. Query MongoDB
            // We look for students who have your Code OR your Email OR your Wallet
            const students = await Student.find({
                $or: [
                    { institutionCode: req.user.institutionCode },       // Direct code match (Best)
                    { institutionAddress: { $in: identifiers } },        // Address field match
                    { institutionName: req.user.institutionCode }        // Name fallback
                ]
            }).sort({ createdAt: -1 });

            console.log(`   ✅ Found ${students.length} students.`);

            res.json({
                success: true,
                count: students.length,
                students: students
            });

        } catch (error) {
            console.error('❌ Get students error:', error);
            res.status(500).json({ error: error.message });
        }
    }
);
// ============================================================================
// 1️⃣4️⃣ REVOKE CERTIFICATE
// ============================================================================

app.post('/api/certificate/revoke',
    authenticate,
    roleCheck(['institution']),
    async (req, res) => {
        try {
            console.log('🚫 Revoking certificate');

            const { certificateHash, reason } = req.body;

            if (!certificateHash || !reason) {
                return res.status(400).json({ error: 'Missing certificate hash or reason' });
            }

            const revokerAddress = req.user.walletAddress || req.user.email;

            const certificate = await Certificate.findOne({
                $or: [{ certificateHash }, { sha256: certificateHash }],
                institutionAddress: revokerAddress
            });

            if (!certificate) {
                return res.status(404).json({ error: 'CERTIFICATE_NOT_FOUND' });
            }

            if (certificate.status === 'REVOKED') {
                return res.status(400).json({ error: 'ALREADY_REVOKED' });
            }

            certificate.status = 'REVOKED';
            certificate.rejectionReason = reason;
            certificate.revokedAt = new Date();
            certificate.revokedBy = revokerAddress;
            await certificate.save();

            const institutionQuery = req.user.walletAddress
                ? { 'blockchain.walletAddress': req.user.walletAddress }
                : { email: req.user.email };
            const institution = await Institution.findOne(institutionQuery);
            if (institution && institution.statistics) {
                institution.statistics.certificatesRevoked = (institution.statistics.certificatesRevoked || 0) + 1;
                await institution.save();
            }

            console.log(`✅ Certificate revoked: ${certificateHash}`);

            res.json({
                success: true,
                message: 'Certificate revoked successfully',
                certificate: {
                    certificateHash: certificate.certificateHash,
                    status: certificate.status,
                    revocationReason: reason
                }
            });

        } catch (error) {
            console.error('Revocation error:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// ============================================================================
// 1️⃣5️⃣ ADMIN LOGIN
// ============================================================================

app.post('/api/admin/login', async (req, res) => {
    try {
        console.log('🔐 Admin credential authentication request');

        const { email, secretCode, mnemonic12Words } = req.body;

        if (!email || !secretCode || !mnemonic12Words) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_CREDENTIALS',
                message: 'Email, secret code, and 12-word mnemonic are required'
            });
        }

        const verification = verifyAdminCredentials(email, secretCode, mnemonic12Words);

        if (!verification.success) {
            console.warn(`❌ Failed admin login attempt: ${email}`);
            return res.status(401).json({
                success: false,
                error: verification.error,
                message: verification.message
            });
        }

        const admin = verification.admin;

        const token = jwt.sign(
            {
                email: admin.email,
                role: 'admin',
                adminLevel: admin.role,
                type: 'ADMIN',
                wallet: admin.wallet,
                loginTime: Date.now()
            },
            process.env.JWT_SECRET || 'secret-key',
            { expiresIn: '24h' }
        );

        console.log(`✅ Admin authenticated: ${admin.email} (${admin.role})`);

        res.json({
            success: true,
            message: '✅ Admin authentication successful',
            token,
            admin: {
                email: admin.email,
                role: admin.role,
                adminLevel: admin.role,
                permissions: getAdminPermissions(admin.role),
                loginTime: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            error: 'AUTH_ERROR',
            message: error.message
        });
    }
});

// ============================================================================
// 1️⃣6️⃣ GET ALL INSTITUTIONS (ADMIN)
// ============================================================================

app.get('/api/admin/institutions',
    authenticate,
    roleCheck(['admin']),
    async (req, res) => {
        try {
            console.log('🏫 Fetching all institutions');
            const institutions = await Institution.find().sort({ createdAt: -1 });
            res.json({ success: true, institutions, total: institutions.length });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// ============================================================================
// 1️⃣7️⃣ APPROVE INSTITUTION (ADMIN)
// ============================================================================

app.post('/api/admin/approve-institution/:id',
    authenticate,
    roleCheck(['admin']),
    async (req, res) => {
        try {
            const { id } = req.params;
            console.log(`✅ Approving institution: ${id}`);

            let institution = await Institution.findOne({
                $or: [
                    { 'blockchain.walletAddress': id.toLowerCase() },
                    { institutionCode: id },
                    { email: id }
                ]
            });

            if (!institution && mongoose.Types.ObjectId.isValid(id)) {
                institution = await Institution.findById(id);
            }

            if (!institution) {
                return res.status(404).json({ error: 'INSTITUTION_NOT_FOUND' });
            }

            institution.status.application = 'APPROVED';
            institution.approval = {
                approvedBy: req.user.email,
                approvedAt: new Date(),
                approvalCode: `APR-${Date.now()}`,
                comments: req.body.comments || 'Approved by admin'
            };
            await institution.save();

            if (contract && institution.blockchain?.walletAddress) {
                try {
                    await contract.methods.approveInstitution(
                        institution.blockchain.walletAddress
                    ).send({ from: req.user.wallet, gas: 500000 });
                    console.log('⛓️ Institution approved on blockchain');
                } catch (bcError) {
                    console.warn('⚠️ Blockchain approval failed:', bcError.message);
                }
            }

            console.log(`✅ Institution approved: ${institution.name}`);

            res.json({
                success: true,
                message: 'Institution approved successfully',
                institution
            });

        } catch (error) {
            console.error('Approval error:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// ============================================================================
// 1️⃣8️⃣ REJECT INSTITUTION (ADMIN)
// ============================================================================

app.post('/api/admin/reject-institution/:id',
    authenticate,
    roleCheck(['admin']),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            console.log(`❌ Rejecting institution: ${id}`);

            let institution = await Institution.findOne({
                $or: [
                    { 'blockchain.walletAddress': id.toLowerCase() },
                    { institutionCode: id },
                    { email: id }
                ]
            });

            if (!institution && mongoose.Types.ObjectId.isValid(id)) {
                institution = await Institution.findById(id);
            }

            if (!institution) {
                return res.status(404).json({ error: 'INSTITUTION_NOT_FOUND' });
            }

            institution.status.application = 'REJECTED';
            institution.rejection = {
                rejectedBy: req.user.email,
                rejectedAt: new Date(),
                reason: reason || 'Rejected by admin'
            };
            await institution.save();

            res.json({
                success: true,
                message: 'Institution rejected',
                institution
            });

        } catch (error) {
            console.error('Rejection error:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// ============================================================================
// 1️⃣9️⃣ ADMIN DASHBOARD STATS
// ============================================================================

app.get('/api/admin/stats',
    authenticate,
    roleCheck(['admin']),
    async (req, res) => {
        try {
            console.log('📊 Fetching admin stats');

            const totalInstitutions = await Institution.countDocuments();
            const approvedInstitutions = await Institution.countDocuments({
                'status.application': 'APPROVED'
            });
            const pendingInstitutions = await Institution.countDocuments({
                'status.application': 'PENDING'
            });
            const totalStudents = await Student.countDocuments();
            const totalCertificates = await Certificate.countDocuments();
            const issuedCertificates = await Certificate.countDocuments({
                status: 'ISSUED'
            });
            const pendingCertificates = await Certificate.countDocuments({
                status: { $in: ['PENDING_LEVEL_1', 'PENDING_LEVEL_2', 'PENDING_LEVEL_3'] }
            });
            const rejectedCertificates = await Certificate.countDocuments({
                status: 'REJECTED'
            });

            let blockchainStats = null;
            if (contract) {
                try {
                    const stats = await contract.methods.getContractStats().call();
                    blockchainStats = {
                        issued: stats.issued || stats[0],
                        verified: stats.verified || stats[1],
                        revoked: stats.revoked || stats[2],
                        institutionCount: stats.institutionCount || stats[3]
                    };
                } catch (e) {
                    console.warn('Could not fetch blockchain stats');
                }
            }

            res.json({
                success: true,
                stats: {
                    totalInstitutions,
                    approvedInstitutions,
                    pendingInstitutions,
                    totalStudents,
                    totalCertificates,
                    issuedCertificates,
                    pendingCertificates,
                    rejectedCertificates,
                    blockchainStats
                }
            });

        } catch (error) {
            console.error('Admin stats error:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// ============================================================================
// 2️⃣0️⃣ BLOCKCHAIN VERIFY
// ============================================================================

app.post('/api/blockchain/verify', async (req, res) => {
    try {
        console.log('⛓️ Blockchain verification request');

        const { certificateHash } = req.body;
        if (!certificateHash) {
            return res.status(400).json({ error: 'Missing certificate hash' });
        }

        const dbCertificate = await Certificate.findOne({
            $or: [{ certificateHash }, { sha256: certificateHash }]
        });

        let blockchainResult = null;
        if (contract) {
            try {
                const hashBytes32 = certificateHash.startsWith('0x')
                    ? certificateHash : '0x' + certificateHash;
                const result = await contract.methods.verifyCertificate(hashBytes32).call();
                blockchainResult = {
                    isValid: result.isValid || result[0],
                    message: result.message || result[1]
                };
            } catch (bcError) {
                console.warn('Blockchain verification failed:', bcError.message);
            }
        }

        if (!dbCertificate && !blockchainResult) {
            return res.status(404).json({
                success: false, verified: false, error: 'CERTIFICATE_NOT_FOUND'
            });
        }

        if (dbCertificate) {
            dbCertificate.verificationCount++;
            await dbCertificate.save();
        }

        res.json({
            success: true,
            verified: true,
            database: dbCertificate ? {
                studentName: dbCertificate.studentName,
                institutionName: dbCertificate.institutionName,
                courseName: dbCertificate.courseName,
                grade: dbCertificate.grade,
                status: dbCertificate.status,
                issueDate: dbCertificate.issueDate,
                transactionHash: dbCertificate.transactionHash
            } : null,
            blockchain: blockchainResult
        });

    } catch (error) {
        console.error('Blockchain verify error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// 2️⃣1️⃣ GET CERTIFICATE FILE
// ============================================================================

app.get('/api/certificate/file/:hash', async (req, res) => {
    try {
        const { hash } = req.params;
        const certificate = await Certificate.findOne({
            $or: [{ certificateHash: hash }, { sha256: hash }, { ipfsHash: hash }],
            status: 'ISSUED'
        });

        if (!certificate || !certificate.fileData) {
            return res.status(404).json({ error: 'FILE_NOT_FOUND' });
        }

        const fileBuffer = Buffer.from(certificate.fileData, 'base64');
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="certificate-${hash.substring(0, 8)}.pdf"`,
            'Content-Length': fileBuffer.length
        });
        res.send(fileBuffer);

    } catch (error) {
        console.error('Get file error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// 2️⃣2️⃣ STUDENT PROFILE
// ============================================================================

app.get('/api/student/profile',
    authenticate,
    roleCheck(['student']),
    async (req, res) => {
        try {
            const student = await Student.findOne({ studentCode: req.user.studentCode });
            if (!student) {
                return res.status(404).json({ error: 'STUDENT_NOT_FOUND' });
            }

            const certificateCount = await Certificate.countDocuments({
                studentCode: req.user.studentCode,
                status: 'ISSUED'
            });

            res.json({
                success: true,
                student: {
                    studentCode: student.studentCode,
                    fullName: student.fullName,
                    email: student.email,
                    institutionName: student.institutionName,
                    createdAt: student.createdAt
                },
                certificateCount
            });

        } catch (error) {
            console.error('Profile error:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// ============================================================================
// 2️⃣3️⃣ INSTITUTION PROFILE
// ============================================================================

app.get('/api/institution/profile',
    authenticate,
    roleCheck(['institution']),
    async (req, res) => {
        try {
            const institutionQuery = req.user.email
                ? { email: req.user.email }
                : { 'blockchain.walletAddress': req.user.walletAddress };

            const institution = await Institution.findOne(institutionQuery);
            if (!institution) {
                return res.status(404).json({ error: 'INSTITUTION_NOT_FOUND' });
            }

            res.json({
                success: true,
                institution: {
                    name: institution.name,
                    email: institution.email,
                    institutionCode: institution.institutionCode,
                    accreditationId: institution.accreditationId,
                    status: institution.status.application,
                    isApproved: institution.status.application === 'APPROVED',
                    statistics: institution.statistics,
                    createdAt: institution.createdAt
                }
            });

        } catch (error) {
            console.error('Profile error:', error);
            res.status(500).json({ error: error.message });
        }
    }
);

// ============================================================================
// 🆕 DEVELOPER ENDPOINT
// ============================================================================

app.get('/api/developer/admin-setup', (req, res) => {
    const devKey = req.headers['x-developer-key'];
    if (devKey !== process.env.DEVELOPER_KEY) {
        return res.status(403).json({ error: 'UNAUTHORIZED', message: 'Set X-DEVELOPER-KEY header' });
    }

    console.log('⚠️ Developer retrieved admin credentials');

    const adminsList = Object.entries(ADMIN_CREDENTIALS).map(([key, admin]) => ({
        id: key,
        email: admin.email,
        secretCode: admin.secretCode,
        mnemonic: admin.mnemonic,
        role: admin.role,
        wallet: admin.wallet,
        active: admin.active
    }));

    res.json({
        success: true,
        message: '⚠️ DEVELOPER ENDPOINT - Remove in production!',
        admins: adminsList
    });
});

// ============================================================================
// 🆕 PUBLIC CERTIFICATE VIEW (For QR Code Scanning)
// ============================================================================

app.get('/certificate/:hash', async (req, res) => {
    try {
        const { hash } = req.params;
        console.log(`📱 QR Code scanned for certificate: ${hash}`);

        const certificate = await Certificate.findOne({
            $or: [
                { certificateHash: hash },
                { sha256: hash },
                { _id: mongoose.Types.ObjectId.isValid(hash) ? hash : null }
            ]
        });

        if (!certificate) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Certificate Not Found</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            min-height: 100vh;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            padding: 20px;
                        }
                        .card {
                            background: white;
                            border-radius: 20px;
                            padding: 40px;
                            max-width: 500px;
                            width: 100%;
                            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                            text-align: center;
                        }
                        .error-icon {
                            font-size: 64px;
                            margin-bottom: 20px;
                        }
                        h1 {
                            color: #e74c3c;
                            margin-bottom: 10px;
                            font-size: 24px;
                        }
                        p {
                            color: #666;
                            line-height: 1.6;
                        }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="error-icon">❌</div>
                        <h1>Certificate Not Found</h1>
                        <p>No certificate found with this QR code.<br>Please verify the code and try again.</p>
                    </div>
                </body>
                </html>
            `);
        }

        // Increment verification count
        certificate.verificationCount = (certificate.verificationCount || 0) + 1;
        certificate.lastVerifiedAt = new Date();
        await certificate.save();

        const statusColor = {
            'ISSUED': '#27ae60',
            'PENDING_LEVEL_1': '#f39c12',
            'PENDING_LEVEL_2': '#f39c12',
            'PENDING_LEVEL_3': '#f39c12',
            'REJECTED': '#e74c3c',
            'REVOKED': '#e74c3c',
            'NEEDS_CORRECTION': '#e67e22'
        }[certificate.status] || '#95a5a6';

        const statusEmoji = {
            'ISSUED': '✅',
            'PENDING_LEVEL_1': '⏳',
            'PENDING_LEVEL_2': '⏳',
            'PENDING_LEVEL_3': '⏳',
            'REJECTED': '❌',
            'REVOKED': '🚫',
            'NEEDS_CORRECTION': '⚠️'
        }[certificate.status] || '📄';

        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${certificate.studentName} - Certificate</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        padding: 20px;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                    }
                    .header {
                        text-align: center;
                        color: white;
                        margin-bottom: 30px;
                    }
                    .header h1 {
                        font-size: 28px;
                        margin-bottom: 10px;
                        text-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    }
                    .header p {
                        opacity: 0.9;
                        font-size: 14px;
                    }
                    .card {
                        background: white;
                        border-radius: 20px;
                        overflow: hidden;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        margin-bottom: 20px;
                    }
                    .status-banner {
                        background: ${statusColor};
                        color: white;
                        padding: 15px;
                        text-align: center;
                        font-weight: 600;
                        font-size: 16px;
                    }
                    .card-content {
                        padding: 30px;
                    }
                    .student-name {
                        font-size: 24px;
                        font-weight: 700;
                        color: #2c3e50;
                        margin-bottom: 5px;
                        text-align: center;
                    }
                    .student-code {
                        text-align: center;
                        color: #7f8c8d;
                        font-size: 14px;
                        margin-bottom: 25px;
                    }
                    .info-grid {
                        display: grid;
                        gap: 20px;
                    }
                    .info-item {
                        border-bottom: 1px solid #ecf0f1;
                        padding-bottom: 12px;
                    }
                    .info-label {
                        font-size: 12px;
                        color: #95a5a6;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 5px;
                    }
                    .info-value {
                        font-size: 16px;
                        color: #2c3e50;
                        font-weight: 500;
                    }
                    .grade {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 20px;
                        border-radius: 12px;
                        text-align: center;
                        margin: 20px 0;
                    }
                    .grade-label {
                        font-size: 12px;
                        opacity: 0.9;
                        margin-bottom: 5px;
                    }
                    .grade-value {
                        font-size: 32px;
                        font-weight: 700;
                    }
                    .blockchain-badge {
                        background: #f8f9fa;
                        border-radius: 12px;
                        padding: 15px;
                        margin-top: 20px;
                        text-align: center;
                    }
                    .blockchain-badge .icon {
                        font-size: 24px;
                        margin-bottom: 8px;
                    }
                    .blockchain-badge .text {
                        font-size: 12px;
                        color: #666;
                    }
                    .verification-count {
                        background: #e8f5e9;
                        color: #2e7d32;
                        padding: 10px;
                        border-radius: 8px;
                        text-align: center;
                        font-size: 13px;
                        margin-top: 15px;
                    }
                    .footer {
                        text-align: center;
                        color: white;
                        font-size: 12px;
                        margin-top: 20px;
                        opacity: 0.8;
                    }
                    .hash-box {
                        background: #f8f9fa;
                        border: 2px dashed #dee2e6;
                        border-radius: 8px;
                        padding: 12px;
                        margin-top: 15px;
                        word-break: break-all;
                        font-family: 'Courier New', monospace;
                        font-size: 11px;
                        color: #495057;
                    }
                    @media (max-width: 480px) {
                        .card-content {
                            padding: 20px;
                        }
                        .student-name {
                            font-size: 20px;
                        }
                        .grade-value {
                            font-size: 28px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎓 Certificate Verification</h1>
                        <p>Blockchain-Verified Academic Certificate</p>
                    </div>

                    <div class="card">
                        <div class="status-banner">
                            ${statusEmoji} ${certificate.status.replace(/_/g, ' ')}
                        </div>
                        
                        <div class="card-content">
                            <div class="student-name">${certificate.studentName}</div>
                            <div class="student-code">${certificate.studentCode}</div>

                            <div class="grade">
                                <div class="grade-label">GRADE ACHIEVED</div>
                                <div class="grade-value">${certificate.grade}</div>
                            </div>

                            <div class="info-grid">
                                <div class="info-item">
                                    <div class="info-label">📚 Course Name</div>
                                    <div class="info-value">${certificate.courseName}</div>
                                </div>

                                <div class="info-item">
                                    <div class="info-label">🏛️ Institution</div>
                                    <div class="info-value">${certificate.institutionName}</div>
                                </div>

                                <div class="info-item">
                                    <div class="info-label">📅 Issue Date</div>
                                    <div class="info-value">${new Date(certificate.issueDate).toLocaleDateString('en-US', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}</div>
                                </div>

                                ${certificate.expiryDate ? `
                                <div class="info-item">
                                    <div class="info-label">⏰ Expiry Date</div>
                                    <div class="info-value">${new Date(certificate.expiryDate).toLocaleDateString('en-US', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}</div>
                                </div>
                                ` : ''}

                                <div class="info-item">
                                    <div class="info-label">📧 Student Email</div>
                                    <div class="info-value">${certificate.studentEmail}</div>
                                </div>
                            </div>

                            ${certificate.transactionHash ? `
                            <div class="blockchain-badge">
                                <div class="icon">⛓️</div>
                                <div class="text">
                                    <strong>Blockchain Verified</strong><br>
                                    TX: ${certificate.transactionHash.substring(0, 10)}...${certificate.transactionHash.substring(certificate.transactionHash.length - 8)}
                                    ${certificate.blockNumber ? `<br>Block: ${certificate.blockNumber}` : ''}
                                </div>
                            </div>
                            ` : ''}

                            <div class="verification-count">
                                🔍 Verified ${certificate.verificationCount || 1} time(s)
                            </div>

                            <div class="hash-box">
                                <div style="font-weight: 600; margin-bottom: 5px; color: #6c757d;">Certificate Hash:</div>
                                ${certificate.certificateHash}
                            </div>
                        </div>
                    </div>

                    <div class="footer">
                        🔐 Secured by CertChain<br>
                        Scanned at ${new Date().toLocaleString()}
                    </div>
                </div>
            </body>
            </html>
        `;

        res.send(html);

    } catch (error) {
        console.error('QR view error:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background: #f44336;
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        text-align: center;
                        padding: 20px;
                    }
                    h1 { font-size: 48px; margin-bottom: 10px; }
                    p { font-size: 18px; }
                </style>
            </head>
            <body>
                <div>
                    <h1>⚠️</h1>
                    <h1>Error</h1>
                    <p>${error.message}</p>
                </div>
            </body>
            </html>
        `);
    }
});

// ============================================================================
// ❗ ERROR HANDLING (MUST BE LAST - AFTER ALL ROUTES)
// ============================================================================

// Handle multer errors
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error('Multer error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'FILE_TOO_LARGE',
                message: 'File size exceeds the 5MB limit'
            });
        }
        return res.status(400).json({
            error: 'UPLOAD_ERROR',
            message: err.message
        });
    }
    if (err.message && err.message.includes('Invalid file type')) {
        return res.status(400).json({
            error: 'INVALID_FILE_TYPE',
            message: err.message
        });
    }
    next(err);
});

// 404 catch-all (MUST be after ALL route definitions)
app.use((req, res) => {
    res.status(404).json({
        error: 'ENDPOINT_NOT_FOUND',
        message: `No route found for ${req.method} ${req.originalUrl}`
    });
});

// Generic error handler
app.use((err, req, res, next) => {
    console.error('🔥 Server error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

// ============ START SERVER ============

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════╗
║   ✅ CertChain Backend Running!            ║
╠════════════════════════════════════════════╣
║ 🌐 Server: http://localhost:${PORT}            ║
║ 💾 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected    ' : '⏳ Connecting...'}        ║
║ 🔐 Admin System: ✅ Dual-Factor Auth      ║
║ 🔑 IPFS: Disabled (using MongoDB)         ║
║ 🚀 Workflow: ✅ 3-Level Approval          ║
╠════════════════════════════════════════════╣
║ 🏛️  INSTITUTION AUTH: Email/Password       ║
║ 📝 Registration: Form + File Upload       ║
║ 🔐 Login: Email + Password (bcrypt)       ║
║ 📧 Email Verification: Token-based        ║
║ 🔑 Password Reset: Supported              ║
╠════════════════════════════════════════════╣
║ 📜 CERTIFICATE WORKFLOW:                   ║
║   Level 1: Department Admin (Review)      ║
║   Level 2: Registrar (Verify)             ║
║   Level 3: Super Admin (Approve+Chain)    ║
╠════════════════════════════════════════════╣
║ 🔑 5 ADMINS CONFIGURED:                    ║
║   ✅ admin1@certchain.io (SUPER_ADMIN)    ║
║   ✅ admin2@certchain.io (DEPT_ADMIN)     ║
║   ✅ admin3@certchain.io (REGISTRAR)      ║
║   ✅ admin4@certchain.io (IT_ADMIN)       ║
║   ✅ admin5@certchain.io (SUPER_ADMIN)    ║
╠════════════════════════════════════════════╣
║ 📡 KEY ENDPOINTS:                          ║
║   POST /api/institution/register           ║
║   POST /api/institution/login              ║
║   POST /api/admin/login                    ║
║   POST /api/certificate/issue              ║
║   GET  /api/admin/pending-approvals        ║
║   POST /api/admin/process-certificate      ║
║   GET  /api/admin/institutions             ║
╚════════════════════════════════════════════╝
    `);
});

module.exports = app;