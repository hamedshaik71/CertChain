// server/services/adminRiskScoringService.js
const Admin = require('../models/Admin');
const Certificate = require('../models/Certificate');
const CertificateRevocation = require('../models/CertificateRevocation');

/**
 * FEATURE 12: Admin Risk Scoring System
 * Monitors admin behavior and flags suspicious activity
 * Prevents fraudulent certificate issuance by rogue admins
 */

class AdminRiskScoringService {
    /**
     * Calculate comprehensive risk score for admin
     */
    static async calculateAdminRiskScore(adminWallet) {
        try {
            const admin = await Admin.findOne({
                walletAddress: adminWallet.toLowerCase()
            });

            if (!admin) {
                return { error: 'Admin not found' };
            }

            let riskScore = 50; // Start with neutral score
            const riskFactors = [];
            const positiveFactors = [];

            // ============ NEGATIVE RISK FACTORS ============

            // 1. Certificate issuance velocity
            const recentCerts = await Certificate.countDocuments({
                institutionAddress: admin.institutionAddress,
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            });

            if (recentCerts > 100) {
                riskScore += 25;
                riskFactors.push({
                    factor: 'EXCESSIVE_ISSUANCE',
                    severity: 'HIGH',
                    details: `${recentCerts} certificates in last 24 hours`,
                    score: 25
                });
            } else if (recentCerts > 50) {
                riskScore += 10;
                riskFactors.push({
                    factor: 'ELEVATED_ISSUANCE',
                    severity: 'MEDIUM',
                    details: `${recentCerts} certificates in last 24 hours`,
                    score: 10
                });
            }

            // 2. Revocation rate
            const totalCerts = admin.stats.certificatesIssued;
            const revocationRate = totalCerts > 0
                ? (admin.stats.certificatesRevoked / totalCerts) * 100
                : 0;

            if (revocationRate > 20) {
                riskScore += 20;
                riskFactors.push({
                    factor: 'HIGH_REVOCATION_RATE',
                    severity: 'HIGH',
                    details: `${revocationRate.toFixed(2)}% revocation rate`,
                    score: 20
                });
            } else if (revocationRate > 10) {
                riskScore += 10;
                riskFactors.push({
                    factor: 'ELEVATED_REVOCATION',
                    severity: 'MEDIUM',
                    details: `${revocationRate.toFixed(2)}% revocation rate`,
                    score: 10
                });
            }

            // 3. Duplicate/suspicious certificate patterns
            const suspiciousCerts = await Certificate.find({
                institutionAddress: admin.institutionAddress,
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            });

            const studentCertMap = new Map();
            suspiciousCerts.forEach(cert => {
                const key = cert.studentCode + cert.courseName;
                studentCertMap.set(key, (studentCertMap.get(key) || 0) + 1);
            });

            const duplicates = Array.from(studentCertMap.values()).filter(count => count > 1);
            if (duplicates.length > 0) {
                const duplicateCount = duplicates.reduce((a, b) => a + b, 0);
                riskScore += Math.min(15, duplicateCount * 3);
                riskFactors.push({
                    factor: 'DUPLICATE_PATTERNS',
                    severity: 'MEDIUM',
                    details: `${duplicateCount} duplicate student-course combinations`,
                    score: Math.min(15, duplicateCount * 3)
                });
            }

            // 4. Failed login attempts
            if (admin.loginAttempts >= 3) {
                riskScore += 15;
                riskFactors.push({
                    factor: 'FAILED_LOGIN_ATTEMPTS',
                    severity: 'MEDIUM',
                    details: `${admin.loginAttempts} failed login attempts`,
                    score: 15
                });
            }

            // 5. Account lock history
            if (admin.lockedUntil && admin.lockedUntil > new Date()) {
                riskScore += 20;
                riskFactors.push({
                    factor: 'ACCOUNT_LOCKED',
                    severity: 'HIGH',
                    details: 'Account currently locked',
                    score: 20
                });
            }

            // 6. Unusual activity patterns
            const activityLog = admin.activityLog.slice(-50); // Last 50 activities
            const actionCounts = {};
            activityLog.forEach(log => {
                actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
            });

            // If same action repeated >20 times in 50 activities, it's suspicious
            Object.entries(actionCounts).forEach(([action, count]) => {
                if (count > 20) {
                    riskScore += 10;
                    riskFactors.push({
                        factor: 'REPETITIVE_ACTIVITY',
                        severity: 'MEDIUM',
                        details: `Action '${action}' repeated ${count} times`,
                        score: 10
                    });
                }
            });

            // 7. Late-night/unusual timing activity
            const nighttimeActivities = activityLog.filter(log => {
                const hour = new Date(log.timestamp).getHours();
                return hour < 6 || hour > 22;
            }).length;

            if (nighttimeActivities > activityLog.length * 0.7) {
                riskScore += 5;
                riskFactors.push({
                    factor: 'UNUSUAL_TIMING',
                    severity: 'LOW',
                    details: `${((nighttimeActivities / activityLog.length) * 100).toFixed(2)}% night activity`,
                    score: 5
                });
            }

            // ============ POSITIVE FACTORS (REDUCE RISK) ============

            // 1. Long tenure
            const tenureDays = (Date.now() - admin.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            if (tenureDays > 365) {
                riskScore -= 5;
                positiveFactors.push({
                    factor: 'LONG_TENURE',
                    reduction: 5,
                    details: `${Math.floor(tenureDays)} days on system`
                });
            }

            // 2. Clean approval history
            if (admin.stats.certificatesRejected > admin.stats.certificatesApproved * 0.05) {
                // More than 5% rejection rate is good (quality control)
                riskScore -= 10;
                positiveFactors.push({
                    factor: 'QUALITY_CONTROL',
                    reduction: 10,
                    details: 'Active in quality review and rejection'
                });
            }

            // 3. No security violations
            if (admin.trustHistory.length === 0 || admin.trustHistory.every(h => h.change >= 0)) {
                riskScore -= 10;
                positiveFactors.push({
                    factor: 'CLEAN_HISTORY',
                    reduction: 10,
                    details: 'No security violations recorded'
                });
            }

            // 4. High trust score
            if (admin.trustScore > 80) {
                riskScore -= 10;
                positiveFactors.push({
                    factor: 'HIGH_TRUST_SCORE',
                    reduction: 10,
                    details: `Trust score: ${admin.trustScore}`
                });
            }

            // Ensure score stays between 0-100
            riskScore = Math.max(0, Math.min(100, riskScore));

            // ============ DETERMINE RISK LEVEL ============

            let riskLevel = 'SAFE';
            let recommendations = [];

            if (riskScore > 80) {
                riskLevel = 'CRITICAL';
                recommendations.push('🚨 IMMEDIATE ACTION REQUIRED');
                recommendations.push('- Suspend admin privileges pending investigation');
                recommendations.push('- Review all recent certificates for fraud');
                recommendations.push('- Notify compliance officer');
            } else if (riskScore > 60) {
                riskLevel = 'HIGH';
                recommendations.push('⚠️ ESCALATED MONITORING');
                recommendations.push('- Increase audit frequency to daily');
                recommendations.push('- Require multi-level approval for all certs');
                recommendations.push('- Review recent activities');
            } else if (riskScore > 40) {
                riskLevel = 'MEDIUM';
                recommendations.push('📊 STANDARD MONITORING');
                recommendations.push('- Continue regular audits');
                recommendations.push('- Monitor for escalation');
            } else {
                riskLevel = 'LOW';
                recommendations.push('✅ NORMAL OPERATIONS');
                recommendations.push('- Standard security protocols');
                recommendations.push('- Routine audit schedule');
            }

            // ============ RETURN COMPREHENSIVE SCORE ============

            return {
                success: true,
                admin: {
                    walletAddress: admin.walletAddress,
                    email: admin.email,
                    adminLevel: admin.adminLevel
                },
                riskScore,
                riskLevel,
                riskFactors: riskFactors.sort((a, b) => b.score - a.score),
                positiveFactors,
                recommendations,
                metrics: {
                    certificatesIssued: admin.stats.certificatesIssued,
                    certificatesRevoked: admin.stats.certificatesRevoked,
                    certificatesApproved: admin.stats.certificatesApproved,
                    certificatesRejected: admin.stats.certificatesRejected,
                    revocationRate: revocationRate.toFixed(2) + '%',
                    trustScore: admin.trustScore,
                    accountLocked: admin.isAccountLocked()
                },
                timestamp: new Date()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Flag suspicious activity
     */
    static async flagSuspiciousActivity(adminWallet, activity, severity) {
        try {
            const admin = await Admin.findOne({
                walletAddress: adminWallet.toLowerCase()
            });

            if (!admin) {
                return { error: 'Admin not found' };
            }

            // Reduce trust score based on severity
            const scoreReduction = {
                LOW: 5,
                MEDIUM: 15,
                HIGH: 30,
                CRITICAL: 50
            }[severity] || 10;

            await admin.updateTrustScore(
                -scoreReduction,
                `Suspicious activity flagged: ${activity}`
            );

            return {
                success: true,
                message: `Activity flagged with severity: ${severity}`,
                newTrustScore: admin.trustScore
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get risk report for institution
     */
    static async getInstitutionRiskReport(institutionAddress) {
        try {
            const admins = await Admin.find({
                institutionAddress
            });

            const riskReports = [];
            let institutionRiskScore = 0;

            for (const admin of admins) {
                const report = await this.calculateAdminRiskScore(admin.walletAddress);
                if (report.success) {
                    riskReports.push(report);
                    institutionRiskScore += report.riskScore;
                }
            }

            // Average risk across admins
            const avgRiskScore = admins.length > 0
                ? Math.round(institutionRiskScore / admins.length)
                : 0;

            // Flag high-risk admins
            const highRiskAdmins = riskReports.filter(r => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL');

            return {
                success: true,
                institutionAddress,
                institutionRiskScore: avgRiskScore,
                totalAdmins: admins.length,
                highRiskAdmins: highRiskAdmins.length,
                adminReports: riskReports,
                overallRiskAssessment: avgRiskScore > 60
                    ? 'Institution requires enhanced monitoring'
                    : 'Institution risk is acceptable',
                recommendations: highRiskAdmins.length > 0
                    ? [`${highRiskAdmins.length} admin(s) require immediate attention`]
                    : ['Continue standard monitoring'],
                timestamp: new Date()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Automated risk monitoring (runs periodically)
     */
    static async runAutomatedRiskMonitoring() {
        try {
            const allAdmins = await Admin.find({ isActive: true });
            const alerts = [];

            for (const admin of allAdmins) {
                const report = await this.calculateAdminRiskScore(admin.walletAddress);

                if (report.success && report.riskLevel !== 'LOW') {
                    alerts.push({
                        admin: admin.email,
                        riskLevel: report.riskLevel,
                        riskScore: report.riskScore,
                        topFactors: report.riskFactors.slice(0, 3)
                    });
                }
            }

            return {
                success: true,
                alertsGenerated: alerts.length,
                alerts,
                timestamp: new Date()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get risk trend analysis
     */
    static async getRiskTrendAnalysis(adminWallet, daysBack = 30) {
        try {
            const admin = await Admin.findOne({
                walletAddress: adminWallet.toLowerCase()
            });

            if (!admin) {
                return { error: 'Admin not found' };
            }

            const dailyScores = [];
            for (let i = daysBack - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);

                // Get activities for this day
                const dayActivities = admin.activityLog.filter(log => {
                    const logDate = new Date(log.timestamp);
                    return logDate.toDateString() === date.toDateString();
                });

                // Rough score calculation for trend
                let dayScore = 50;
                if (dayActivities.length > 20) dayScore += 10;
                if (dayActivities.some(a => a.action === 'CERTIFICATE_REVOKED')) dayScore += 5;

                dailyScores.push({
                    date: date.toISOString().split('T')[0],
                    activityCount: dayActivities.length,
                    estimatedScore: dayScore
                });
            }

            // Calculate trend
            const recentAvg = dailyScores.slice(-7).reduce((a, b) => a + b.estimatedScore, 0) / 7;
            const olderAvg = dailyScores.slice(-14, -7).reduce((a, b) => a + b.estimatedScore, 0) / 7 || 50;
            const trend = recentAvg > olderAvg ? 'INCREASING' : 'DECREASING';

            return {
                success: true,
                admin: admin.email,
                daysAnalyzed: daysBack,
                dailyScores,
                trend,
                recentAverage: Math.round(recentAvg),
                previousAverage: Math.round(olderAvg),
                trendPercentage: ((recentAvg - olderAvg) / olderAvg * 100).toFixed(2) + '%'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = AdminRiskScoringService;