const chai = require('chai')
const BN = require('bn.js')
const { ethers } = require('hardhat')
const { expect } = require('chai')
const { randomBytes } = require('crypto')

// Enable and inject BN dependency
chai.use(require('chai-bn')(BN))

describe("Rock Paper Scissors Multiplayer Game Unit Test for two players",function () {
    before(async function() {
        GameContract = await ethers.getContractFactory("Game")
        gameContract = await GameContract.deploy()
        await gameContract.deployed()
        accounts = await ethers.getSigners()
        p1SecretSalt = randomBytes(32) 
        p2SecretSalt = randomBytes(32)
        p3SecretSalt = randomBytes(32)
        p4SecretSalt = randomBytes(32)
    })

    it("Deposits work", async function() {
        /// Deposit
        const amount1 = ethers.utils.parseUnits("2.0", "ether")
        const amount2 = ethers.utils.parseUnits("4.0", "ether")

        const depositP1 = await gameContract.connect(accounts[1]).deposit({value: amount1})
        depositP1.wait()
        const depositP2 = await gameContract.connect(accounts[2]).deposit({value: amount2})
        depositP2.wait()

        const balanceP1 = await gameContract.balance(accounts[1].address)
        const balanceP2 = await gameContract.balance(accounts[2].address)

        expect(balanceP1).to.equal(amount1)
        expect(balanceP2).to.equal(amount2)
    })

    it("Withdrawals work", async function() {
        const withdrawP1 = await gameContract.connect(accounts[1]).withdraw()
        withdrawP1.wait()
        const withdrawP2 = await gameContract.connect(accounts[2]).withdraw()
        withdrawP2.wait()

        const balanceP1 = await gameContract.balance(accounts[1].address)
        const balanceP2 = await gameContract.balance(accounts[2].address)

        expect(balanceP1).to.equal(0)
        expect(balanceP2).to.equal(0)
    })

    it("Makes a move with 0 deposit", async function() {
        const blindedMove = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [1, p1SecretSalt])
        const playerMove = await gameContract.connect(accounts[1]).move(blindedMove, 0, accounts[2].address)
        await playerMove.wait()
        const moveOfPlayer = await gameContract.moves(accounts[1].address)
        const latestBlock = await ethers.provider.getBlock("latest")

        expect(moveOfPlayer.blindedMove).to.equal(blindedMove)
        expect(moveOfPlayer.wager).to.equal(0)
        expect(moveOfPlayer.timeStamp).to.equal(latestBlock.timestamp)
        expect(moveOfPlayer.counterPlayer).to.equal(accounts[2].address)
        expect(moveOfPlayer.notRevealed).to.equal(true)
        expect(moveOfPlayer.choice).to.equal(0)
    })

    it("Should fail to abort the move before 5 minutes period", async function() {
        await expect(gameContract.connect(accounts[1]).terminateGame()).to.be.revertedWith("TooEarly")
    } )

    it("Reverts when trying to reveal when the challenge is not accepted", async function() {
        await expect(gameContract.connect(accounts[1]).reveal(1, p1SecretSalt)).to.be.revertedWith("ChallengeNotTaken")
    })

    it("Aborts the move if the other player does not play at all in 5 minutes", async function() {
        /// Increase the timestamp of next block
        const moreThanFiveMinutes = 5 * 60 + 1
        await network.provider.send("evm_increaseTime", [moreThanFiveMinutes])
        await network.provider.send("evm_mine")

        const abortMove = await gameContract.connect(accounts[1]).terminateGame()
        abortMove.wait()
        const moveOfPlayer = await gameContract.moves(accounts[1].address)

        expect(moveOfPlayer.wager).to.equal(0)
        expect(moveOfPlayer.counterPlayer).to.equal(ethers.constants.AddressZero)
        expect(moveOfPlayer.notRevealed).to.equal(false)
    })

    it("Reverts if the proposed wagre is more than player's deposit", async function() {
        const blindedMove = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [1, p1SecretSalt])
        await expect(gameContract.connect(accounts[1]).move(blindedMove, ethers.utils.parseUnits("0.5", "ether"), accounts[2].address)).to.be.revertedWith("InsufficientDeposit")
    })

    it("Aborts the move and get back the wager if the other player does not play at all in 5 minutes.", async function() {
        const amount = ethers.utils.parseUnits("2.0", "ether")
        const depositP3 = await gameContract.connect(accounts[3]).deposit({value: amount})
        depositP3.wait()

        const blindedMove = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [1, p3SecretSalt])
        const playerMove = await gameContract.connect(accounts[3]).move(blindedMove, ethers.utils.parseUnits("0.5", "ether"), accounts[2].address)
        await playerMove.wait()

        /// Increase the timestamp of next block
        const moreThanFiveMinutes = 5 * 60 + 1
        await network.provider.send("evm_increaseTime", [moreThanFiveMinutes])
        await network.provider.send("evm_mine")

        const abortMove = await gameContract.connect(accounts[3]).terminateGame()
        abortMove.wait()
        const moveOfPlayer = await gameContract.moves(accounts[3].address)
        const balanceOfPlayer = await gameContract.balance(accounts[3].address)

        expect(moveOfPlayer.wager).to.equal(0)
        expect(moveOfPlayer.counterPlayer).to.equal(ethers.constants.AddressZero)
        expect(moveOfPlayer.notRevealed).to.equal(false)
        expect(balanceOfPlayer).to.equal(amount)
    })

    it("Reveals when the challenge is accepted", async function() {
        /// Game where rock plays with paper
        const depositP1 = await gameContract.connect(accounts[1]).deposit({value: ethers.utils.parseUnits("0.5", "ether")})
        const depositP2 = await gameContract.connect(accounts[2]).deposit({value: ethers.utils.parseUnits("1.0", "ether")})

        const blindedMoveP1 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [1, p1SecretSalt])  /// P1 pisk ROCK
        await gameContract.connect(accounts[1]).move(blindedMoveP1, ethers.utils.parseUnits("0.1", "ether"), accounts[2].address)

        const blindedMoveP2 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [2, p2SecretSalt])  /// P2 pick PAPER
        await gameContract.connect(accounts[2]).move(blindedMoveP2, ethers.utils.parseUnits("0.1", "ether"), accounts[1].address)

        await gameContract.connect(accounts[1]).reveal(1, p1SecretSalt)
        await gameContract.connect(accounts[2]).reveal(2, p2SecretSalt)

        const moveP1 = await gameContract.moves(accounts[1].address)
        const moveP2 = await gameContract.moves(accounts[2].address)

        expect(moveP1.choice).to.equal(1)
        expect(moveP2.choice).to.equal(2)
    })

    it("Rock loses with paper", async function() {
        const balanceBeforeP1 = await gameContract.balance(accounts[1].address)
        const balanceBeforeP2 = await gameContract.balance(accounts[2].address)

        const wager = ethers.utils.parseUnits("0.1", "ether")

        const result = await gameContract.connect(accounts[1]).result()
        const txReceipt = await result.wait()
        const event = txReceipt.events.find(event => event.event === "GameEnded")
        const [winner] = event.args

        const moveP1 = await gameContract.moves(accounts[1].address)
        const moveP2 = await gameContract.moves(accounts[2].address)
        const balanceP1 = await gameContract.balance(accounts[1].address)
        const balanceP2 = await gameContract.balance(accounts[2].address)

        const expectedBalanceP1 = balanceBeforeP1.sub(wager)
        const expectedBalanceP2 = balanceBeforeP2.add(wager)
        
        expect(winner).to.equal(accounts[2].address)
        expect(moveP1.wager).to.equal(0)
        expect(moveP2.wager).to.equal(0)
        expect(moveP1.counterPlayer).to.equal(ethers.constants.AddressZero)
        expect(moveP2.counterPlayer).to.equal(ethers.constants.AddressZero)
        expect(balanceP1).to.equal(expectedBalanceP1)
        expect(balanceP2).to.equal(expectedBalanceP2)
    })

    it("Rock wins with scissors", async function() {
        const balanceBeforeP1 = await gameContract.balance(accounts[1].address)
        const balanceBeforeP2 = await gameContract.balance(accounts[2].address)
        /// Move phase
        const blindedMoveP1 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [1, p1SecretSalt])  /// P1 pick ROCK
        await gameContract.connect(accounts[1]).move(blindedMoveP1, ethers.utils.parseUnits("0.2", "ether"), accounts[2].address)

        const blindedMoveP2 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [3, p2SecretSalt])  /// P2 pick SCISSORS
        await gameContract.connect(accounts[2]).move(blindedMoveP2, ethers.utils.parseUnits("0.1", "ether"), accounts[1].address)
        /// Reveal phase
        await gameContract.connect(accounts[1]).reveal(1, p1SecretSalt)
        await gameContract.connect(accounts[2]).reveal(3, p2SecretSalt)
        /// Result phase
        const wager = ethers.utils.parseUnits("0.1", "ether")

        const result = await gameContract.connect(accounts[1]).result()
        const txReceipt = await result.wait()
        const event = txReceipt.events.find(event => event.event === "GameEnded")
        const [winner] = event.args
        /// Checking
        const moveP1 = await gameContract.moves(accounts[1].address)
        const moveP2 = await gameContract.moves(accounts[2].address)
        const balanceP1 = await gameContract.balance(accounts[1].address)
        const balanceP2 = await gameContract.balance(accounts[2].address)

        const expectedBalanceP1 = balanceBeforeP1.add(wager)
        const expectedBalanceP2 = balanceBeforeP2.sub(wager)

        expect(winner).to.equal(accounts[1].address)
        expect(moveP1.wager).to.equal(0)
        expect(moveP2.wager).to.equal(0)
        expect(moveP1.counterPlayer).to.equal(ethers.constants.AddressZero)
        expect(moveP2.counterPlayer).to.equal(ethers.constants.AddressZero)
        expect(balanceP1).to.equal(expectedBalanceP1)
        expect(balanceP2).to.equal(expectedBalanceP2)
    })

    it("Paper loses with scissors", async function() {
        const balanceBeforeP1 = await gameContract.balance(accounts[1].address)
        const balanceBeforeP2 = await gameContract.balance(accounts[2].address)
        /// Move phase
        const blindedMoveP1 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [2, p1SecretSalt])  /// P1 pick PAPER
        await gameContract.connect(accounts[1]).move(blindedMoveP1, ethers.utils.parseUnits("0.1", "ether"), accounts[2].address)

        const blindedMoveP2 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [3, p2SecretSalt])  /// P2 pick SCISSORS
        await gameContract.connect(accounts[2]).move(blindedMoveP2, ethers.utils.parseUnits("0.2", "ether"), accounts[1].address)
        /// Reveal phase
        await gameContract.connect(accounts[1]).reveal(2, p1SecretSalt)
        await gameContract.connect(accounts[2]).reveal(3, p2SecretSalt)
        /// Result phase
        const wager = ethers.utils.parseUnits("0.1", "ether")

        const result = await gameContract.connect(accounts[1]).result()
        const txReceipt = await result.wait()
        const event = txReceipt.events.find(event => event.event === "GameEnded")
        const [winner] = event.args
        /// Checking
        const moveP1 = await gameContract.moves(accounts[1].address)
        const moveP2 = await gameContract.moves(accounts[2].address)
        const balanceP1 = await gameContract.balance(accounts[1].address)
        const balanceP2 = await gameContract.balance(accounts[2].address)

        const expectedBalanceP1 = balanceBeforeP1.sub(wager)
        const expectedBalanceP2 = balanceBeforeP2.add(wager)

        expect(winner).to.equal(accounts[2].address)
        expect(moveP1.wager).to.equal(0)
        expect(moveP2.wager).to.equal(0)
        expect(moveP1.counterPlayer).to.equal(ethers.constants.AddressZero)
        expect(moveP2.counterPlayer).to.equal(ethers.constants.AddressZero)
        expect(balanceP1).to.equal(expectedBalanceP1)
        expect(balanceP2).to.equal(expectedBalanceP2)

    })

    it("Paper wins with rock", async function() {
        /// Move phase
        const blindedMoveP1 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [2, p1SecretSalt])  /// P1 pick PAPER
        await gameContract.connect(accounts[1]).move(blindedMoveP1, 0, accounts[2].address)
        
        const blindedMoveP2 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [1, p2SecretSalt])  /// P2 pick ROCK
        await gameContract.connect(accounts[2]).move(blindedMoveP2, 0, accounts[1].address)
        /// Reveal phase
        await gameContract.connect(accounts[1]).reveal(2, p1SecretSalt)
        await gameContract.connect(accounts[2]).reveal(1, p2SecretSalt)
        /// Result phase
        const result = await gameContract.connect(accounts[1]).result()
        const txReceipt = await result.wait()
        const event = txReceipt.events.find(event => event.event === "GameEnded")
        const [winner] = event.args
        /// Checking
        const moveP1 = await gameContract.moves(accounts[1].address)
        const moveP2 = await gameContract.moves(accounts[2].address)

        expect(winner).to.equal(accounts[1].address)
        expect(moveP1.counterPlayer).to.equal(ethers.constants.AddressZero)
        expect(moveP2.counterPlayer).to.equal(ethers.constants.AddressZero)
    })

    it("Draws are settled properly", async function() {
        const balanceBeforeP1 = await gameContract.balance(accounts[1].address)
        const balanceBeforeP2 = await gameContract.balance(accounts[2].address)
        /// Move phase
        const blindedMoveP1 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [2, p1SecretSalt])  /// P1 pick PAPER
        await gameContract.connect(accounts[1]).move(blindedMoveP1, ethers.utils.parseUnits("0.1", "ether"), accounts[2].address)

        const blindedMoveP2 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [2, p2SecretSalt])  /// P2 pick PAPER
        await gameContract.connect(accounts[2]).move(blindedMoveP2, ethers.utils.parseUnits("0.2", "ether"), accounts[1].address)
        /// Reveal phase
        await gameContract.connect(accounts[1]).reveal(2, p1SecretSalt)
        await gameContract.connect(accounts[2]).reveal(2, p2SecretSalt)
        /// Result phase
        const wager = ethers.utils.parseUnits("0.1", "ether")

        const result = await gameContract.connect(accounts[2]).result()
        const txReceipt = await result.wait()
        const event = txReceipt.events.find(event => event.event === "GameEnded")
        const [winner] = event.args
        /// Checking
        const moveP1 = await gameContract.moves(accounts[1].address)
        const moveP2 = await gameContract.moves(accounts[2].address)
        const balanceP1 = await gameContract.balance(accounts[1].address)
        const balanceP2 = await gameContract.balance(accounts[2].address)
        const expectedBalanceP1 = balanceBeforeP1
        const expectedBalanceP2 = balanceBeforeP2

        expect(winner).to.equal(ethers.constants.AddressZero)
        expect(moveP1.wager).to.equal(0)
        expect(moveP2.wager).to.equal(0)
        expect(moveP1.counterPlayer).to.equal(ethers.constants.AddressZero)
        expect(moveP2.counterPlayer).to.equal(ethers.constants.AddressZero)
        expect(balanceP1).to.equal(expectedBalanceP1)
        expect(balanceP2).to.equal(expectedBalanceP2)
    })

    it("Player with none choice loses with every item", async function() {
        /// Move phase
        const blindedMoveP1 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [1, p1SecretSalt])  /// P1 picks ROCK
        await gameContract.connect(accounts[1]).move(blindedMoveP1, 0, accounts[2].address)
        const blindedMoveP2 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [0, p2SecretSalt])  /// P2 picks NONE
        await gameContract.connect(accounts[2]).move(blindedMoveP2, 0, accounts[1].address)
        const blindedMoveP3 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [2, p3SecretSalt])  /// P3 picks PAPER
        await gameContract.connect(accounts[3]).move(blindedMoveP3, 0, accounts[4].address)
        const blindedMoveP4 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [0, p4SecretSalt])  /// P4 picks NONE
        await gameContract.connect(accounts[4]).move(blindedMoveP4, 0, accounts[3].address)
        const blindedMoveP5 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [3, p1SecretSalt])  /// P5 picks SCISSORS
        await gameContract.connect(accounts[5]).move(blindedMoveP5, 0, accounts[6].address)
        const blindedMoveP6 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [0, p2SecretSalt])  /// P6 picks NONE
        await gameContract.connect(accounts[6]).move(blindedMoveP6, 0, accounts[5].address)
        /// Reveal phase
        await gameContract.connect(accounts[1]).reveal(1, p1SecretSalt)
        await gameContract.connect(accounts[2]).reveal(0, p2SecretSalt)
        await gameContract.connect(accounts[3]).reveal(2, p3SecretSalt)
        await gameContract.connect(accounts[4]).reveal(0, p4SecretSalt)
        await gameContract.connect(accounts[5]).reveal(3, p1SecretSalt)
        await gameContract.connect(accounts[6]).reveal(0, p2SecretSalt)
        /// Result phase
        const result1 = await gameContract.connect(accounts[2]).result()
        const txReceipt1 = await result1.wait()
        const event1 = txReceipt1.events.find(event => event.event === "GameEnded")
        const [winner1] = event1.args

        const result2 = await gameContract.connect(accounts[3]).result()
        const txReceipt2 = await result2.wait()
        const event2 = txReceipt2.events.find(event => event.event === "GameEnded")
        const [winner2] = event2.args

        const result3 = await gameContract.connect(accounts[6]).result()
        const txReceipt3 = await result3.wait()
        const event3 = txReceipt3.events.find(event => event.event === "GameEnded")
        const [winner3] = event3.args

        expect(winner1).to.equal(accounts[1].address)
        expect(winner2).to.equal(accounts[3].address)
        expect(winner3).to.equal(accounts[5].address)
    })

    it("Is a draw if both players pick None", async function() {
        /// Move phase
        const blindedMoveP1 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [0, p1SecretSalt])  /// P1 picks NONE
        await gameContract.connect(accounts[1]).move(blindedMoveP1, 0, accounts[2].address)
        const blindedMoveP2 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [0, p2SecretSalt])  /// P2 picks NONE
        await gameContract.connect(accounts[2]).move(blindedMoveP2, 0, accounts[1].address)
        /// Reveal phase
        await gameContract.connect(accounts[1]).reveal(0, p1SecretSalt)
        await gameContract.connect(accounts[2]).reveal(0, p2SecretSalt)
        /// Result phase
        const result = await gameContract.connect(accounts[2]).result()
        const txReceipt = await result.wait()
        const event = txReceipt.events.find(event => event.event === "GameEnded")
        const [winner] = event.args

        expect(winner).to.equal(ethers.constants.AddressZero)
    })

    it("Terminate the game if the other player does not want to reveal", async function() {
        const balanceBeforeP1 = await gameContract.balance(accounts[1].address)
        const balanceBeforeP2 = await gameContract.balance(accounts[2].address)
        /// Move phase
        const blindedMoveP1 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [2, p1SecretSalt])  /// P1 pick PAPER
        await gameContract.connect(accounts[1]).move(blindedMoveP1, ethers.utils.parseUnits("0.1", "ether"), accounts[2].address)

        const blindedMoveP2 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [3, p2SecretSalt])  /// P2 pick SCISSORS
        await gameContract.connect(accounts[2]).move(blindedMoveP2, ethers.utils.parseUnits("0.2", "ether"), accounts[1].address)
        /// Reveal phase
        await gameContract.connect(accounts[1]).reveal(2, p1SecretSalt)
        /// Increase the timestamp of next block
        const moreThanFiveMinutes = 5 * 60 + 1
        await network.provider.send("evm_increaseTime", [moreThanFiveMinutes])
        await network.provider.send("evm_mine")
        /// Result phase  
        await gameContract.connect(accounts[1]).terminateGame()
        const result = await gameContract.connect(accounts[1]).result()
        const txReceipt = await result.wait()
        const event = txReceipt.events.find(event => event.event === "GameEnded")
        const [winner] = event.args
        
        /// Checking
        const wager = ethers.utils.parseUnits("0.2", "ether")
        const moveP1 = await gameContract.moves(accounts[1].address)
        const moveP2 = await gameContract.moves(accounts[2].address)
        const balanceP1 = await gameContract.balance(accounts[1].address)
        const balanceP2 = await gameContract.balance(accounts[2].address)

        const expectedBalanceP1 = balanceBeforeP1.add(wager)
        const expectedBalanceP2 = balanceBeforeP2.sub(wager)

        expect(winner).to.equal(accounts[1].address)
        expect(moveP1.wager).to.equal(0)
        expect(moveP2.wager).to.equal(0)
        expect(moveP1.counterPlayer).to.equal(ethers.constants.AddressZero)
        expect(moveP2.counterPlayer).to.equal(ethers.constants.AddressZero)
        expect(balanceP1).to.equal(expectedBalanceP1)
        expect(balanceP2).to.equal(expectedBalanceP2)
    })

    it("Player cannot escape revealing", async function() {
        /// Move phase
        const blindedMoveP1 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [2, p1SecretSalt])  /// P1 pick PAPER
        await gameContract.connect(accounts[1]).move(blindedMoveP1, ethers.utils.parseUnits("0.1", "ether"), accounts[2].address)

        const blindedMoveP2 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [3, p2SecretSalt])  /// P2 pick SCISSORS
        await gameContract.connect(accounts[2]).move(blindedMoveP2, ethers.utils.parseUnits("0.2", "ether"), accounts[1].address)
        /// Reveal phase
        await gameContract.connect(accounts[2]).reveal(3, p2SecretSalt)
        /// Increase the timestamp of next block
        const moreThanFiveMinutes = 5 * 60 + 1
        await network.provider.send("evm_increaseTime", [moreThanFiveMinutes])
        await network.provider.send("evm_mine")
        /// Result phase
        await expect(gameContract.connect(accounts[1]).terminateGame()).to.be.revertedWith("RevealMoveFirst")
        
        await gameContract.connect(accounts[2]).terminateGame()
        const result = await gameContract.connect(accounts[2]).result()
        const txReceipt = await result.wait()
        const event = txReceipt.events.find(event => event.event === "GameEnded")
        const [winner] = event.args
        
        expect(winner).to.equal(accounts[2].address)
    })

    it("Player cannot double wager trying to terminate the game", async function() {
        /// Move phase
        const blindedMoveP1 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [2, p1SecretSalt])  /// P1 pick PAPER
        await gameContract.connect(accounts[1]).move(blindedMoveP1, ethers.utils.parseUnits("0.1", "ether"), accounts[2].address)

        const blindedMoveP2 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [3, p2SecretSalt])  /// P2 pick SCISSORS
        await gameContract.connect(accounts[2]).move(blindedMoveP2, ethers.utils.parseUnits("0.2", "ether"), accounts[1].address)
        /// Reveal phase
        await gameContract.connect(accounts[1]).reveal(2, p1SecretSalt)
        /// Increase the timestamp of next block
        const moreThanFiveMinutes = 5 * 60 + 1
        await network.provider.send("evm_increaseTime", [moreThanFiveMinutes])
        await network.provider.send("evm_mine")
        /// Result phase
        await expect(gameContract.connect(accounts[2]).terminateGame()).to.be.revertedWith("RevealMoveFirst")
        // await gameContract.connect(accounts[2]).reveal(2, p2SecretSalt)
        // await expect(gameContract.connect(accounts[2]).terminateGame()).to.be.revertedWith("ResultFunctionShouldBeCalled")
    })


    


    
})
//  

//  
//     // it("The rock loses with the paper", async function() {
//     //     const result = await gameContract.connect(accounts[0]).result()
//     //     const rc = await result.wait()
//     //     const event = rc.events.find(event => event.event === "GameEnded")
//     //     const [winner] = event.args
//     //     expect(winner).to.equal(accounts[1].address)
//     // })

//     // it("The paper wins with the rock", async function() {
//     //     const result = await gameContract.connect(accounts[1]).result()
//     //     const rc = await result.wait()
//     //     const event = rc.events.find(event => event.event === "GameEnded")
//     //     const [winner] = event.args
//     //     expect(winner).to.equal(accounts[1].address)
//     // })

//     // it("The rock wins with the scissors", async function() {
//     //     const blindedMoveP1 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [1, firstPlayerSecretSalt])
//     //     const blindedMoveP2 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [3, firstPlayerSecretSalt])
//     //     const moveP1 = await gameContract.connect(accounts[0]).move(blindedMoveP1, accounts[1].address)
//     //     await moveP1.wait()
//     //     const moveP2 = await gameContract.connect(accounts[1]).move(blindedMoveP2, accounts[0].address)
//     //     await moveP2.wait()

//     //     const revealP1 = await gameContract.connect(accounts[0]).reveal(1, firstPlayerSecretSalt)
//     //     await revealP1.wait()
//     //     const revealP2 = await gameContract.connect(accounts[1]).reveal(3, firstPlayerSecretSalt)
//     //     await revealP2.wait()

//     //     const movesOfP1 = await gameContract.moves(accounts[0].address)
//     //     const movesOfP2 = await gameContract.moves(accounts[1].address)

//     //     const result = await gameContract.connect(accounts[0]).result()
//     //     const rc = await result.wait()
//     //     const event = rc.events.find(event => event.event === "GameEnded")
//     //     const [winner] = event.args

//     //     expect(movesOfP1.choice).to.equal(1)
//     //     expect(movesOfP2.choice).to.equal(3)
//     //     expect(winner).to.equal(accounts[0].address)


//     // })
    
// })

// describe("Rock Paper Scissors Multiplayer Game for a few games in the same time.", async function() {
//     before(async function() {
//         GameContract = await ethers.getContractFactory("Game")
//         gameContract = await GameContract.deploy()
//         await gameContract.deployed()
//         accounts = await ethers.getSigners()
//     })
    
//     it("Is possible to play for several players independently, the rock loses with the scissors and the scissors wins wuth the paper.", async () => {
//         const secretSaltP3 = ethers.utils.formatBytes32String("EleMeleDudki2021!?")
//         const secretSaltP4 = ethers.utils.formatBytes32String("Źdzbło")
//         const secretSaltP5 = ethers.utils.formatBytes32String("12345678")
//         const secretSaltP6 = ethers.utils.formatBytes32String("123BabaJagaPatrzy!!??")
        
//         const blindedMoveP3 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [3, secretSaltP3])
//         const blindedMoveP4 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [1, secretSaltP4])
//         const blindedMoveP5 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [2, secretSaltP5])
//         const blindedMoveP6 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [3, secretSaltP6])
        
//         await gameContract.connect(accounts[2]).move(blindedMoveP3, accounts[3].address)
//         await gameContract.connect(accounts[3]).move(blindedMoveP4, accounts[2].address)
//         await gameContract.connect(accounts[4]).move(blindedMoveP5, accounts[5].address)
//         await gameContract.connect(accounts[5]).move(blindedMoveP6, accounts[4].address)

//         const moveP3 = await gameContract.moves(accounts[2].address)
//         const moveP4 = await gameContract.moves(accounts[3].address)
//         const moveP5 = await gameContract.moves(accounts[4].address)
//         const moveP6 = await gameContract.moves(accounts[5].address)

//         await gameContract.connect(accounts[2]).reveal(3, secretSaltP3)
//         await gameContract.connect(accounts[3]).reveal(1, secretSaltP4)
//         await gameContract.connect(accounts[4]).reveal(2, secretSaltP5)
//         await gameContract.connect(accounts[5]).reveal(3, secretSaltP6)

//         const resultGame2 = await gameContract.connect(accounts[2]).result()
//         const rc2 = await resultGame2.wait()
//         const event2 = rc2.events.find(event => event.event === "GameEnded")
//         const [winner2] = event2.args

//         const resultGame3 = await gameContract.connect(accounts[5]).result()
//         const rc3 = await resultGame3.wait()
//         const event3 = rc3.events.find(event => event.event === "GameEnded")
//         const [winner3] = event3.args
        
//         expect(winner2).to.equal(accounts[3].address)
//         expect(winner3).to.equal(accounts[5].address)
//     })
// })

