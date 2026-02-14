// test-setup.js - Run this to create test data
const mongoose = require('mongoose');
const Institution = require('./server/models/Institution');
const Student = require('./server/models/Student');

async function setupTestData() {
    await mongoose.connect('mongodb://127.0.0.1:27017/certificate-system');

    // Create test institution
    const institution = new Institution({
        name: 'Test University',
        email: 'test@university.edu',
        institutionCode: 'TU-001',
        accreditationId: 'ACC123',
        passwordHash: 'password123', // Will be hashed by pre-save hook
        status: {
            application: 'APPROVED', // Pre-approve for testing
            isLocked: false
        },
        emailVerified: true
    });
    await institution.save();
    console.log('✅ Institution created:', institution.institutionCode);

    // Create test student
    const student = new Student({
        studentCode: Student.generateStudentCode('TU-001'),
        email: 'john@student.com',
        fullName: 'John Doe',
        institutionAddress: 'test@university.edu', // Use institution email
        institutionName: 'Test University'
    });
    student.setPassword('student123');
    await student.save();
    console.log('✅ Student created:', student.studentCode);

    console.log('\n📝 Test Credentials:');
    console.log('Institution Email:', institution.email);
    console.log('Institution Password: password123');
    console.log('Student Code:', student.studentCode);
    console.log('Student Password: student123');

    process.exit(0);
}

setupTestData().catch(console.error);
