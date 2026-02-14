// server/utils/certificateGenerator.js
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/**
 * Generate a professional certificate PDF
 */
async function generateCertificatePDF(certificateData) {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                layout: 'landscape',
                margins: { top: 50, bottom: 50, left: 50, right: 50 }
            });

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Background border
            doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
               .lineWidth(3)
               .stroke('#1e40af');

            doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
               .lineWidth(1)
               .stroke('#93c5fd');

            // Header - Certificate Title
            doc.fontSize(40)
               .font('Helvetica-Bold')
               .fillColor('#1e40af')
               .text('CERTIFICATE OF ACHIEVEMENT', 0, 80, {
                   align: 'center',
                   width: doc.page.width
               });

            // Decorative line
            doc.moveTo(250, 140)
               .lineTo(doc.page.width - 250, 140)
               .stroke('#93c5fd');

            // "This certifies that"
            doc.fontSize(16)
               .font('Helvetica')
               .fillColor('#374151')
               .text('This is to certify that', 0, 170, {
                   align: 'center',
                   width: doc.page.width
               });

            // Student Name (prominent)
            doc.fontSize(32)
               .font('Helvetica-Bold')
               .fillColor('#1e40af')
               .text(certificateData.studentName, 0, 210, {
                   align: 'center',
                   width: doc.page.width
               });

            // Course completion text
            doc.fontSize(16)
               .font('Helvetica')
               .fillColor('#374151')
               .text('has successfully completed the course', 0, 260, {
                   align: 'center',
                   width: doc.page.width
               });

            // Course Name
            doc.fontSize(24)
               .font('Helvetica-Bold')
               .fillColor('#1e40af')
               .text(certificateData.courseName, 0, 290, {
                   align: 'center',
                   width: doc.page.width
               });

            // Grade Box (centered, styled)
            const gradeBoxX = (doc.page.width - 150) / 2;
            doc.rect(gradeBoxX, 340, 150, 60)
               .fill('#dbeafe');

            doc.fontSize(14)
               .font('Helvetica')
               .fillColor('#1e40af')
               .text('Grade Achieved', gradeBoxX, 350, {
                   width: 150,
                   align: 'center'
               });

            doc.fontSize(28)
               .font('Helvetica-Bold')
               .fillColor('#1e40af')
               .text(certificateData.grade, gradeBoxX, 370, {
                   width: 150,
                   align: 'center'
               });

            // Issue Date & Certificate ID
            doc.fontSize(12)
               .font('Helvetica')
               .fillColor('#6b7280')
               .text(
                   `Issue Date: ${new Date(certificateData.issueDate).toLocaleDateString('en-US', {
                       year: 'numeric',
                       month: 'long',
                       day: 'numeric'
                   })}`,
                   0,
                   430,
                   { align: 'center', width: doc.page.width }
               );

            doc.text(
                `Certificate ID: ${certificateData.certificateHash.substring(0, 16)}...`,
                0,
                450,
                { align: 'center', width: doc.page.width }
            );

            // Institution Name
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor('#374151')
               .text(certificateData.institutionName, 0, 480, {
                   align: 'center',
                   width: doc.page.width
               });

            // QR Code (bottom right)
            if (certificateData.qrCodeURL) {
                try {
                    const qrCodeDataUrl = await QRCode.toDataURL(certificateData.qrCodeURL, {
                        width: 120,
                        margin: 1,
                        color: {
                            dark: '#1e40af',
                            light: '#ffffff'
                        }
                    });

                    const qrX = doc.page.width - 160;
                    const qrY = doc.page.height - 160;

                    doc.image(qrCodeDataUrl, qrX, qrY, {
                        width: 100,
                        height: 100
                    });

                    doc.fontSize(9)
                       .fillColor('#6b7280')
                       .text('Scan to Verify', qrX - 10, qrY + 105, {
                           width: 120,
                           align: 'center'
                       });
                } catch (qrError) {
                    console.warn('⚠️ QR Code generation failed:', qrError.message);
                }
            }

            // Blockchain Badge (bottom left)
            doc.fontSize(11)
               .font('Helvetica-Bold')
               .fillColor('#10b981')
               .text('⛓️ Verified on Blockchain', 50, doc.page.height - 80);

            doc.fontSize(9)
               .font('Helvetica')
               .fillColor('#6b7280')
               .text('This certificate is cryptographically secured', 50, doc.page.height - 60);

            // Footer
            doc.fontSize(8)
               .fillColor('#9ca3af')
               .text(
                   `Generated by CertChain © ${new Date().getFullYear()} | Certificate Hash: ${certificateData.certificateHash}`,
                   0,
                   doc.page.height - 35,
                   {
                       align: 'center',
                       width: doc.page.width
                   }
               );

            doc.end();

        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { generateCertificatePDF };