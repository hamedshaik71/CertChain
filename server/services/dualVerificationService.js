// server/services/dualVerificationService.js
const crypto = require('crypto');
const AccessCode = require('../models/AccessCode');
const Admin = require('../models/Admin');

/**
 * FEATURE 4: Wallet + Code Dual Verification
 * Admin access requires BOTH wallet AND special institution code
 * Maximum security: wallet stolen? code blocks. Code leaked? wallet blocks.
 */

class DualVerificationService {
    /**
     * Verify admin with wallet + code
     */
    static async verifyAdminAccess(walletAddress, institutionCode, accessCode) {
        try {
            // Step 1: Verify wallet exists in system
            const admin = await Admin.findOne({
                walletAddress: walletAddress.toLowerCase(),
                isActive: true,
                isVerified: true
            });

            if (!admin) {
                return {
                    success: false,
                    error: 'INVALID_WALLET',
                    message: 'Wallet not registered as admin'
                };
            }

            // Step 2: Check if wallet is locked
            if (admin.isAccountLocked()) {
                return {
                    success: false,
                    error: 'ACCOUNT_LOCKED',
                    message: `Account locked. Try again after ${admin.lockedUntil}`,
                    lockedUntil: admin.lockedUntil
                };
            }

            // Step 3: Verify institution code matches wallet
            if (admin.institutionCode !== institutionCode) {
                admin.loginAttempts++;
                if (admin.loginAttempts >= 3) {
                    await admin.lockAccount();
                    return {
                        success: false,
                        error: 'ACCOUNT_LOCKED',
                        message: 'Too many failed attempts. Account locked.'
                    };
                }
                await admin.save();

                return {
                    success: false,
                    error: 'INVALID_CODE',
                    message: 'Institution code does not match wallet'
                };
            }

            // Step 4: Verify the special access code
            const codeRecord = await AccessCode.findOne({
                institutionCode,
                institutionAddress: admin.institutionAddress
            });

            if (!codeRecord) {
                return {
                    success: false,
                    error: 'CODE_NOT_FOUND',
                    message: 'Access code not found for this institution'
                };
            }

            // Step 5: Check if code is valid (not used, not revoked, not expired)
            if (!codeRecord.isValid()) {
                let reason = '';
                if (codeRecord.isUsed) reason = 'Code already used';
                if (codeRecord.isRevoked) reason = 'Code revoked';
                if (codeRecord.expiresAt <= new Date()) reason = 'Code expired';

                return {
                    success: false,
                    error: 'INVALID_CODE',
                    message: reason,
                    codeStatus: {
                        isUsed: codeRecord.isUsed,
                        isRevoked: codeRecord.isRevoked,
                        expiresAt: codeRecord.expiresAt
                    }
                };
            }

            // Step 6: Verify code matches
            try {
                if (!codeRecord.verifyCode(accessCode)) {
                    admin.loginAttempts++;
                    if (admin.loginAttempts >= 3) {
                        await admin.lockAccount();
                    }
                    await admin.save();

                    return {
                        success: false,
                        error: 'INVALID_CODE_HASH',
                        message: 'Access code does not match'
                    };
                }
            } catch (error) {
                return {
                    success: false,
                    error: 'CODE_VERIFICATION_FAILED',
                    message: error.message
                };
            }

            // Step 7: Check code role matches admin role
            if (codeRecord.role !== admin.adminLevel) {
                return {
                    success: false,
                    error: 'ROLE_MISMATCH',
                    message: `Code role (${codeRecord.role}) does not match admin role (${admin.adminLevel})`
                };
            }

            // ✅ ALL CHECKS PASSED - Mark code as used
            await codeRecord.markAsUsed(
                admin.email,
                walletAddress,
                admin.fullName
            );

            // Reset login attempts
            admin.loginAttempts = 0;
            admin.lastLogin = new Date();
            await admin.save();

            // Log successful login
            await admin.logActivity(
                'LOGIN',
                'ADMIN',
                admin._id.toString(),
                `Login via wallet + code verification`
            );

            return {
                success: true,
                admin: {
                    walletAddress: admin.walletAddress,
                    email: admin.email,
                    fullName: admin.fullName,
                    adminLevel: admin.adminLevel,
                    permissions: admin.permissions,
                    institutionCode: admin.institutionCode,
                    institutionName: admin.institutionName,
                    allowedActions: admin.getAllowedActions()
                },
                verificationDetails: {
                    walletVerified: true,
                    codeVerified: true,
                    roleVerified: true,
                    timestamp: new Date()
                }
            };
        } catch (error) {
            return {
                success: false,
                error: 'VERIFICATION_ERROR',
                message: error.message
            };
        }
    }

    /**
     * Generate secure dual-verification setup for institution
     */
    static async setupDualVerification(institutionAddress, walletAddress, adminLevel) {
        try {
            // Generate unique access code
            const accessCode = AccessCode.generateCode();
            
            // Set expiry to 7 days
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            // Create access code record
            const codeRecord = new AccessCode({
                code: accessCode,
                codeHash: AccessCode.hashCode(accessCode),
                institutionAddress,
                role: adminLevel,
                expiresAt,
                createdBy: walletAddress
            });

            await codeRecord.save();

            return {
                success: true,
                accessCode, // ONLY show once - in setup response
                codeInfo: {
                    expiresAt,
                    role: adminLevel,
                    instructions: `
                        🔐 DUAL VERIFICATION SETUP
                        
                        Your access code: ${accessCode}
                        Expires: ${expiresAt.toISOString()}
                        
                        ⚠️  IMPORTANT:
                        1. Save this code securely (won't be shown again)
                        2. Use this + your wallet address to login
                        3. Each login marks code as used
                        4. Generate new codes for team members
                    `
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Check if wallet has active access code
     */
    static async hasActiveAccessCode(walletAddress, institutionCode) {
        try {
            const codeRecord = await AccessCode.findOne({
                $or: [
                    { 'usedBy.walletAddress': walletAddress },
                    { createdBy: walletAddress }
                ],
                institutionCode,
                isRevoked: false,
                expiresAt: { $gt: new Date() }
            });

            return !!codeRecord;
        } catch (error) {
            return false;
        }
    }

    /**
     * Revoke access code immediately
     */
    static async revokeAccessCode(codeId, superAdminWallet, reason) {
        try {
            const codeRecord = await AccessCode.findById(codeId);
            
            if (!codeRecord) {
                return {
                    success: false,
                    error: 'CODE_NOT_FOUND'
                };
            }

            codeRecord.isRevoked = true;
            codeRecord.revokedReason = reason;
            await codeRecord.save();

            return {
                success: true,
                message: 'Access code revoked successfully',
                code: codeRecord.code.substring(0, 4) + '****'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get all active codes for institution (admin view)
     */
    static async getInstitutionAccessCodes(institutionAddress) {
        try {
            const codes = await AccessCode.find({
                institutionAddress,
                isRevoked: false
            }).select('-codeHash'); // Don't expose hash

            return codes.map(code => ({
                id: code._id,
                code: code.code.substring(0, 4) + '****', // Masked
                role: code.role,
                isUsed: code.isUsed,
                usedBy: code.usedBy?.email || 'Not used',
                expiresAt: code.expiresAt,
                createdAt: code.createdAt
            }));
        } catch (error) {
            return [];
        }
    }

    /**
     * Security audit - find suspicious patterns
     */
    static async auditAccessPatterns(institutionAddress) {
        try {
            const codes = await AccessCode.find({
                institutionAddress
            });

            const audit = {
                totalCodes: codes.length,
                usedCodes: codes.filter(c => c.isUsed).length,
                revokedCodes: codes.filter(c => c.isRevoked).length,
                expiredCodes: codes.filter(c => c.expiresAt < new Date()).length,
                activeCodesCount: codes.filter(c => c.isValid()).length,
                suspiciousActivity: []
            };

            // Check for suspicious patterns
            codes.forEach(code => {
                // Multiple uses from different wallets
                if (code.usedBy && code.metadata?.previousUses?.length > 1) {
                    audit.suspiciousActivity.push({
                        code: code.code.substring(0, 4) + '****',
                        issue: 'Code used by multiple wallets',
                        details: code.metadata.previousUses
                    });
                }

                // Rapid-fire usage
                if (code.usedBy) {
                    const timeDiff = Date.now() - code.usedBy.timestamp.getTime();
                    if (timeDiff < 60000) { // Within 1 minute
                        audit.suspiciousActivity.push({
                            code: code.code.substring(0, 4) + '****',
                            issue: 'Rapid usage detected',
                            timestamp: code.usedBy.timestamp
                        });
                    }
                }
            });

            return audit;
        } catch (error) {
            return { error: error.message };
        }
    }
}

module.exports = DualVerificationService;