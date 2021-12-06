async function main() {
    // We get the contract to deploy
    const Game = await ethers.getContractFactory("Game");
    const game = await Game.deploy();
  
    console.log("Rock Paper Scissors game deployed to:", game.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });