const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = '/tmp/uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedExt = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedExt.includes(ext)) {
        return cb(new Error('Invalid file type. Only PDF, JPG, PNG, DOC allowed.'), false);
    }

    cb(null, true);
};

// Create multer instance
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

/**
 * Upload multiple files
 */
const uploadMultiple = (fieldName, maxFiles) => {
    return upload.array(fieldName, maxFiles);
};

/**
 * Upload single file
 */
const uploadSingle = (fieldName) => {
    return upload.single(fieldName);
};

module.exports = {
    uploadMultiple,
    uploadSingle
};