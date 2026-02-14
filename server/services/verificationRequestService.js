// server/services/verificationRequestService.js
const VerificationRequest = require('../models/VerificationRequest');
const crypto = require('crypto');

class VerificationRequestService {
    /**
     * Create new verification request
     */
    static async createVerificationRequest(employerData, certificateHash, purpose, details) {
        try {
            const requestId = `VER_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

            // Set expiration (e.g., 30 days from now)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            const request = new VerificationRequest({
                requestId,
                employer: employerData,
                certificateHash,
                purpose,
                details,
                expiresAt,
                accessScope: {
                    canViewCertificate: false,
                    canDownloadCertificate: false,
                    canVerifyOnBlockchain: true,
                    dataFieldsAllowed: ['courseName', 'grade', 'issueDate'],
                    timeLimit: expiresAt
                }
            });

            await request.save();

            return {
                success: true,
                requestId: request.requestId,
                message: 'Verification request created. Awaiting student approval.',
                nextSteps: 'Student will receive notification and can approve/reject this request.'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get pending requests for student
     */
    static async getStudentPendingRequests(studentCode) {
        try {
            const requests = await VerificationRequest.find({
                'student.studentCode': studentCode,
                'studentApproval.approvalStatus': 'PENDING'
            }).sort({ createdAt: -1 });

            return {
                success: true,
                requests,
                count: requests.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Privacy-protected verification (student controls access)
     */
    static async studentControlledVerification(requestId, studentApproval) {
        try {
            const request = await VerificationRequest.findOne({ requestId });

            if (!request) {
                return { success: false, error: 'Request not found' };
            }

            if (studentApproval.approved) {
                await request.approveByStudent(
                    studentApproval.reason,
                    studentApproval.comments
                );

                return {
                    success: true,
                    message: 'Request approved. Employer can now verify.',
                    accessGiven: {
                        fields: request.accessScope.dataFieldsAllowed,
                        expiresAt: request.accessScope.timeLimit
                    }
                };
            } else {
                await request.rejectByStudent(
                    studentApproval.reason,
                    studentApproval.comments
                );

                return {
                    success: true,
                    message: 'Request rejected. Employer cannot access data.'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Employer accesses verified data
     */
    static async employerAccessData(requestId, employerWallet, ipAddress) {
        try {
            const request = await VerificationRequest.findOne({ requestId });

            if (!request) {
                return { success: false, error: 'Request not found' };
            }

            // Check if approved
            if (request.status !== 'APPROVED') {
                return { success: false, error: 'Request not approved by student' };
            }

            // Check if expired
            if (new Date() > request.accessScope.timeLimit) {
                return { success: false, error: 'Access time limit expired' };
            }

            // Log access
            await request.logAccess(
                employerWallet,
                request.accessScope.dataFieldsAllowed,
                ipAddress,
                'Employer verification access'
            );

            // Return shared data
            return {
                success: true,
                data: request.getSharedData(),
                message: 'Data access logged and tracked'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get access audit trail for student
     */
    static async getAccessAuditTrail(requestId, studentCode) {
        try {
            const request = await VerificationRequest.findOne({
                requestId,
                'student.studentCode': studentCode
            });

            if (!request) {
                return { success: false, error: 'Request not found or unauthorized' };
            }

            return {
                success: true,
                requestId,
                employer: request.employer.name,
                createdAt: request.createdAt,
                accessLog: request.accessLog.map(log => ({
                    accessedAt: log.accessedAt,
                    accessedBy: 'Employer (masked)',
                    fieldsAccessed: log.dataAccessed,
                    timestamp: log.accessedAt
                })),
                totalAccesses: request.accessLog.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = VerificationRequestService;