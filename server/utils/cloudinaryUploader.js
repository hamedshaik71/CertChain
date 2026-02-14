// server/utils/cloudinaryUploader.js
const cloudinary = require('../config/cloudinaryConfig');
const crypto = require('crypto');

/**
 * Upload certificate PDF to Cloudinary
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {Object} metadata - Certificate metadata
 * @returns {Promise<Object>} Upload result with URL and hash
 */
async function uploadCertificateToCloudinary(pdfBuffer, metadata) {
    try {
        console.log('☁️  Uploading certificate to Cloudinary...');

        // Calculate SHA-256 hash
        const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

        // Upload to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: 'raw',
                    folder: 'certificates',
                    public_id: `cert_${metadata.studentCode}_${Date.now()}`,
                    context: {
                        studentName: metadata.studentName,
                        courseName: metadata.courseName,
                        certificateHash: hash,
                        studentCode: metadata.studentCode
                    },
                    tags: ['certificate', metadata.studentCode, metadata.institutionName]
                },
                (error, result) => {
                    if (error) {
                        console.error('❌ Cloudinary upload failed:', error);
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );

            uploadStream.end(pdfBuffer);
        });

        console.log('✅ Certificate uploaded to Cloudinary');
        console.log('   URL:', uploadResult.secure_url);
        console.log('   Hash:', hash);

        return {
            success: true,
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            hash: hash,
            size: pdfBuffer.length,
            format: uploadResult.format,
            resourceType: uploadResult.resource_type
        };

    } catch (error) {
        console.error('❌ Cloudinary upload error:', error);
        throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
}

/**
 * Delete certificate from Cloudinary
 */
async function deleteCertificateFromCloudinary(publicId) {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: 'raw'
        });
        console.log('🗑️  Certificate deleted from Cloudinary:', publicId);
        return result;
    } catch (error) {
        console.error('❌ Delete failed:', error);
        throw error;
    }
}

module.exports = {
    uploadCertificateToCloudinary,
    deleteCertificateFromCloudinary
};