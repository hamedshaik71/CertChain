const Web3 = require('web3');
const contractABI = require('../artifacts/contracts/CertificateVerification.sol/CertificateVerification.json').abi; // Adjust path
require('dotenv').config();

// Connect to Ganache or Testnet
const web3 = new Web3(process.env.BLOCKCHAIN_URL || "http://127.0.0.1:7545");

// Get the Admin Wallet (The one paying for gas)
// If using Ganache, this is usually the first account
const privateKey = process.env.ADMIN_PRIVATE_KEY;
const account = web3.eth.accounts.privateKeyToAccount(privateKey);
web3.eth.accounts.wallet.add(account);
const adminWallet = account.address;

const contractAddress = process.env.CONTRACT_ADDRESS;
const contract = new web3.eth.Contract(contractABI, contractAddress);

console.log(`🔗 Web3 Connected. Admin: ${adminWallet}`);

module.exports = { web3, contract, adminWallet };