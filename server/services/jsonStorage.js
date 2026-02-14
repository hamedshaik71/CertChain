// server/services/jsonStorage.js
// JSON File-based storage for students (backup + primary fallback)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============ FILE PATHS ============

const DATA_DIR = path.join(__dirname, '..', 'data');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const INSTITUTIONS_FILE = path.join(DATA_DIR, 'institutions.json');
const CERTIFICATES_FILE = path.join(DATA_DIR, 'certificates.json');

// ============ INITIALIZE ============

function initializeStorage() {
    // Create data directory if not exists
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log('📁 Created data directory:', DATA_DIR);
    }

    // Create files if not exist
    const files = [
        { path: STUDENTS_FILE, name: 'students' },
        { path: INSTITUTIONS_FILE, name: 'institutions' },
        { path: CERTIFICATES_FILE, name: 'certificates' }
    ];

    files.forEach(file => {
        if (!fs.existsSync(file.path)) {
            fs.writeFileSync(file.path, JSON.stringify([], null, 2), 'utf8');
            console.log(`📄 Created ${file.name}.json`);
        } else {
            // Validate JSON
            try {
                const content = fs.readFileSync(file.path, 'utf8');
                JSON.parse(content);
                console.log(`✅ ${file.name}.json loaded successfully`);
            } catch (e) {
                console.warn(`⚠️ ${file.name}.json was corrupted, resetting...`);
                fs.writeFileSync(file.path, JSON.stringify([], null, 2), 'utf8');
            }
        }
    });
}

// ============ READ / WRITE HELPERS ============

function readJSON(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`❌ Error reading ${filePath}:`, error.message);
        return [];
    }
}

function writeJSON(filePath, data) {
    try {
        // Write to temp file first (prevent corruption)
        const tempPath = filePath + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');

        // Rename temp to actual (atomic operation)
        fs.renameSync(tempPath, filePath);

        return true;
    } catch (error) {
        console.error(`❌ Error writing ${filePath}:`, error.message);

        // Fallback: direct write
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (e) {
            console.error(`❌ Fallback write also failed:`, e.message);
            return false;
        }
    }
}

// ============ PASSWORD HASHING ============

function hashPassword(password) {
    return crypto
        .createHash('sha256')
        .update(password + (process.env.PASSWORD_SALT || 'certchain-salt'))
        .digest('hex');
}

function verifyPassword(password, hash) {
    return hashPassword(password) === hash;
}

// ============ STUDENT OPERATIONS ============

const StudentStorage = {
    // Get all students
    getAll() {
        return readJSON(STUDENTS_FILE);
    },

    // Find student by any field
    findOne(query) {
        const students = this.getAll();

        return students.find(student => {
            for (const [key, value] of Object.entries(query)) {
                if (key === 'email') {
                    if (student.email?.toLowerCase() !== value?.toLowerCase()) return false;
                } else {
                    if (student[key] !== value) return false;
                }
            }
            return true;
        }) || null;
    },

    // Find by email
    findByEmail(email) {
        return this.findOne({ email: email.toLowerCase() });
    },

    // Find by student code
    findByStudentCode(studentCode) {
        return this.findOne({ studentCode });
    },

    // Find by email OR studentCode
    findByEmailOrCode(identifier) {
        const students = this.getAll();
        return students.find(s =>
            s.email?.toLowerCase() === identifier?.toLowerCase() ||
            s.studentCode === identifier
        ) || null;
    },

    // Register new student
    register(studentData) {
        const students = this.getAll();

        // Check duplicates
        const existingEmail = students.find(
            s => s.email?.toLowerCase() === studentData.email?.toLowerCase()
        );
        if (existingEmail) {
            throw new Error('EMAIL_ALREADY_REGISTERED: A student with this email already exists');
        }

        if (studentData.studentCode) {
            const existingCode = students.find(
                s => s.studentCode === studentData.studentCode
            );
            if (existingCode) {
                throw new Error('STUDENT_CODE_EXISTS: A student with this code already exists');
            }
        }

        // Generate student code if not provided
        const studentCode = studentData.studentCode || this.generateStudentCode(
            studentData.institutionCode || 'STU'
        );

        // Hash password
        let passwordHash = null;
        if (studentData.password) {
            passwordHash = hashPassword(studentData.password);
        }

        // Create student record
        const newStudent = {
            id: crypto.randomBytes(12).toString('hex'),
            studentCode: studentCode,
            email: studentData.email.toLowerCase().trim(),
            fullName: studentData.fullName?.trim() || studentData.name?.trim(),
            phone: studentData.phone || '',
            passwordHash: passwordHash,
            institutionCode: studentData.institutionCode || '',
            institutionName: studentData.institutionName || '',
            institutionAddress: studentData.institutionAddress || '',
            program: studentData.program || '',
            department: studentData.department || '',
            status: 'ACTIVE',
            isVerified: false,
            enrollmentDate: new Date().toISOString(),
            lastLogin: null,
            loginCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        students.push(newStudent);
        const saved = writeJSON(STUDENTS_FILE, students);

        if (!saved) {
            throw new Error('Failed to save student data to file');
        }

        console.log(`✅ [JSON] Student saved: ${newStudent.email} (${newStudent.studentCode})`);
        console.log(`📊 [JSON] Total students: ${students.length}`);

        return newStudent;
    },

    // Verify login
    login(identifier, password) {
        // identifier can be email or studentCode
        const student = this.findByEmailOrCode(identifier);

        if (!student) {
            return { success: false, error: 'INVALID_CREDENTIALS', message: 'Student not found' };
        }

        if (!student.passwordHash) {
            return { success: false, error: 'PASSWORD_NOT_SET', message: 'Password not set' };
        }

        if (!verifyPassword(password, student.passwordHash)) {
            return { success: false, error: 'INVALID_CREDENTIALS', message: 'Wrong password' };
        }

        // Update login tracking
        const students = this.getAll();
        const index = students.findIndex(s => s.id === student.id);
        if (index !== -1) {
            students[index].lastLogin = new Date().toISOString();
            students[index].loginCount = (students[index].loginCount || 0) + 1;
            students[index].updatedAt = new Date().toISOString();
            writeJSON(STUDENTS_FILE, students);
        }

        return {
            success: true,
            student: {
                id: student.id,
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
                enrollmentDate: student.enrollmentDate,
                lastLogin: new Date().toISOString(),
                loginCount: (student.loginCount || 0) + 1
            }
        };
    },

    // Update student
    update(identifier, updates) {
        const students = this.getAll();
        const index = students.findIndex(s =>
            s.email?.toLowerCase() === identifier?.toLowerCase() ||
            s.studentCode === identifier ||
            s.id === identifier
        );

        if (index === -1) {
            return null;
        }

        // Don't allow updating critical fields
        delete updates.id;
        delete updates.passwordHash;
        delete updates.studentCode;

        students[index] = {
            ...students[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        writeJSON(STUDENTS_FILE, students);
        return students[index];
    },

    // Change password
    changePassword(identifier, currentPassword, newPassword) {
        const student = this.findByEmailOrCode(identifier);

        if (!student) {
            return { success: false, message: 'Student not found' };
        }

        if (student.passwordHash && !verifyPassword(currentPassword, student.passwordHash)) {
            return { success: false, message: 'Current password is incorrect' };
        }

        const students = this.getAll();
        const index = students.findIndex(s => s.id === student.id);

        if (index !== -1) {
            students[index].passwordHash = hashPassword(newPassword);
            students[index].updatedAt = new Date().toISOString();
            writeJSON(STUDENTS_FILE, students);
        }

        return { success: true, message: 'Password changed successfully' };
    },

    // Delete student
    delete(identifier) {
        const students = this.getAll();
        const filtered = students.filter(s =>
            s.email?.toLowerCase() !== identifier?.toLowerCase() &&
            s.studentCode !== identifier &&
            s.id !== identifier
        );

        if (filtered.length === students.length) {
            return false; // Nothing deleted
        }

        writeJSON(STUDENTS_FILE, filtered);
        return true;
    },

    // Generate student code
    generateStudentCode(institutionCode = 'STU') {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = crypto.randomBytes(4).toString('hex').toUpperCase();
        return `${institutionCode}-${timestamp}-${random}`;
    },

    // Get count
    count() {
        return this.getAll().length;
    },

    // Find students by institution
    findByInstitution(institutionCode) {
        const students = this.getAll();
        return students.filter(s =>
            s.institutionCode === institutionCode ||
            s.institutionName === institutionCode ||
            s.institutionAddress === institutionCode
        );
    },

    // Sync FROM MongoDB (import existing data)
    async syncFromMongoDB(StudentModel) {
        try {
            const mongoStudents = await StudentModel.find({});
            if (mongoStudents.length === 0) {
                console.log('📋 No students in MongoDB to sync');
                return 0;
            }

            const jsonStudents = this.getAll();
            let imported = 0;

            for (const ms of mongoStudents) {
                const exists = jsonStudents.find(
                    js => js.email?.toLowerCase() === ms.email?.toLowerCase()
                );

                if (!exists) {
                    jsonStudents.push({
                        id: ms._id?.toString() || crypto.randomBytes(12).toString('hex'),
                        studentCode: ms.studentCode,
                        email: ms.email,
                        fullName: ms.fullName,
                        phone: ms.phone || '',
                        passwordHash: ms.passwordHash || '',
                        institutionCode: ms.institutionCode || '',
                        institutionName: ms.institutionName || '',
                        institutionAddress: ms.institutionAddress || '',
                        program: ms.program || '',
                        department: ms.department || '',
                        status: ms.status || 'ACTIVE',
                        isVerified: ms.isVerified || false,
                        enrollmentDate: ms.enrollmentDate?.toISOString() || new Date().toISOString(),
                        lastLogin: ms.lastLogin?.toISOString() || null,
                        loginCount: ms.loginCount || 0,
                        createdAt: ms.createdAt?.toISOString() || new Date().toISOString(),
                        updatedAt: ms.updatedAt?.toISOString() || new Date().toISOString()
                    });
                    imported++;
                }
            }

            if (imported > 0) {
                writeJSON(STUDENTS_FILE, jsonStudents);
                console.log(`✅ Synced ${imported} students from MongoDB to JSON`);
            }

            return imported;
        } catch (error) {
            console.error('❌ MongoDB sync failed:', error.message);
            return 0;
        }
    },

    // Sync TO MongoDB (export to database)
    async syncToMongoDB(StudentModel) {
        try {
            const jsonStudents = this.getAll();
            if (jsonStudents.length === 0) {
                console.log('📋 No students in JSON to sync to MongoDB');
                return 0;
            }

            let synced = 0;

            for (const js of jsonStudents) {
                const exists = await StudentModel.findOne({
                    email: js.email?.toLowerCase()
                });

                if (!exists) {
                    const student = new StudentModel({
                        studentCode: js.studentCode,
                        email: js.email,
                        fullName: js.fullName,
                        phone: js.phone,
                        passwordHash: js.passwordHash,
                        institutionName: js.institutionName,
                        institutionAddress: js.institutionAddress,
                        program: js.program,
                        department: js.department,
                        status: js.status,
                        isVerified: js.isVerified,
                        enrollmentDate: js.enrollmentDate ? new Date(js.enrollmentDate) : new Date(),
                        lastLogin: js.lastLogin ? new Date(js.lastLogin) : null,
                        loginCount: js.loginCount || 0
                    });

                    await student.save();
                    synced++;
                }
            }

            if (synced > 0) {
                console.log(`✅ Synced ${synced} students from JSON to MongoDB`);
            }

            return synced;
        } catch (error) {
            console.error('❌ Sync to MongoDB failed:', error.message);
            return 0;
        }
    }
};

// ============ INITIALIZE ON LOAD ============

initializeStorage();

// ============ EXPORT ============

module.exports = {
    StudentStorage,
    initializeStorage,
    readJSON,
    writeJSON,
    hashPassword,
    verifyPassword,
    STUDENTS_FILE,
    INSTITUTIONS_FILE,
    CERTIFICATES_FILE,
    DATA_DIR
};