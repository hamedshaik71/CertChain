const fs = require('fs');
const path = require('path');

// Points to server/mockBlockchain.json
const LEDGER_PATH = path.join(__dirname, '../mockBlockchain.json');

const addToLedger = (certInput) => {
    try {
        console.log("📝 LEDGER WRITER: Attempting to save...");

        // 1. Handle Mongoose Document vs Plain Object
        // (Ensures we get the actual data if passed a DB object)
        const certificate = certInput.toObject ? certInput.toObject() : certInput;

        let ledger = [];

        // 2. Read existing ledger
        if (fs.existsSync(LEDGER_PATH)) {
            const data = fs.readFileSync(LEDGER_PATH, 'utf8');
            try {
                ledger = JSON.parse(data);
            } catch (e) {
                console.error("⚠️ Ledger JSON corrupted, starting fresh.");
                ledger = [];
            }
        } else {
            console.log("⚠️ Ledger file not found, creating new one.");
        }

        // 3. Check for duplicates
        const exists = ledger.find(c => c.certificateHash === certificate.certificateHash);
        if (exists) {
            console.log(`⚠️ Ledger: Certificate ${certificate.certificateHash} already exists. Skipping.`);
            return;
        }

        // 4. Prepare Data (Explicit Mapping)
        const newEntry = {
            certificateHash: certificate.certificateHash,
            sha256Hash: certificate.sha256 || certificate.sha256Hash,
            studentName: certificate.studentName,
            studentEmail: certificate.studentEmail,
            studentCode: certificate.studentCode,
            courseName: certificate.courseName,
            institutionName: certificate.institutionName,
            institutionAddress: certificate.institutionAddress || "admin@institution.edu",
            grade: certificate.grade,
            issueDate: certificate.issueDate,
            status: "ISSUED", 
            transactionHash: certificate.transactionHash || "0x" + require('crypto').randomBytes(32).toString('hex'),
            blockNumber: 123456,
            verified: true,
            blockchainVerified: true,
            addedAt: new Date().toISOString()
        };

        // 5. Save
        ledger.push(newEntry);
        fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2));
        
        console.log(`✅ SUCCESS: Added ${certificate.certificateHash} to mockBlockchain.json`);

    } catch (error) {
        console.error("❌ Ledger Write Error:", error);
    }
};

module.exports = { addToLedger };