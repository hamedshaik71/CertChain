// server/services/internalVerificationService.js
const Certificate = require('../models/Certificate');
const Student = require('../models/Student');
const CertificateApprovalQueue = require('../models/CertificateApprovalQueue');

/**
 * FEATURE 7: Internal Verification Before Blockchain Write
 * Validate certificate data BEFORE writing to blockchain
 * Prevents gas waste and garbage records on-chain
 */

class InternalVerificationService {
    /**
     * Complete internal verification before blockchain write
     */
    static async verifyBeforeBlockchainWrite(certificateData) {
        const validationResult = {
            isValid: false,
            errors: [],
            warnings: [],
            recommendations: [],
            metadata: {}
        };

        try {
            // 1. Validate required fields
            const requiredFields = [
                'certificateHash',
                'studentCode',
                'studentName',
                'institutionAddress',
                'courseName',
                'grade',
                'issueDate'
            ];

            for (const field of requiredFields) {
                if (!certificateData[field]) {
                    validationResult.errors.push(`Missing required field: ${field}`);
                }
            }

            if (validationResult.errors.length > 0) {
                return validationResult;
            }

            // 2. Check for duplicate certificate
            const duplicateCert = await Certificate.findOne({
                $or: [
                    { certificateHash: certificateData.certificateHash },
                    { sha256: certificateData.certificateHash }
                ]
            });

            if (duplicateCert) {
                validationResult.errors.push(
                    `Duplicate certificate detected. Hash already exists: ${duplicateCert.certificateHash}`
                );
                return validationResult;
            }

            // 3. Check for duplicate student + course combo
            const existingCert = await Certificate.findOne({
                studentCode: certificateData.studentCode,
                courseName: certificateData.courseName,
                institutionAddress: certificateData.institutionAddress,
                status: { $ne: 'REVOKED' }
            });

            if (existingCert) {
                validationResult.warnings.push(
                    `Student ${certificateData.studentCode} already has a certificate for ${certificateData.courseName}`
                );
            }

            // 4. Validate student exists and belongs to institution
            const student = await Student.findOne({
                studentCode: certificateData.studentCode
            });

            if (!student) {
                validationResult.errors.push(
                    `Student not found: ${certificateData.studentCode}`
                );
                return validationResult;
            }

            if (student.institutionAddress !== certificateData.institutionAddress) {
                validationResult.errors.push(
                    `Student ${certificateData.studentCode} does not belong to this institution`
                );
                return validationResult;
            }

            validationResult.metadata.studentVerified = true;

            // 5. Validate grades
            const validGrades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F', 'PASS', 'FAIL'];
            if (!validGrades.includes(certificateData.grade)) {
                validationResult.warnings.push(
                    `Non-standard grade: ${certificateData.grade}`
                );
            }

            // 6. Validate dates
            const issueDate = new Date(certificateData.issueDate);
            const currentDate = new Date();

            if (issueDate > currentDate) {
                validationResult.errors.push(
                    `Issue date cannot be in the future: ${certificateData.issueDate}`
                );
                return validationResult;
            }

            if (certificateData.expiryDate) {
                const expiryDate = new Date(certificateData.expiryDate);
                if (expiryDate <= issueDate) {
                    validationResult.errors.push(
                        `Expiry date must be after issue date`
                    );
                    return validationResult;
                }

                // Check if already expired
                if (expiryDate < currentDate) {
                    validationResult.warnings.push(
                        `Certificate has already expired: ${certificateData.expiryDate}`
                    );
                }
            }

            validationResult.metadata.datesValid = true;

            // 7. Check for suspicious patterns
            const recentIssuances = await Certificate.countDocuments({
                institutionAddress: certificateData.institutionAddress,
                createdAt: {
                    $gte: new Date(Date.now() - 60 * 60 * 1000) // Last 1 hour
                }
            });

            if (recentIssuances > 100) {
                validationResult.recommendations.push(
                    `Bulk issuance detected: ${recentIssuances} certificates in last hour. Consider batching.`
                );
            }

            // 8. Validate certificate data format
            if (typeof certificateData.certificateHash !== 'string') {
                validationResult.errors.push(
                    `Certificate hash must be a string`
                );
                return validationResult;
            }

            if (!/^[a-fA-F0-9]{64}$/.test(certificateData.certificateHash)) {
                validationResult.errors.push(
                    `Invalid certificate hash format (must be 64-character hex)`
                );
                return validationResult;
            }

            // 9. Check for pending approval
            const pendingApproval = await CertificateApprovalQueue.findOne({
                'certificateData.studentCode': certificateData.studentCode,
                'certificateData.courseName': certificateData.courseName,
                status: { $in: ['PENDING', 'APPROVED', 'REVERTED'] }
            });

            if (pendingApproval && pendingApproval.status !== 'APPROVED') {
                validationResult.warnings.push(
                    `Certificate has pending approval: ${pendingApproval.queueId}`
                );
            }

            validationResult.metadata.approvalCheckDone = true;

            // 10. Validate institution is approved
            const Institution = require('../models/Institution');
            const institution = await Institution.findOne({
                walletAddress: certificateData.institutionAddress
            });

            if (!institution || !institution.isApproved) {
                validationResult.errors.push(
                    `Institution is not approved`
                );
                return validationResult;
            }

            validationResult.metadata.institutionVerified = true;

            // ✅ ALL CHECKS PASSED
            validationResult.isValid = true;
            validationResult.message = 'Certificate validation passed. Safe to write to blockchain.';

            return validationResult;

        } catch (error) {
            validationResult.errors.push(`Verification error: ${error.message}`);
            return validationResult;
        }
    }

    /**
     * Validate certificate metadata
     */
    static async validateMetadata(certificateData) {
        const issues = [];

        // Check for suspicious values
        if (certificateData.courseName && certificateData.courseName.length > 200) {
            issues.push('Course name too long (max 200 chars)');
        }

        if (certificateData.studentName && certificateData.studentName.length > 100) {
            issues.push('Student name too long (max 100 chars)');
        }

        // Check for SQL injection attempts
        const dangerousPatterns = ['<script>', 'onclick=', 'onerror=', 'javascript:'];
        const allData = JSON.stringify(certificateData);

        for (const pattern of dangerousPatterns) {
            if (allData.toLowerCase().includes(pattern)) {
                issues.push(`Suspicious pattern detected: ${pattern}`);
            }
        }

        return {
            isValid: issues.length === 0,
            issues
        };
    }

    /**
     * Calculate gas optimization recommendations
     */
    static getGasOptimization(certificateCount) {
        const recommendations = [];

        if (certificateCount > 1) {
            recommendations.push({
                suggestion: 'Batch Processing Recommended',
                estimatedSavings: `${Math.round((certificateCount - 1) * 20)}% gas savings`,
                message: `You're issuing ${certificateCount} certificates. Consider batching them together.`
            });
        }

        if (certificateCount > 50) {
            recommendations.push({
                suggestion: 'Use Merkle Tree',
                estimatedSavings: '60-70% gas savings',
                message: 'For large batches, consider using Merkle tree proofs.'
            });
        }

        return {
            batchSize: certificateCount,
            recommendations,
            estimatedGasCost: certificateCount * 150000, // Rough estimate
            costPerCertificate: 150000
        };
    }

    /**
     * Pre-flight checklist before blockchain write
     */
    static async getPreFlightChecklist(certificateData) {
        const checklist = {
            dataValidation: {
                completed: false,
                errors: []
            },
            metadataCheck: {
                completed: false,
                errors: []
            },
            duplicateCheck: {
                completed: false,
                errors: []
            },
            studentVerification: {
                completed: false,
                errors: []
            },
            dateValidation: {
                completed: false,
                errors: []
            },
            institutionVerification: {
                completed: false,
                errors: []
            },
            approvalCheck: {
                completed: false,
                errors: []
            },
            allChecksPassed: false
        };

        try {
            // Run all checks
            const dataValidation = await this.verifyBeforeBlockchainWrite(certificateData);
            const metadataValidation = await this.validateMetadata(certificateData);

            checklist.dataValidation.completed = true;
            checklist.dataValidation.errors = dataValidation.errors;

            checklist.metadataCheck.completed = true;
            checklist.metadataCheck.errors = metadataValidation.issues;

            checklist.allChecksPassed = dataValidation.isValid && metadataValidation.isValid;

            return checklist;
        } catch (error) {
            checklist.dataValidation.errors.push(error.message);
            return checklist;
        }
    }
}

module.exports = InternalVerificationService;
