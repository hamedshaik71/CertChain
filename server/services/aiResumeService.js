// backend/services/aiResumeService.js

const pdfParse = require('pdf-parse');
const Certificate = require('../models/Certificate');

class AIResumeService {
    
    // Extract text from PDF
    async extractTextFromPDF(pdfBuffer) {
        try {
            const data = await pdfParse(pdfBuffer);
            return data.text;
        } catch (error) {
            console.error('PDF extraction error:', error);
            throw new Error('Failed to extract text from PDF');
        }
    }

    // Parse resume to find certificates
    parseResumeCertificates(text) {
        const certificates = [];
        
        // Common patterns for certificates
        const patterns = [
            // Pattern 1: Certificate name followed by institution
            /(?:certificate|certification|certified|diploma|degree)\s*(?:in|of|:)?\s*([^,.\n]+)/gi,
            // Pattern 2: Course/Program names
            /(?:completed|earned|achieved|obtained)\s+(?:a\s+)?(?:certificate|certification)?\s*(?:in|for)?\s*([^,.\n]+)/gi,
            // Pattern 3: Direct course mentions
            /(?:blockchain|web development|data science|machine learning|ai|python|javascript|react|node\.js|aws|azure|google cloud)/gi
        ];

        const educationSection = this.extractEducationSection(text);
        const certificatesSection = this.extractCertificatesSection(text);
        
        // Search in relevant sections
        const searchText = `${educationSection} ${certificatesSection}`.toLowerCase();

        // Extract institution names
        const institutionPatterns = [
            /(?:from|at|by)\s+([A-Z][a-zA-Z\s]+(?:University|College|Institute|Academy|School))/g,
            /([A-Z][a-zA-Z\s]+(?:University|College|Institute|Academy))/g
        ];

        // Extract dates
        const datePatterns = [
            /(\d{4})\s*[-–]\s*(\d{4}|present)/gi,
            /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{4}/gi
        ];

        // Extract potential certificates
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const certName = match[1] || match[0];
                if (certName.length > 3 && certName.length < 100) {
                    certificates.push({
                        name: certName.trim(),
                        originalText: match[0],
                        position: match.index
                    });
                }
            }
        });

        return this.deduplicateCertificates(certificates);
    }

    // Extract education section
    extractEducationSection(text) {
        const educationMatch = text.match(/education[\s\S]*?(?=experience|skills|projects|$)/i);
        return educationMatch ? educationMatch[0] : '';
    }

    // Extract certificates section
    extractCertificatesSection(text) {
        const certMatch = text.match(/(?:certifications?|certificates?|credentials?)[\s\S]*?(?=education|experience|skills|projects|$)/i);
        return certMatch ? certMatch[0] : '';
    }

    // Remove duplicates
    deduplicateCertificates(certificates) {
        const seen = new Set();
        return certificates.filter(cert => {
            const normalized = cert.name.toLowerCase().replace(/\s+/g, ' ');
            if (seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
        });
    }

    // Verify certificates against database
    async verifyCertificates(parsedCertificates, studentEmail) {
        const results = [];
        
        // Get all certificates for this student
        const dbCertificates = await Certificate.find({
            studentEmail: studentEmail?.toLowerCase(),
            status: 'ISSUED'
        });

        for (const parsed of parsedCertificates) {
            const verification = {
                claimedCertificate: parsed.name,
                status: 'NOT_FOUND',
                match: null,
                confidence: 0
            };

            // Try to find a match
            for (const dbCert of dbCertificates) {
                const similarity = this.calculateSimilarity(
                    parsed.name.toLowerCase(),
                    dbCert.courseName.toLowerCase()
                );

                if (similarity > 0.6) {
                    verification.status = 'VERIFIED';
                    verification.match = {
                        certificateHash: dbCert.certificateHash,
                        courseName: dbCert.courseName,
                        grade: dbCert.grade,
                        issueDate: dbCert.issueDate,
                        institutionName: dbCert.institutionName
                    };
                    verification.confidence = Math.round(similarity * 100);
                    break;
                } else if (similarity > 0.3) {
                    verification.status = 'PARTIAL_MATCH';
                    verification.match = {
                        courseName: dbCert.courseName,
                        similarity: Math.round(similarity * 100)
                    };
                    verification.confidence = Math.round(similarity * 100);
                }
            }

            results.push(verification);
        }

        return results;
    }

    // Calculate string similarity (Jaccard)
    calculateSimilarity(str1, str2) {
        const set1 = new Set(str1.split(/\s+/));
        const set2 = new Set(str2.split(/\s+/));
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return intersection.size / union.size;
    }

    // Generate verification report
    generateReport(verificationResults) {
        const verified = verificationResults.filter(r => r.status === 'VERIFIED').length;
        const partial = verificationResults.filter(r => r.status === 'PARTIAL_MATCH').length;
        const notFound = verificationResults.filter(r => r.status === 'NOT_FOUND').length;
        const total = verificationResults.length;

        return {
            summary: {
                total,
                verified,
                partialMatch: partial,
                notFound,
                verificationRate: total > 0 ? Math.round((verified / total) * 100) : 0
            },
            details: verificationResults,
            timestamp: new Date(),
            recommendation: this.getRecommendation(verified, total)
        };
    }

    getRecommendation(verified, total) {
        const rate = total > 0 ? verified / total : 0;
        
        if (rate >= 0.9) return { level: 'HIGH', message: '✅ Resume highly credible - most certificates verified' };
        if (rate >= 0.7) return { level: 'MEDIUM', message: '⚠️ Resume moderately credible - some certificates verified' };
        if (rate >= 0.5) return { level: 'LOW', message: '⚠️ Resume needs verification - many certificates unverified' };
        return { level: 'CRITICAL', message: '❌ Resume credentials could not be verified' };
    }
}

module.exports = new AIResumeService();