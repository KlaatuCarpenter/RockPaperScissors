# RockPaperScissors test project

In this smart contract two players can play the classic game of rock, paper scissors using MATIC token in Mumbai testnet.  
- To enroll, each player needs to deposit the right token amount, possibly zero and choose the address of an opponent.
- To play, each player need to submit an unique move.
- The contract decides and rewards the winner with token wagered.  
- Players can bet their previous winnings. Tokens are deposited in smart contract. Withdrawal are possible anytime except during the game.
- To entice players to play, knowing that they may have their funds stuck in the contract if they face an uncooperative player, the institution of `terminateGame` was used. After 5 minutes without other player responding the player can terminate the game and win double wager.
- To place a wager a player should have two times more tokens deposited in smart contract to prevent uncooperativness as above.
- Each player can place in wager an amount of his own. During the game wagers of two players are compared and the smaller amount is taken into consideration.

To optimize gas:
- Custom errors are defined.
- Variables, which have to be on chain are optimized for storage.
- History of the games are in events.

Smart contract is tested using hardhat. Coverage 100%.  
File        |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
------------|----------|----------|----------|----------|----------------|
 contracts\ |      100 |      100 |      100 |      100 |                |
  Game.sol  |      100 |      100 |      100 |      100 |                |
------------|----------|----------|----------|----------|----------------|
All files   |      100 |      100 |      100 |      100 |                |
------------|----------|----------|----------|----------|----------------|

It is possible to verify contract code on Polygonscan: https://mumbai.polygonscan.com/address/0x05bB7FCEF2ad462FC13F5f0f92409BFC0a1fa938#code

## Task update_frontend
To make work on frontend a little bit easier I created a task `update_frontend`.  
It copies contract abi and mapping of contract's addresses to chain ids, deployed with hardhat, to relative path:  
`../frontend/src/build/`
