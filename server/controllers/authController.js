// controllers/authController.js
const Institution = require('../models/Institution');
const LoginAudit = require('../models/LoginAudit');
const AuthService = require('../services/authService');
const EmailService = require('../services/emailService');
const { validateEmail, validatePassword } = require('../utils/validators');
const { parseUserAgent } = require('../utils/userAgentParser');
const crypto = require('crypto');

// ✅ Global environment check (declared once)
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_DEVELOPMENT = NODE_ENV !== 'production';

console.log('🔧 Auth Controller Loaded');
console.log('  - NODE_ENV:', NODE_ENV);
console.log('  - IS_DEVELOPMENT:', IS_DEVELOPMENT);

/**
 * INSTITUTION REGISTRATION
 * POST /api/institution/register
 */
exports.register = async (req, res) => {
    console.log('═══════════════════════════════════════════');
    console.log('📥 REGISTRATION REQUEST RECEIVED');
    console.log('═══════════════════════════════════════════');
    console.log('🔧 Environment:', NODE_ENV, IS_DEVELOPMENT ? '(DEV MODE)' : '(PROD MODE)');

    try {
        console.log('📋 Body:', req.body);
        console.log('📁 Files:', req.files ? Object.keys(req.files) : 'No files');

        const { name, email, phone, address, website, accreditationId } = req.body;

        // ✅ Correct way to access multer.fields() files
        const accreditationProof = req.files?.accreditationProof?.[0] || null;
        const officialLetter = req.files?.officialLetter?.[0] || null;
        const identityProof = req.files?.identityProof?.[0] || null;

        console.log('📄 Files extracted:', {
            accreditationProof: accreditationProof?.originalname || '❌ Not provided',
            officialLetter: officialLetter?.originalname || '❌ Not provided',
            identityProof: identityProof?.originalname || '❌ Not provided'
        });

        // ═══════════════════════════════════════════
        // VALIDATION
        // ═══════════════════════════════════════════

        if (!name || !email || !accreditationId) {
            console.log('❌ Missing required fields');
            return res.status(400).json({
                success: false,
                error: 'MISSING_REQUIRED_FIELDS',
                message: 'Name, email, and accreditation ID are required',
                missing: {
                    name: !name,
                    email: !email,
                    accreditationId: !accreditationId
                }
            });
        }
        console.log('✅ Required fields present');

        // Email validation
        const basicEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!basicEmailValid) {
            console.log('❌ Invalid email format');
            return res.status(422).json({
                success: false,
                error: 'INVALID_EMAIL',
                message: 'Please enter a valid email address'
            });
        }
        console.log('✅ Email format valid');

        // Institutional domain check (only in production)
        if (!IS_DEVELOPMENT) {
            console.log('🏛️ Checking institutional domain (production mode)...');
            const institutionalPatterns = [
                /@.*\.edu$/i,
                /@.*\.edu\./i,
                /@.*\.ac\./i,
                /@.*\.org$/i,
                /@.*\.org\./i,
                /@.*\.gov$/i,
                /@.*\.gov\./i,
                /@.*\.university/i,
                /@.*\.college/i,
                /@.*\.institute/i,
                /@.*\.school/i,
            ];

            const isInstitutional = institutionalPatterns.some(p => p.test(email));

            if (!isInstitutional) {
                console.log('❌ Non-institutional domain');
                return res.status(422).json({
                    success: false,
                    error: 'INVALID_EMAIL_DOMAIN',
                    message: 'Email must be from institutional domain (.edu, .ac.xx, .org, .gov)'
                });
            }
            console.log('✅ Institutional domain validated');
        } else {
            console.log('✅ Skipping domain check (development mode)');
        }

        // ═══════════════════════════════════════════
        // DUPLICATE CHECK
        // ═══════════════════════════════════════════

        console.log('🔍 Checking for duplicates...');
        const existing = await Institution.findOne({
            $or: [
                { email: email.toLowerCase() },
                { accreditationId }
            ]
        });

        if (existing) {
            console.log('❌ Duplicate found:', existing.email);
            return res.status(409).json({
                success: false,
                error: 'DUPLICATE_INSTITUTION',
                message: 'An institution with this email or accreditation ID already exists'
            });
        }
        console.log('✅ No duplicates found');

        // ═══════════════════════════════════════════
        // DOCUMENT CHECK - ✅ FIXED FOR DEVELOPMENT
        // ═══════════════════════════════════════════

        const hasAllDocuments = accreditationProof && officialLetter && identityProof;
        console.log('📄 Document status:', {
            hasAllDocuments,
            isDevelopment: IS_DEVELOPMENT,
            shouldRequireDocuments: !IS_DEVELOPMENT && !hasAllDocuments
        });

        // ✅ ONLY require documents in PRODUCTION
        if (!IS_DEVELOPMENT && !hasAllDocuments) {
            console.log('❌ Missing documents in production mode');
            return res.status(400).json({
                success: false,
                error: 'MISSING_DOCUMENTS',
                message: 'All three documents are required',
                documents: {
                    accreditationProof: !!accreditationProof,
                    officialLetter: !!officialLetter,
                    identityProof: !!identityProof
                }
            });
        }

        if (IS_DEVELOPMENT && !hasAllDocuments) {
            console.log('⚠️ Documents missing but allowed in development mode');
        } else {
            console.log('✅ Documents check passed');
        }

        // ═══════════════════════════════════════════
        // UPLOAD DOCUMENTS (if provided)
        // ═══════════════════════════════════════════

        let uploadedFiles = {
            accreditationProof: null,
            officialLetter: null,
            identityProof: null
        };

        if (hasAllDocuments) {
            console.log('📤 Uploading documents...');
            uploadedFiles = await uploadDocuments({
                accreditationProof,
                officialLetter,
                identityProof
            });
            console.log('✅ Documents uploaded');
        }

        // ═══════════════════════════════════════════
        // CREATE INSTITUTION
        // ═══════════════════════════════════════════

        console.log('🔐 Generating credentials...');
        const tempPassword = generateTemporaryPassword();
        const institutionCode = Institution.generateInstitutionCode(name);
        console.log('✅ Institution code:', institutionCode);

        console.log('🏛️ Creating institution record...');
        const institution = new Institution({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone?.trim() || '',
            address: address?.trim() || '',
            website: website?.trim() || '',
            accreditationId: accreditationId.trim(),
            passwordHash: tempPassword,
            institutionCode,
            documents: {
                accreditationProof: accreditationProof ? {
                    fileName: accreditationProof.originalname,
                    fileUrl: uploadedFiles.accreditationProof,
                    uploadedAt: new Date(),
                    verified: false
                } : null,
                officialLetter: officialLetter ? {
                    fileName: officialLetter.originalname,
                    fileUrl: uploadedFiles.officialLetter,
                    uploadedAt: new Date(),
                    verified: false
                } : null,
                identityProof: identityProof ? {
                    fileName: identityProof.originalname,
                    fileUrl: uploadedFiles.identityProof,
                    uploadedAt: new Date(),
                    verified: false
                } : null
            },
            status: {
                application: 'PENDING'
            }
        });

        console.log('📧 Generating email verification token...');
        const emailVerificationToken = institution.generateEmailVerificationToken();

        console.log('💾 Saving to database...');
        await institution.save();
        console.log('✅ Institution saved with ID:', institution._id);

        // ═══════════════════════════════════════════
        // SEND EMAIL (optional in development)
        // ═══════════════════════════════════════════

        let emailSent = false;
        try {
            console.log('📧 Attempting to send confirmation email...');
            await EmailService.sendRegistrationConfirmation(email, {
                institutionName: name,
                applicationId: institution._id,
                emailVerificationLink: `${process.env.FRONTEND_URL}/institution/verify-email?token=${emailVerificationToken}`,
                tempPassword
            });
            emailSent = true;
            console.log('✅ Email sent successfully');
        } catch (emailError) {
            console.error('⚠️ Email failed:', emailError.message);
            if (!IS_DEVELOPMENT) {
                throw emailError;
            }
            console.log('⚠️ Continuing without email (development mode)');
        }

        // ═══════════════════════════════════════════
        // SUCCESS RESPONSE
        // ═══════════════════════════════════════════

        console.log('═══════════════════════════════════════════');
        console.log('🎉 REGISTRATION SUCCESSFUL');
        console.log('═══════════════════════════════════════════');

        const response = {
            success: true,
            message: 'Registration submitted successfully!',
            applicationId: institution._id,
            email: institution.email,
            institutionCode: institution.institutionCode,
            nextStep: 'Verify email and wait for admin approval'
        };

        // Include debug info in development
        if (IS_DEVELOPMENT) {
            response.debug = {
                tempPassword,
                emailVerificationToken,
                emailSent,
                documentsUploaded: hasAllDocuments,
                environment: NODE_ENV
            };
        }

        return res.status(201).json(response);

    } catch (error) {
        console.log('═══════════════════════════════════════════');
        console.error('💥 REGISTRATION ERROR');
        console.log('═══════════════════════════════════════════');
        console.error('Name:', error.name);
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);

        let errorMessage = error.message;
        let errorCode = 'REGISTRATION_FAILED';

        if (error.name === 'ValidationError') {
            errorCode = 'VALIDATION_ERROR';
            const validationErrors = Object.values(error.errors || {}).map(e => e.message);
            errorMessage = validationErrors.join(', ') || error.message;
        } else if (error.code === 11000) {
            errorCode = 'DUPLICATE_ENTRY';
            const field = Object.keys(error.keyPattern || {})[0];
            errorMessage = `A record with this ${field} already exists`;
        }

        const response = {
            success: false,
            error: errorCode,
            message: errorMessage
        };

        if (IS_DEVELOPMENT) {
            response.debug = {
                errorName: error.name,
                errorMessage: error.message,
                stack: error.stack?.split('\n').slice(0, 5)
            };
        }

        res.status(500).json(response);
    }
};

/**
 * VERIFY EMAIL
 * POST /api/institution/verify-email
 */
exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_TOKEN',
                message: 'Verification token is required'
            });
        }

        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const institution = await Institution.findOne({
            emailVerificationToken: hashedToken
        });

        if (!institution) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_TOKEN',
                message: 'Token is invalid or expired'
            });
        }

        const isValid = institution.verifyEmailToken(token);
        if (!isValid) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_OR_EXPIRED_TOKEN',
                message: 'Token is invalid or expired'
            });
        }

        await institution.confirmEmailVerification();

        return res.json({
            success: true,
            message: 'Email verified successfully. Waiting for admin approval.'
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            success: false,
            error: 'VERIFICATION_FAILED',
            message: error.message
        });
    }
};

/**
 * INSTITUTION LOGIN
 * POST /api/institution/login
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_CREDENTIALS',
                message: 'Email and password are required'
            });
        }

        const userAgent = req.get('user-agent') || '';
        const userAgentInfo = parseUserAgent(userAgent);

        const requestData = {
            email,
            ipAddress: getClientIp(req),
            userAgent,
            deviceFingerprint: AuthService.generateDeviceFingerprint(userAgent, getClientIp(req)),
            browser: userAgentInfo.browser,
            operatingSystem: userAgentInfo.os,
            deviceType: userAgentInfo.deviceType,
            country: req.geoip?.country,
            city: req.geoip?.city
        };

        const result = await AuthService.authenticateLogin(email, password, requestData);

        if (!result.success) {
            const statusCode = result.error === 'ACCOUNT_NOT_ELIGIBLE' ? 403 :
                result.error === 'IP_NOT_WHITELISTED' ? 403 :
                    result.error === 'ACCOUNT_LOCKED' ? 423 :
                        401;

            return res.status(statusCode).json(result);
        }

        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: !IS_DEVELOPMENT,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.json({
            success: true,
            message: 'Login successful',
            token: result.token,
            expiresIn: result.expiresIn,
            institution: result.institution
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'LOGIN_FAILED',
            message: error.message
        });
    }
};

/**
 * REFRESH TOKEN
 * POST /api/institution/refresh-token
 */
exports.refreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
        const { institutionId } = req.body;

        if (!refreshToken || !institutionId) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_REFRESH_TOKEN',
                message: 'Refresh token and institution ID are required'
            });
        }

        const result = await AuthService.refreshAccessToken(refreshToken, institutionId);

        if (!result.success) {
            return res.status(401).json(result);
        }

        return res.json(result);

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            error: 'TOKEN_REFRESH_FAILED',
            message: error.message
        });
    }
};

/**
 * LOGOUT
 * POST /api/institution/logout
 */
exports.logout = async (req, res) => {
    try {
        const { institutionId, sessionId } = req.body;

        if (institutionId && sessionId) {
            await AuthService.logout(institutionId, sessionId);
        }

        res.clearCookie('refreshToken');

        return res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'LOGOUT_FAILED',
            message: error.message
        });
    }
};

/**
 * FORGOT PASSWORD
 * POST /api/institution/forgot-password
 */
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_EMAIL',
                message: 'Email is required'
            });
        }

        const institution = await Institution.findOne({ email: email.toLowerCase() });

        if (!institution) {
            return res.json({
                success: true,
                message: 'If an account exists with this email, password reset link has been sent.'
            });
        }

        const resetToken = institution.generatePasswordResetToken();
        await institution.save();

        try {
            await EmailService.sendPasswordResetEmail(email, {
                institutionName: institution.name,
                resetLink: `${process.env.FRONTEND_URL}/institution/reset-password?token=${resetToken}`,
                expiresIn: '1 hour'
            });
        } catch (emailError) {
            console.error('Password reset email failed:', emailError);
            if (!IS_DEVELOPMENT) {
                throw emailError;
            }
        }

        return res.json({
            success: true,
            message: 'Password reset link sent to email',
            ...(IS_DEVELOPMENT && { resetToken })
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            error: 'FORGOT_PASSWORD_FAILED',
            message: error.message
        });
    }
};

/**
 * RESET PASSWORD
 * POST /api/institution/reset-password
 */
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;

        if (!token || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_FIELDS',
                message: 'Token, password, and password confirmation are required'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'PASSWORDS_NOT_MATCH',
                message: 'Passwords do not match'
            });
        }

        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                success: false,
                error: 'WEAK_PASSWORD',
                message: passwordValidation.message
            });
        }

        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const institution = await Institution.findOne({
            passwordResetToken: hashedToken
        });

        if (!institution) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_TOKEN',
                message: 'Token is invalid or expired'
            });
        }

        const isValid = institution.verifyPasswordResetToken(token);
        if (!isValid) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_OR_EXPIRED_TOKEN',
                message: 'Token is invalid or expired'
            });
        }

        await institution.updatePassword(newPassword);

        try {
            await EmailService.sendPasswordChangedEmail(institution.email, {
                institutionName: institution.name
            });
        } catch (emailError) {
            console.error('Password changed email failed:', emailError);
        }

        return res.json({
            success: true,
            message: 'Password reset successfully. You can now login with your new password.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            error: 'PASSWORD_RESET_FAILED',
            message: error.message
        });
    }
};

/**
 * CHANGE PASSWORD (Authenticated)
 * POST /api/institution/change-password
 */
exports.changePassword = async (req, res) => {
    try {
        const { institutionId } = req.user || {};
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!institutionId) {
            return res.status(401).json({
                success: false,
                error: 'UNAUTHORIZED',
                message: 'Please login first'
            });
        }

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_FIELDS',
                message: 'Current password, new password, and confirmation are required'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'PASSWORDS_NOT_MATCH',
                message: 'New passwords do not match'
            });
        }

        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                success: false,
                error: 'WEAK_PASSWORD',
                message: passwordValidation.message
            });
        }

        const institution = await Institution.findById(institutionId).select('+passwordHash');

        if (!institution) {
            return res.status(404).json({
                success: false,
                error: 'INSTITUTION_NOT_FOUND',
                message: 'Institution not found'
            });
        }

        const isMatch = await institution.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'INVALID_CURRENT_PASSWORD',
                message: 'Current password is incorrect'
            });
        }

        const isSameAsOld = await institution.comparePassword(newPassword);
        if (isSameAsOld) {
            return res.status(400).json({
                success: false,
                error: 'SAME_AS_OLD_PASSWORD',
                message: 'New password cannot be the same as current password'
            });
        }

        await institution.updatePassword(newPassword);
        await institution.logoutAllSessions();

        return res.json({
            success: true,
            message: 'Password changed successfully. All other sessions have been logged out.'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            error: 'PASSWORD_CHANGE_FAILED',
            message: error.message
        });
    }
};

/**
 * GET PROFILE (Authenticated)
 * GET /api/institution/profile
 */
exports.getProfile = async (req, res) => {
    try {
        const { institutionId } = req.user || {};

        if (!institutionId) {
            return res.status(401).json({
                success: false,
                error: 'UNAUTHORIZED',
                message: 'Please login first'
            });
        }

        const institution = await Institution.findById(institutionId)
            .select('-passwordHash -emailVerificationToken -passwordResetToken -sessions');

        if (!institution) {
            return res.status(404).json({
                success: false,
                error: 'INSTITUTION_NOT_FOUND',
                message: 'Institution not found'
            });
        }

        return res.json({
            success: true,
            institution
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'PROFILE_FETCH_FAILED',
            message: error.message
        });
    }
};

// ═══════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════

function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.connection?.socket?.remoteAddress ||
        '127.0.0.1';
}

function generateTemporaryPassword() {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*';

    let password = '';
    password += lowercase[crypto.randomInt(lowercase.length)];
    password += uppercase[crypto.randomInt(uppercase.length)];
    password += numbers[crypto.randomInt(numbers.length)];
    password += special[crypto.randomInt(special.length)];

    const allChars = lowercase + uppercase + numbers + special;
    for (let i = 0; i < 8; i++) {
        password += allChars[crypto.randomInt(allChars.length)];
    }

    return password.split('').sort(() => crypto.randomInt(3) - 1).join('');
}

async function uploadDocuments(files) {
    const timestamp = Date.now();
    return {
        accreditationProof: files.accreditationProof
            ? `/uploads/documents/${timestamp}-${files.accreditationProof.originalname}`
            : null,
        officialLetter: files.officialLetter
            ? `/uploads/documents/${timestamp}-${files.officialLetter.originalname}`
            : null,
        identityProof: files.identityProof
            ? `/uploads/documents/${timestamp}-${files.identityProof.originalname}`
            : null
    };
}

module.exports = exports;