const Certificate = require('../models/Certificate');
const crypto = require('crypto');
// 👇 Make sure this path points to your actual web3 config file
const { web3, contract, adminWallet } = require('../config/web3'); 

// POST /api/admin/process-certificate
exports.processCertificate = async (req, res) => {
    console.log("⚡ Processing certificate...");
    
    try {
        const { certificateId, action, comments } = req.body;
        const adminEmail = req.user ? req.user.email : "admin@certchain.io";

        // 1. FIND CERTIFICATE
        const certificate = await Certificate.findById(certificateId);
        if (!certificate) {
            return res.status(404).json({ success: false, message: "Certificate not found" });
        }

        console.log(`⚡ Action: ${action} on Cert: ${certificate.certificateHash}`);

        // ==========================================
        // 🛑 REJECT LOGIC
        // ==========================================
        if (action === 'REJECT') {
            certificate.status = 'REJECTED';
            certificate.rejectionReason = comments;
            certificate.approvals.level3 = {
                status: 'REJECTED',
                approvedBy: adminEmail,
                date: new Date(),
                comments
            };
            await certificate.save();
            return res.json({ success: true, message: "Certificate Rejected", status: 'REJECTED' });
        }

        // ==========================================
        // ✅ APPROVE LOGIC (BLOCKCHAIN WRITE)
        // ==========================================
        if (action === 'APPROVE') {
            
            // 🚨 CRITICAL FIX: PREPARE ID FOR BLOCKCHAIN
            // We need a 32-byte Hex string. 
            // 1. Try to use the stored sha256.
            // 2. If missing, generate it from the custom ID.
            
            let blockchainId = certificate.sha256;

            // SAFETY CHECK: If sha256 is missing or looks like "CERT-...", fix it.
            if (!blockchainId || blockchainId.includes('CERT-')) {
                console.log("⚠️ sha256 was invalid/missing. Regenerating hash for blockchain...");
                // Create a hash from the Unique ID to ensure it fits bytes32
                blockchainId = crypto.createHash('sha256').update(certificate.certificateHash).digest('hex');
            }
            
            // Ensure it starts with 0x
            if (!blockchainId.startsWith('0x')) {
                blockchainId = '0x' + blockchainId;
            }

            console.log("🔗 Connecting to Blockchain...");
            console.log(`   📝 ID Being Sent (bytes32): ${blockchainId}`); // CHECK THIS LOG!

            // Prepare Dates (Solidity needs Seconds, JS gives Milliseconds)
            const issueDateSeconds = Math.floor(new Date(certificate.issueDate).getTime() / 1000);
            const expiryDateSeconds = certificate.expiryDate 
                ? Math.floor(new Date(certificate.expiryDate).getTime() / 1000) 
                : Math.floor((Date.now() + (365 * 24 * 60 * 60 * 1000)) / 1000); // Default 1 year if null

            // 🚀 INTERACT WITH SMART CONTRACT
            try {
                // Estimate gas first to catch errors early
                const gasEstimate = await contract.methods.issueCertificate(
                    blockchainId,                // _certificateHash (The Fix!)
                    certificate.studentCode,     // _studentCode
                    certificate.courseName,      // _courseName
                    certificate.grade,           // _grade
                    issueDateSeconds,            // _issueDate
                    expiryDateSeconds,           // _expiryDate
                    "STORED_IN_DB",              // _ipfsHash
                    blockchainId                 // _documentHash
                ).estimateGas({ from: adminWallet });

                console.log(`   ⛽ Gas Estimated: ${gasEstimate}`);

                const receipt = await contract.methods.issueCertificate(
                    blockchainId,
                    certificate.studentCode,
                    certificate.courseName,
                    certificate.grade,
                    issueDateSeconds,
                    expiryDateSeconds,
                    "STORED_IN_DB",
                    blockchainId
                ).send({ 
                    from: adminWallet, 
                    gas: Math.floor(gasEstimate * 1.2) // Add 20% buffer
                });

                console.log(`   ✅ Transaction Successful: ${receipt.transactionHash}`);

                // SAVE SUCCESS TO DB
                certificate.status = 'ISSUED';
                certificate.transactionHash = receipt.transactionHash;
                certificate.blockNumber = Number(receipt.blockNumber);
                certificate.approvals.level3 = {
                    status: 'APPROVED',
                    approvedBy: adminEmail,
                    date: new Date(),
                    comments: comments || "Approved on Blockchain"
                };

                // Also update the sha256 to match what is on blockchain (for verification)
                // Remove '0x' for DB storage if you prefer standard hex
                certificate.sha256 = blockchainId.replace('0x', '');

                await certificate.save();

                return res.json({ 
                    success: true, 
                    message: "Certificate Issued on Blockchain", 
                    transactionHash: receipt.transactionHash,
                    status: 'ISSUED'
                });

            } catch (chainError) {
                console.error("⚠️ Blockchain Write Failed:", chainError.message);
                return res.status(500).json({ 
                    success: false, 
                    message: "Blockchain Transaction Failed: " + chainError.message,
                    error: chainError.message 
                });
            }
        }

    } catch (error) {
        console.error("💥 Server Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};