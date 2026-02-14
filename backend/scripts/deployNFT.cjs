// scripts/deployNFT.cjs
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🎨 Starting NFT Contract Deployment...");
    console.log("=".repeat(50));

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📍 Deployer address:", deployer.address);

    // Get balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Deployer balance:", hre.ethers.formatEther(balance), "ETH");
    console.log("=".repeat(50));

    // Deploy CertificateNFT contract
    console.log("📄 Deploying CertificateNFT contract...");

    const CertificateNFT = await hre.ethers.getContractFactory("CertificateNFT");
    const nftContract = await CertificateNFT.deploy();

    await nftContract.waitForDeployment();

    const nftContractAddress = await nftContract.getAddress();
    console.log("✅ CertificateNFT deployed to:", nftContractAddress);

    // Get deployment transaction
    const deploymentTx = nftContract.deploymentTransaction();
    console.log("📝 Transaction hash:", deploymentTx.hash);

    // Wait for confirmations
    console.log("⏳ Waiting for confirmations...");
    await deploymentTx.wait(1);
    console.log("✅ Deployment confirmed!");

    console.log("=".repeat(50));

    // Verify NFT contract info
    console.log("🔍 Verifying NFT contract...");
    const name = await nftContract.name();
    const symbol = await nftContract.symbol();
    const owner = await nftContract.owner();
    const totalCerts = await nftContract.totalCertificates();

    console.log("   Name:", name);
    console.log("   Symbol:", symbol);
    console.log("   Owner:", owner);
    console.log("   Total Minted:", totalCerts.toString());
    console.log("=".repeat(50));

    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        contractName: "CertificateNFT",
        contractAddress: nftContractAddress,
        deployer: deployer.address,
        transactionHash: deploymentTx.hash,
        timestamp: new Date().toISOString(),
        blockNumber: deploymentTx.blockNumber
    };

    // Save to deployments folder
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentPath = path.join(deploymentsDir, `nft-${hre.network.name}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Deployment info saved to:", deploymentPath);

    // Copy ABI to backend
    const artifactPath = path.join(
        __dirname,
        "../artifacts/contracts/CertificateNFT.sol/CertificateNFT.json"
    );

    if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

        // Try multiple possible backend paths
        const possibleBackendDirs = [
            path.join(__dirname, "../../server/abi"),
            path.join(__dirname, "../../backend/abi"),
            path.join(__dirname, "../server/abi"),
            path.join(__dirname, "../backend/abi")
        ];

        let abiSaved = false;
        for (const backendAbiDir of possibleBackendDirs) {
            try {
                if (!fs.existsSync(backendAbiDir)) {
                    fs.mkdirSync(backendAbiDir, { recursive: true });
                }
                fs.writeFileSync(
                    path.join(backendAbiDir, "CertificateNFT.json"),
                    JSON.stringify(artifact.abi, null, 2)
                );
                console.log("📋 ABI saved to:", backendAbiDir);
                abiSaved = true;
            } catch (err) {
                // Skip if path doesn't work
            }
        }

        // Also save ABI in deployments folder as backup
        fs.writeFileSync(
            path.join(deploymentsDir, "CertificateNFT-abi.json"),
            JSON.stringify(artifact.abi, null, 2)
        );
        console.log("📋 ABI backup saved to:", path.join(deploymentsDir, "CertificateNFT-abi.json"));

        if (!abiSaved) {
            console.log("⚠️  Could not auto-copy ABI to backend.");
            console.log("   Manually copy from:", artifactPath);
        }
    }

    // Display ENV update info
    console.log("\n" + "=".repeat(60));
    console.log("📝 ADD THIS TO YOUR BACKEND .env FILE:");
    console.log("=".repeat(60));
    console.log(`NFT_CONTRACT_ADDRESS=${nftContractAddress}`);
    console.log("=".repeat(60));

    // Summary
    console.log("\n📊 DEPLOYMENT SUMMARY:");
    console.log("┌─────────────────────────────────────────────────┐");
    console.log(`│ Network:  ${hre.network.name.padEnd(39)}│`);
    console.log(`│ Contract: CertificateNFT${"".padEnd(25)}│`);
    console.log(`│ Address:  ${nftContractAddress.padEnd(39)}│`);
    console.log(`│ Owner:    ${deployer.address.padEnd(39)}│`);
    console.log(`│ Name:     ${name.padEnd(39)}│`);
    console.log(`│ Symbol:   ${symbol.padEnd(39)}│`);
    console.log("└─────────────────────────────────────────────────┘");

    console.log("\n✅ NFT Contract deployment completed successfully!");
    console.log("\n📌 NEXT STEPS:");
    console.log("   1. Copy NFT_CONTRACT_ADDRESS to your backend .env");
    console.log("   2. Make sure CertificateNFT.json ABI is in server/abi/");
    console.log("   3. Restart your backend server");
    console.log("   4. Test minting from frontend!\n");

    return { nftContractAddress, deployer: deployer.address };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });