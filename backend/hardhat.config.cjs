require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.20", // ✅ MUST match pragma
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // ✅ fine for 0.8.20
    },
  },
  networks: {
    ganache: {
      url: "http://127.0.0.1:7546",
      accounts: {
        mnemonic:
          "design taste indoor pass common artefact prosper comic arrest theme forward method",
      },
    },
  },
};
