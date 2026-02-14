// controllers/adminController.js
const Institution = require('../models/Institution');
const InstitutionApplication = require('../models/InstitutionApplication');

// GET /api/admin/institution-applications?status=PENDING
exports.getPendingApplications = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        
        const applications = await InstitutionApplication
            .find({ status: status || 'PENDING' })
            .sort({ submittedAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit);
        
        const total = await InstitutionApplication.countDocuments({ status });
        
        return res.json({
            success: true,
            applications,
            pagination: { page, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// POST /api/admin/institution-applications/:id/approve
exports.approveApplication = async (req, res) => {
    try {
        const { id } = req.params;
        const { approvalCode, comments } = req.body;
        const adminEmail = req.user.email;
        
        const application = await InstitutionApplication.findById(id);
        
        // Create Institution
        const institution = new Institution({
            name: application.institutionName,
            email: application.contactEmail,
            phone: application.contactPhone,
            address: application.address,
            website: application.website,
            accreditationId: application.accreditationDetails.accreditationNumber,
            institutionCode: Institution.generateInstitutionCode(application.institutionName),
            passwordHash: 'temp-password-will-be-set-on-first-login',
            documents: application.documents,
            status: {
                application: 'APPROVED'
            },
            approval: {
                approvedBy: adminEmail,
                approvedAt: new Date(),
                approvalCode,
                comments
            }
        });
        
        await institution.save();
        
        // Update application
        application.status = 'APPROVED';
        application.approval.finalApproval = {
            approvedBy: adminEmail,
            approvedAt: new Date(),
            approvalCode
        };
        await application.save();
        
        // Send email to institution
        // await EmailService.sendApprovalEmail(application.contactEmail, {...});
        
        return res.json({
            success: true,
            message: 'Institution approved',
            institution: {
                id: institution._id,
                name: institution.name,
                code: institution.institutionCode
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// POST /api/admin/institution-applications/:id/reject
exports.rejectApplication = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminEmail = req.user.email;
        
        const application = await InstitutionApplication.findById(id);
        
        application.status = 'REJECTED';
        application.rejectionReason = reason;
        application.rejectedBy = adminEmail;
        application.rejectedAt = new Date();
        
        await application.save();
        
        // Send rejection email
        // await EmailService.sendRejectionEmail(application.contactEmail, {...});
        
        return res.json({
            success: true,
            message: 'Application rejected'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// POST /api/admin/institutions/:id/lock
exports.lockInstitution = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminEmail = req.user.email;
        
        const institution = await Institution.findById(id);
        
        // Log lock action
        // await AuditLog.create({...});
        
        await institution.lockAccount(reason);
        
        return res.json({
            success: true,
            message: 'Institution locked',
            lockedAt: institution.status.lockedAt
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};