// scripts/deploy.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Starting deployment...");
    console.log("=".repeat(50));

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📍 Deployer address:", deployer.address);

    // Get balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Deployer balance:", hre.ethers.formatEther(balance), "ETH");
    console.log("=".repeat(50));

    // Deploy CertificateVerification contract
    console.log("📄 Deploying CertificateVerification contract...");
    
    const CertificateVerification = await hre.ethers.getContractFactory("CertificateVerification");
    const contract = await CertificateVerification.deploy();
    
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log("✅ CertificateVerification deployed to:", contractAddress);
    
    // Get deployment transaction
    const deploymentTx = contract.deploymentTransaction();
    console.log("📝 Transaction hash:", deploymentTx.hash);
    
    // Wait for confirmations
    console.log("⏳ Waiting for confirmations...");
    await deploymentTx.wait(1);
    console.log("✅ Deployment confirmed!");
    
    console.log("=".repeat(50));

    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        contractAddress: contractAddress,
        deployer: deployer.address,
        transactionHash: deploymentTx.hash,
        timestamp: new Date().toISOString(),
        blockNumber: deploymentTx.blockNumber
    };

    // Save to file
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentPath = path.join(deploymentsDir, `${hre.network.name}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Deployment info saved to:", deploymentPath);

    // Copy ABI to backend
    const artifactPath = path.join(
        __dirname, 
        "../artifacts/contracts/CertificateVerification.sol/CertificateVerification.json"
    );
    
    if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
        
        // Save to backend
        const backendAbiDir = path.join(__dirname, "../../server/abi");
        if (!fs.existsSync(backendAbiDir)) {
            fs.mkdirSync(backendAbiDir, { recursive: true });
        }
        
        fs.writeFileSync(
            path.join(backendAbiDir, "CertificateVerification.json"),
            JSON.stringify(artifact.abi, null, 2)
        );
        console.log("📋 ABI copied to backend");
    }

    // Update .env files
    console.log("=".repeat(50));
    console.log("\n📝 UPDATE YOUR .ENV FILES:");
    console.log(`CONTRACT_ADDRESS=${contractAddress}`);
    console.log("\n");

    // Verify contract info
    console.log("=".repeat(50));
    console.log("📊 Contract Info:");
    console.log("   Network:", hre.network.name);
    console.log("   Address:", contractAddress);
    console.log("   Deployer:", deployer.address);
    console.log("=".repeat(50));

    console.log("\n✅ Deployment completed successfully!");
    
    return { contractAddress, deployer: deployer.address };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });