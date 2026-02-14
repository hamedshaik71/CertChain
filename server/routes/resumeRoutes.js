const express = require('express');
const router = express.Router();
const multer = require('multer');
const PDFParser = require("pdf2json"); // ✅ New Library
const Certificate = require('../models/Certificate');

// Configure Multer
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Helper: Wrap pdf2json in a Promise to make it async/await
const parsePDFBuffer = (buffer) => {
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(this, 1); // 1 = Text mode

        pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
        
        pdfParser.on("pdfParser_dataReady", pdfData => {
            // Extract raw text from the messy JSON structure
            const rawText = pdfParser.getRawTextContent();
            resolve(rawText);
        });

        pdfParser.parseBuffer(buffer);
    });
};

// ==========================================
// 🤖 AI RESUME VERIFICATION (Using pdf2json)
// ==========================================
router.post('/verify', upload.single('resume'), async (req, res) => {
    try {
        console.log("🔍 [Resume Verifier] Request Received");

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No resume file uploaded' });
        }

        console.log(`📄 File Uploaded: ${req.file.originalname} (${req.file.size} bytes)`);

        // 1. PARSE PDF (New Method)
        let resumeText = "";
        try {
            console.log("⏳ Parsing PDF with pdf2json...");
            resumeText = await parsePDFBuffer(req.file.buffer);
            console.log(`✅ Text Extracted. Length: ${resumeText.length} chars`);
        } catch (pdfError) {
            console.error("❌ PDF Parse Error:", pdfError);
            return res.status(500).json({ 
                success: false, 
                error: "Could not read PDF. Ensure it is a valid text-based PDF."
            });
        }

        // 2. FETCH CERTIFICATES
        const { studentEmail } = req.body;
        let query = { status: 'ISSUED' };
        if (studentEmail && studentEmail.trim() !== '') {
            query.studentEmail = { $regex: new RegExp(studentEmail, 'i') };
        }
        
        const dbCertificates = await Certificate.find(query);
        console.log(`🔎 Comparing against ${dbCertificates.length} database records...`);

        // 3. MATCHING LOGIC
        const results = [];
        let verifiedCount = 0;
        let partialCount = 0;

        for (const cert of dbCertificates) {
            if (!cert.courseName) continue;

            const courseNameLower = cert.courseName.toLowerCase();
            // Decode URI components in case text extraction has URL encoding
            const textLower = decodeURIComponent(resumeText).toLowerCase(); 

            // Check match
            const courseMatch = textLower.includes(courseNameLower);
            
            if (courseMatch) {
                results.push({
                    status: 'VERIFIED',
                    claimedCertificate: cert.courseName,
                    confidence: 95,
                    match: {
                        courseName: cert.courseName,
                        institutionName: cert.institutionName,
                        grade: cert.grade
                    }
                });
                verifiedCount++;
            }
        }

        // 4. REPORT GENERATION
        let verificationRate = 0;
        if (results.length > 0) {
             verificationRate = Math.round((verifiedCount / results.length) * 100);
        }

        if (results.length === 0) {
            results.push({
                status: 'NOT_FOUND',
                claimedCertificate: "No matching credentials found.",
                confidence: 0,
                match: null
            });
        }

        let recommendation = { level: "low", message: "Manual Review Required" };
        if (verificationRate > 80) recommendation = { level: "high", message: "High Confidence - Authentic" };
        else if (verificationRate > 40) recommendation = { level: "medium", message: "Partial Match Found" };

        const report = {
            summary: {
                total: results.length,
                verified: verifiedCount,
                partialMatch: partialCount,
                notFound: results.filter(r => r.status === 'NOT_FOUND').length,
                verificationRate: verificationRate
            },
            recommendation,
            details: results
        };

        res.json({ success: true, report });

    } catch (error) {
        console.error('🔥 Server Error in /verify:', error);
        res.status(500).json({ success: false, error: "Server Error: " + error.message });
    }
});

router.get('/quick-verify/:email', async (req, res) => {
    res.json({ success: true, message: "Quick verify endpoint" });
});

module.exports = router;