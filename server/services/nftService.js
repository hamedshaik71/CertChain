// backend/services/nftService.js

console.log('🔍 NFT ENV DEBUG:', {
    NFT_CONTRACT_ADDRESS: process.env.NFT_CONTRACT_ADDRESS || '❌ NOT SET',
    ADMIN_PRIVATE_KEY: process.env.ADMIN_PRIVATE_KEY ? '✅ SET' : '❌ NOT SET',
    WEB3_RPC_URL: process.env.WEB3_RPC_URL || '❌ NOT SET',
    CWD: process.cwd(),
    ENV_FILE_EXISTS: require('fs').existsSync(require('path').join(process.cwd(), '.env'))
});

const { Web3 } = require('web3');
const path = require('path');
const fs = require('fs');

class NFTService {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.adminAccount = null;
        this.initialized = false;

        try {
            this._initialize();
        } catch (error) {
            console.error('❌ NFT Service init error:', error.message);
        }
    }

    _initialize() {
        // 1. Connect to blockchain
        const rpcUrl = process.env.WEB3_RPC_URL || 'http://127.0.0.1:7546';
        this.web3 = new Web3(rpcUrl);

        // 2. Load ABI - try multiple paths
        let abi = null;
        const possiblePaths = [
            path.join(__dirname, '../abi/CertificateNFT.json'),
            path.join(__dirname, '../../blockchain/deployments/CertificateNFT-abi.json'),
            path.join(__dirname, '../../backend/abi/CertificateNFT.json'),
            path.join(__dirname, '../../backend/deployments/CertificateNFT-abi.json')
        ];

        for (const abiPath of possiblePaths) {
            try {
                if (fs.existsSync(abiPath)) {
                    const fileContent = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
                    abi = Array.isArray(fileContent) ? fileContent : (fileContent.abi || fileContent);
                    console.log('✅ NFT ABI loaded from:', abiPath);
                    break;
                }
            } catch (e) {
                // try next
            }
        }

        if (!abi || abi.length === 0) {
            console.warn('⚠️ NFT Contract ABI not found');
            return;
        }

        // 3. Get contract address
        const contractAddress = process.env.NFT_CONTRACT_ADDRESS;
        if (!contractAddress) {
            console.warn('⚠️ NFT_CONTRACT_ADDRESS not set in .env');
            return;
        }

        // 4. Create contract instance
        this.contract = new this.web3.eth.Contract(abi, contractAddress);
        this.contractAddress = contractAddress;
        console.log('✅ NFT Contract loaded:', contractAddress);

        // 5. Setup admin account with private key
        const privateKey = process.env.ADMIN_PRIVATE_KEY;
        if (privateKey) {
            const cleanKey = privateKey.trim().replace(/^0x/, '');
            this.adminAccount = this.web3.eth.accounts.privateKeyToAccount('0x' + cleanKey);
            this.web3.eth.accounts.wallet.add(this.adminAccount);
            console.log('✅ NFT Admin account:', this.adminAccount.address);
            this.initialized = true;
            console.log('✅ NFT Service fully initialized!');
        } else {
            console.warn('⚠️ ADMIN_PRIVATE_KEY not set - will try accounts[0]');
            this.initialized = true;
        }
    }

    // Generate NFT metadata
    generateMetadata(certificate) {
        // ✅ FIX: Use API_URL instead of localhost
        const API_URL = process.env.API_URL || process.env.SERVER_URL || 'https://certchain-api.onrender.com';
        
        return {
            name: `${certificate.courseName} Certificate`,
            description: `Certificate awarded to ${certificate.studentName} for completing ${certificate.courseName} with grade ${certificate.grade}`,
            image: certificate.cloudinaryUrl || `${API_URL}/api/certificate/file/${certificate.certificateHash}`,
            external_url: `${API_URL}/certificate/${certificate.certificateHash}`,
            attributes: [
                { trait_type: "Student Name", value: certificate.studentName },
                { trait_type: "Course", value: certificate.courseName },
                { trait_type: "Grade", value: certificate.grade },
                { trait_type: "Institution", value: certificate.institutionName },
                { trait_type: "Issue Date", value: new Date(certificate.issueDate).toISOString().split('T')[0] },
                { trait_type: "Category", value: certificate.category || "COURSE" },
                { display_type: "date", trait_type: "Issued", value: Math.floor(new Date(certificate.issueDate).getTime() / 1000) }
            ],
            properties: {
                certificateHash: certificate.certificateHash,
                sha256: certificate.sha256,
                blockchainVerified: true
            }
        };
    }

    // Mint certificate as NFT
    async mintCertificateNFT(certificate, studentWalletAddress, institutionWalletAddress) {
        try {
            if (!this.contract) {
                return {
                    success: false,
                    error: 'NFT Contract not configured. Set NFT_CONTRACT_ADDRESS in .env'
                };
            }

            console.log('🎨 Minting NFT...');
            console.log('   Student:', certificate.studentName);
            console.log('   Course:', certificate.courseName);
            console.log('   Wallet:', studentWalletAddress);

            // Determine the "from" address (must be contract owner or authorized)
            let fromAddress;

            if (this.adminAccount) {
                fromAddress = this.adminAccount.address;
            } else {
                const accounts = await this.web3.eth.getAccounts();
                fromAddress = institutionWalletAddress || accounts[0];
            }

            console.log('🔑 Sending from:', fromAddress);

            // Validate student wallet address
            if (!studentWalletAddress || !studentWalletAddress.startsWith('0x') || !this.web3.utils.isAddress(studentWalletAddress)) {
                // Generate a valid address from student code
                const hash = this.web3.utils.sha3(
                    certificate.studentCode + certificate.studentEmail + Date.now().toString()
                );
                studentWalletAddress = '0x' + hash.slice(2, 42);
                console.log('⚠️ Generated wallet address:', studentWalletAddress);

                // Verify it's valid
                if (!this.web3.utils.isAddress(studentWalletAddress)) {
                    // Use a Ganache account as fallback
                    const accounts = await this.web3.eth.getAccounts();
                    studentWalletAddress = accounts[1] || accounts[0];
                    console.log('⚠️ Using Ganache account as fallback:', studentWalletAddress);
                }
            }

            // Generate metadata
            const metadata = this.generateMetadata(certificate);
            const tokenURI = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;

            // Estimate gas
            let gasEstimate;
            try {
                gasEstimate = await this.contract.methods.mintCertificate(
                    studentWalletAddress,
                    certificate.studentName,
                    certificate.courseName,
                    certificate.grade,
                    certificate.institutionName,
                    certificate.certificateHash,
                    tokenURI
                ).estimateGas({ from: fromAddress });

                console.log('⛽ Gas estimate:', gasEstimate.toString());
            } catch (gasError) {
                console.warn('⚠️ Gas estimation failed:', gasError.message);

                // If "Not authorized institution" error, the owner needs to be the sender
                if (gasError.message.includes('Not authorized')) {
                    console.log('🔧 Trying with contract owner...');

                    // The deployer is automatically authorized (owner)
                    // Make sure we're using the right account
                    if (this.adminAccount) {
                        fromAddress = this.adminAccount.address;
                    } else {
                        const accounts = await this.web3.eth.getAccounts();
                        fromAddress = accounts[0]; // First Ganache account = deployer = owner
                    }

                    console.log('🔑 Retrying with:', fromAddress);

                    try {
                        gasEstimate = await this.contract.methods.mintCertificate(
                            studentWalletAddress,
                            certificate.studentName,
                            certificate.courseName,
                            certificate.grade,
                            certificate.institutionName,
                            certificate.certificateHash,
                            tokenURI
                        ).estimateGas({ from: fromAddress });
                    } catch (retryError) {
                        return {
                            success: false,
                            error: `Authorization failed: ${retryError.message}. Make sure the sender is the contract owner.`
                        };
                    }
                } else {
                    gasEstimate = 3000000; // Default
                }
            }

            // Send the mint transaction
            const tx = await this.contract.methods.mintCertificate(
                studentWalletAddress,
                certificate.studentName,
                certificate.courseName,
                certificate.grade,
                certificate.institutionName,
                certificate.certificateHash,
                tokenURI
            ).send({
                from: fromAddress,
                gas: Math.floor(Number(gasEstimate) * 1.5)
            });

            // Extract token ID from events
            let tokenId = null;

            if (tx.events && tx.events.CertificateMinted) {
                tokenId = tx.events.CertificateMinted.returnValues.tokenId;
            } else if (tx.events && tx.events.Transfer) {
                tokenId = tx.events.Transfer.returnValues.tokenId;
            }

            // Fallback: get from contract
            if (!tokenId) {
                try {
                    tokenId = await this.contract.methods.hashToTokenId(certificate.certificateHash).call();
                } catch (e) {
                    try {
                        tokenId = await this.contract.methods.totalCertificates().call();
                    } catch (e2) {
                        tokenId = 'unknown';
                    }
                }
            }

            console.log('✅ NFT Minted Successfully!');
            console.log('   Token ID:', tokenId ? tokenId.toString() : 'unknown');
            console.log('   TX Hash:', tx.transactionHash);
            console.log('   Block:', tx.blockNumber);

            return {
                success: true,
                tokenId: tokenId ? tokenId.toString() : 'unknown',
                transactionHash: tx.transactionHash,
                blockNumber: Number(tx.blockNumber),    // ← Convert BigInt
                metadata,
                walletAddress: studentWalletAddress
            };

        } catch (error) {
            console.error('❌ NFT Minting Error:', error);

            let errorMessage = error.message;

            if (error.message.includes('insufficient funds')) {
                errorMessage = 'Insufficient funds for gas fees. Check Ganache account balance.';
            } else if (error.message.includes('already minted') || error.message.includes('Certificate already')) {
                errorMessage = 'Certificate already minted as NFT';
            } else if (error.message.includes('Not authorized')) {
                errorMessage = 'Sender is not authorized. The contract owner must mint or authorize the institution first.';
            } else if (error.message.includes('revert')) {
                errorMessage = 'Smart contract reverted: ' + error.message;
            } else if (error.message.includes('nonce')) {
                errorMessage = 'Transaction nonce error. Please try again.';
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    }

    // Verify NFT certificate
    async verifyNFTCertificate(certificateHash) {
        try {
            if (!this.contract) {
                return { success: false, error: 'NFT Contract not configured' };
            }

            const result = await this.contract.methods.verifyCertificate(certificateHash).call();

            return {
                success: true,
                exists: result.exists || result[0],
                isValid: result.isValid || result[1],
                studentName: result.studentName || result[2],
                courseName: result.courseName || result[3],
                grade: result.grade || result[4],
                institutionName: result.institutionName || result[5],
                issueDate: result.issueDate || result[6]
            };
        } catch (error) {
            console.error('❌ NFT Verify Error:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Get student's NFTs
    async getStudentNFTs(walletAddress) {
        try {
            if (!this.contract) {
                return { success: false, error: 'NFT Contract not configured', nfts: [] };
            }

            if (!walletAddress || !this.web3.utils.isAddress(walletAddress)) {
                return { success: false, error: 'Invalid wallet address', nfts: [] };
            }

            const tokenIds = await this.contract.methods.getStudentCertificates(walletAddress).call();

            const nfts = [];
            for (const tokenId of tokenIds) {
                try {
                    const certData = await this.contract.methods.getCertificate(tokenId).call();
                    const tokenURI = await this.contract.methods.tokenURI(tokenId).call();

                    nfts.push({
                        tokenId: tokenId.toString(),
                        studentName: certData.studentName,
                        courseName: certData.courseName,
                        grade: certData.grade,
                        institutionName: certData.institutionName,
                        certificateHash: certData.certificateHash,
                        issueDate: certData.issueDate ? new Date(Number(certData.issueDate) * 1000).toISOString() : null,
                        isValid: certData.isValid,
                        tokenURI
                    });
                } catch (e) {
                    console.warn(`⚠️ Could not fetch NFT #${tokenId}:`, e.message);
                }
            }

            return {
                success: true,
                count: nfts.length,
                nfts
            };
        } catch (error) {
            console.error('❌ Get Student NFTs Error:', error.message);
            return { success: false, error: error.message, nfts: [] };
        }
    }
}

module.exports = new NFTService();