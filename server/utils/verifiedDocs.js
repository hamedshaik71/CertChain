const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '../verified_documents.json');

const saveVerifiedDoc = (certificate) => {
    try {
        let docs = [];
        
        // 1. Load existing
        if (fs.existsSync(FILE_PATH)) {
            const raw = fs.readFileSync(FILE_PATH);
            try { docs = JSON.parse(raw); } catch(e) {}
        }

        // 2. Check duplicates (Avoid saving same cert twice)
        // We strictly use the certificateHash (CERT-...) here
        const exists = docs.find(d => d.certificateHash === certificate.certificateHash);
        if (exists) return; // Already saved

        // 3. Add new doc
        docs.push({
            certificateHash: certificate.certificateHash, // ✅ The CERT-... hash
            studentName: certificate.studentName,
            courseName: certificate.courseName,
            verifiedAt: new Date().toISOString(),
            status: "VERIFIED_VALID"
        });

        // 4. Save
        fs.writeFileSync(FILE_PATH, JSON.stringify(docs, null, 2));
        console.log(`📂 Saved ${certificate.certificateHash} to verified_documents.json`);

    } catch (error) {
        console.error("Error saving verified doc:", error);
    }
};

module.exports = { saveVerifiedDoc };