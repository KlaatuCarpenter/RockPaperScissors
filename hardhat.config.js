require("dotenv").config()
require("@nomiclabs/hardhat-ethers")
require("@nomiclabs/hardhat-waffle")
require("solidity-coverage")
require("./tasks/update_frontend")
require("@nomiclabs/hardhat-etherscan");

const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL || "https://polygon-mumbai.alchemyapi.io/v2/your-api-key"
const PRIVATE_KEY = process.env.PRIVATE_KEY || "your private key"
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "Polygonscan api key"

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
    },
    mumbai: {
      url: MUMBAI_RPC_URL,
      accounts: [PRIVATE_KEY],
      live: true,
      saveDeployments: true,
      chainId: 80001,
    }
  },
  etherscan: {
    apiKey: POLYGONSCAN_API_KEY
  },
  solidity: {
    version: "0.8.7",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
 }