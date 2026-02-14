// server/scripts/createTestCertificate.js

const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

const Certificate = require('../models/Certificate');

async function createTestCertificate() {
    try {
        console.log('🔌 Connecting to MongoDB...');

        await mongoose.connect(
            process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/certificate-system'
        );

        console.log('✅ Connected to MongoDB');

        // Generate realistic hashes
        const sha256Hash = crypto.randomBytes(32).toString('hex');
        const certificateHash = crypto.randomBytes(16).toString('hex');

        // Prevent duplicate test cert
        const existing = await Certificate.findOne({
            $or: [
                { certificateHash },
                { sha256: sha256Hash }
            ]
        });

        if (existing) {
            console.log('⚠️ Test certificate already exists, skipping...');
            process.exit(0);
        }

        const testCertificate = new Certificate({
            certificateHash,
            sha256: sha256Hash,

            studentCode: 'STU001',
            studentName: 'Test Student',
            studentEmail: 'test@student.com',

            institutionAddress: '0x608a5E56eaF8864D2a30936e914CA245eEd9f9c0',
            institutionName: 'Test Institution',

            courseName: 'Computer Science',
            grade: 'A',

            category: 'DEGREE',

            issueDate: new Date(),
            expiryDate: null,

            ipfsHash: 'test-ipfs-disabled',
            fileData: null,
            fileSize: 0,

            status: 'ISSUED',
            verified: true,

            approvals: {
                level1: {
                    status: 'APPROVE',
                    approvedBy: 'admin2@certchain.io',
                    date: new Date(),
                    comments: 'Auto Level 1 Approval'
                },
                level2: {
                    status: 'APPROVE',
                    approvedBy: 'admin3@certchain.io',
                    date: new Date(),
                    comments: 'Auto Level 2 Approval'
                },
                level3: {
                    status: 'APPROVE',
                    approvedBy: 'admin1@certchain.io',
                    date: new Date(),
                    comments: 'Auto Final Approval'
                }
            },

            transactionHash: null,
            blockNumber: null,

            verificationCount: 0
        });

        await testCertificate.save();

        console.log('\n🎉 SUCCESS!');
        console.log('✅ Test Certificate Created');
        console.log('🔑 certificateHash:', certificateHash);
        console.log('🔐 sha256:', sha256Hash);

        process.exit(0);

    } catch (error) {
        console.error('\n🔥 ERROR CREATING TEST CERTIFICATE');
        console.error(error);
        process.exit(1);
    }
}

createTestCertificate();
