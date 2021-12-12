const { network } = require("hardhat")
const fs = require("fs-extra")

async function main() {

  const [deployer] = await ethers.getSigners()
  console.log(
    "Deploying the contracts with the account:",
    await deployer.getAddress()
  );

  console.log("Account balance:", (await deployer.getBalance()).toString())

  const Game = await ethers.getContractFactory("Game")
  const game = await Game.deploy()
  await game.deployed()

  console.log("Game address:", game.address)

  saveBuildFiles(game)
}

function saveBuildFiles(game) {

  const contractsDir = "build/"

  let deploymentsMap = {}
  if (fs.pathExistsSync(contractsDir + "deployments/map.json")) {
    deploymentsMap = fs.readJSONSync(contractsDir + "deployments/map.json");
  }
  fs.ensureFileSync(contractsDir + "contracts/Game.json")

  const newAddress = game.address
  deploymentsMap[network.config.chainId] = newAddress

  fs.outputJsonSync(
    contractsDir + `deployments/map.json`,
    deploymentsMap
  );

  const GameArtifact = artifacts.readArtifactSync("Game");

  fs.writeFileSync(
    contractsDir + "contracts/Game.json",
    JSON.stringify(GameArtifact, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });