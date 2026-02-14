// server/scripts/createStudentTestData.js
const mongoose = require('mongoose');
const Certificate = require('../models/Certificate');
const crypto = require('crypto');
require('dotenv').config();

async function createTestData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Create a test certificate for the student
        const testCert = new Certificate({
            certificateHash: 'test' + Date.now(),
            sha256: crypto.createHash('sha256').update('test-data').digest('hex'),
            studentCode: 'STU001',
            studentName: 'John Doe',
            studentEmail: 'user@example.com', // This matches the default in StudentDashboard
            institutionAddress: '0x' + crypto.randomBytes(20).toString('hex'),
            institutionName: 'Tech University',
            courseName: 'Blockchain Development',
            grade: 'A+',
            category: 'COURSE',
            issueDate: new Date(),
            status: 'ISSUED',
            verified: true,
            transactionHash: '0x' + crypto.randomBytes(32).toString('hex'),
            blockNumber: 12345,
            approvals: {
                level1: { status: 'APPROVE', date: new Date() },
                level2: { status: 'APPROVE', date: new Date() },
                level3: { status: 'APPROVE', date: new Date() }
            }
        });

        await testCert.save();
        
        console.log('\n✅ Test certificate created!');
        console.log('📋 Certificate Details:');
        console.log('   Hash:', testCert.certificateHash);
        console.log('   Student Email:', testCert.studentEmail);
        console.log('   Course:', testCert.courseName);
        console.log('\n🔍 QR Code Test URLs:');
        console.log(`   Verify: http://localhost:3000/verify/${testCert.certificateHash}`);
        console.log(`   API: http://localhost:5000/api/public/verify/${testCert.certificateHash}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createTestData();