# RockPaperScissors test project

I this smart contract two players can play the classic game of rock, paper scissors using MATIC in Mumbai testnet.  
- To enroll, each player needs to deposit the right token amount, possibly zero and choose his opponent.
- To play, each player need to submit an unique move.
- The contract decides and rewards the winner with all token wagered.  
- Players can bet their previous winnings. Tokens are deposited in smart contract.
- To entice players to play, knowing that they may have their funds stuck in the contract if they face an uncooperative player, the institution of `terminateGame` was used. After 5 minutes without other player responding the player can terminate the game and win double wager.
- To place a wager a player should have two times more tokens deposited in smart contract.

Smart contract is tested using hardhat. Coverage 100%.  
File        |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
------------|----------|----------|----------|----------|----------------|
 contracts\ |      100 |      100 |      100 |      100 |                |
  Game.sol  |      100 |      100 |      100 |      100 |                |
------------|----------|----------|----------|----------|----------------|
All files   |      100 |      100 |      100 |      100 |                |
------------|----------|----------|----------|----------|----------------|
    
When you're done, please send an email to zak@slingshot.finance (if you're not applying through Homerun) with a link to your fork or join the [Slingshot Discord channel](https://discord.gg/JNUnqYjwmV) and let us know.  
  
Happy hacking!
