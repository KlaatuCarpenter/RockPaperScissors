const chai = require('chai')
const BN = require('bn.js')
const { ethers } = require('hardhat')
const { expect, util } = require('chai')
const { randomBytes } = require('crypto')
const utils = require("./utils")

// Enable and inject BN dependency
chai.use(require('chai-bn')(BN))

describe("Rock Paper Scissors Multiplayer Game Unit Test for two players",function () {
    before(async function() {
        GameContract = await ethers.getContractFactory("Game")
        gameContract = await GameContract.deploy()
        await gameContract.deployed()
        accounts = await ethers.getSigners()
        secretSalt = randomBytes(32)
    })

    it("Deposits work", async function() {
        /// Deposit
        const amount1 = ethers.utils.parseUnits("2.0", "ether")
        const amount2 = ethers.utils.parseUnits("4.0", "ether")
        await utils.deposit(accounts[1], amount1)
        await utils.deposit(accounts[2], amount2)

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
        const withdrawP3 = await gameContract.connect(accounts[3]).withdraw()
        withdrawP3.wait()

        const balanceP1 = await gameContract.balance(accounts[1].address)
        const balanceP2 = await gameContract.balance(accounts[2].address)
        const balanceP3 = await gameContract.balance(accounts[3].address)

        expect(balanceP1).to.equal(0)
        expect(balanceP2).to.equal(0)
        expect(balanceP3).to.equal(0)
    })

    it("Makes a move with 0 deposit", async function() {
        const moveP1 = await utils.move(accounts[1], 'Rock', 0, accounts[2])
        const latestBlock = await ethers.provider.getBlock("latest")

        expect(moveP1.blindedMove).to.equal(ethers.utils.solidityKeccak256(["uint8", "bytes32"], [1, secretSalt]))
        expect(moveP1.wager).to.equal(0)
        expect(moveP1.timeStamp).to.equal(latestBlock.timestamp)
        expect(moveP1.counterPlayer).to.equal(accounts[2].address)
        expect(moveP1.notRevealed).to.be.true
        expect(moveP1.choice).to.equal(0)
    })


    it("Reverts when trying to wihdrawal during the game", async function() {
        await expect(gameContract.connect(accounts[1]).withdraw()).to.be.revertedWith("NotPossibleDuringGame")
    })

    it("Should fail to abort the move before 5 minutes period", async function() {
        await expect(utils.terminateGame(accounts[1])).to.be.revertedWith("TooEarly")
    } )

    it("Reverts when trying to reveal when the challenge is not accepted", async function() {
        await expect(utils.reveal(accounts[1], 'Rock')).to.be.revertedWith("ChallengeNotTaken")
    })

    it("Reverts when player tries to play with self", async function() {
        await expect(utils.move(accounts[1], 'Paper', 0, accounts[1])).to.be.revertedWith("TwoPlayersAreNeeded")
    })

    it("Reverts when player tries to play with address zero", async function() {
        const choiceNo = 1
        const blindedMove = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [choiceNo, secretSalt])
        await expect(gameContract.connect(accounts[1]).move(blindedMove, 0, ethers.constants.AddressZero)).to.be.revertedWith("TwoPlayersAreNeeded")
    })

    it("Reverts when player tries to change the move before result", async function() {
        await expect(utils.move(accounts[1], 'Paper', 0, accounts[2])).to.be.revertedWith("NotPossibleDuringGame")
    })

    it("Aborts the move if the other player does not play at all in 5 minutes", async function() {
       /// Increase the timestamp of next block
       await utils.increaseTimestamp()
       const moveP1 = await utils.terminateGame(accounts[1])
       
       expect(moveP1.wager).to.equal(0)
       expect(moveP1.counterPlayer).to.equal(ethers.constants.AddressZero)
       expect(moveP1.notRevealed).to.be.false
    })

    it("Reverts if the proposed wager is more than player's deposit", async function() {
        await expect(utils.move(accounts[1], 'Rock', ethers.utils.parseUnits("0.5", "ether"), accounts[2])).to.be.revertedWith("InsufficientDeposit")
    })

    it("Aborts the move and get back the wager if the other player does not play at all in 5 minutes.", async function() {
        const amount = ethers.utils.parseUnits("2.0", "ether")
        await utils.deposit(accounts[3], amount)

        await utils.move(accounts[3], 'Rock', ethers.utils.parseUnits("0.5", "ether"), accounts[2])

        /// Increase the timestamp of next block
        await utils.increaseTimestamp()

        const moveP3 = await utils.terminateGame(accounts[3])

        const balanceOfPlayer = await gameContract.balance(accounts[3].address)

        expect(moveP3.wager).to.equal(0)
        expect(moveP3.counterPlayer).to.equal(ethers.constants.AddressZero)
        expect(moveP3.notRevealed).to.be.false
        expect(balanceOfPlayer).to.equal(amount)
    })

    it("Reverts if it is nothing to reveal", async function() {
        await expect(utils.reveal(accounts[1], 'Rock')).to.be.revertedWith("NothingToReveal")
    })

    it("Reveals when the challenge is accepted", async function() {
        /// Game where rock plays with paper
        utils.deposit(accounts[1], ethers.utils.parseUnits("0.5", "ether"))
        utils.deposit(accounts[2], ethers.utils.parseUnits("1.0", "ether"))

        await utils.move(accounts[1], 'Rock', ethers.utils.parseUnits("0.1", "ether"), accounts[2])
        await utils.move(accounts[2], 'Paper', ethers.utils.parseUnits("0.1", "ether"), accounts[1])

        const moveP1 = await utils.reveal(accounts[1], 'Rock')
        const moveP2 = await utils.reveal(accounts[2], 'Paper')

        expect(moveP1.choice).to.equal(1)
        expect(moveP2.choice).to.equal(2)
    })

    it("Rock loses with paper", async function() {
        const balanceBeforeP1 = await gameContract.balance(accounts[1].address)
        const balanceBeforeP2 = await gameContract.balance(accounts[2].address)

        const wager = ethers.utils.parseUnits("0.1", "ether")

        const winner = await utils.result(accounts[1])

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

    it("Reverts when player tries to play same move two times", async function() {
        await expect(utils.result(accounts[1])).to.be.revertedWith("TwoPlayersAreNeeded")
    })

    it("Rock wins with scissors", async function() {
        const balanceBeforeP1 = await gameContract.balance(accounts[1].address)
        const balanceBeforeP2 = await gameContract.balance(accounts[2].address)
        /// Move phase
        await utils.move(accounts[1], 'Rock', ethers.utils.parseUnits("0.2", "ether"), accounts[2])
        await utils.move(accounts[2], 'Scissors', ethers.utils.parseUnits("0.1", "ether"), accounts[1])
        
        /// Reveal phase
        await utils.reveal(accounts[1], 'Rock')
        await utils.reveal(accounts[2], 'Scissors')
        /// Result phase
        const wager = ethers.utils.parseUnits("0.1", "ether")

        const winner = await utils.result(accounts[1])
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
        await utils.move(accounts[1], 'Paper', ethers.utils.parseUnits("0.1", "ether"), accounts[2])
        await utils.move(accounts[2], 'Scissors', ethers.utils.parseUnits("0.2", "ether"), accounts[1])
        /// Reveal phase
        await utils.reveal(accounts[1], 'Rock')
        await utils.reveal(accounts[2], 'Scissors')
        /// Result phase
        const wager = ethers.utils.parseUnits("0.1", "ether")
        const winner = await utils.result(accounts[1])
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
        await utils.move(accounts[1], 'Paper', 0, accounts[2])
        await utils.move(accounts[2], 'Rock', 0, accounts[1])
        
        /// Reveal phase
        await utils.reveal(accounts[1], 'Paper')
        await utils.reveal(accounts[2], 'Rock')
        /// Result phase
        const winner = await utils.result(accounts[1])
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
        await utils.move(accounts[1], 'Paper', ethers.utils.parseUnits("0.1", "ether"), accounts[2])
        await utils.move(accounts[2], 'Paper', ethers.utils.parseUnits("0.2", "ether"), accounts[1])
        await utils.move(accounts[3], 'Rock', 0, accounts[4])
        await utils.move(accounts[4], 'Rock', 0, accounts[3])
        /// Reveal phase
        await utils.reveal(accounts[1], 'Paper')
        await utils.reveal(accounts[2], 'Paper')
        await utils.reveal(accounts[3], 'Rock')
        await utils.reveal(accounts[4], 'Rock')
        /// Result phase
        const wager = ethers.utils.parseUnits("0.1", "ether")
        const winner = await utils.result(accounts[2])
        const winner2 = await utils.result(accounts[3])
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
        expect(winner2).to.equal(ethers.constants.AddressZero)
    })

    it("Player with none choice loses with every item", async function() {
        /// Move phase
        await utils.move(accounts[1], 'Rock', 0, accounts[2])
        await utils.move(accounts[2], 'None', 0, accounts[1])
        await utils.move(accounts[3], 'Paper', 0, accounts[4])
        await utils.move(accounts[4], 'None', 0, accounts[3])
        await utils.move(accounts[5], 'Scissors', 0, accounts[6])
        await utils.move(accounts[6], 'None', 0, accounts[5])

        /// Reveal phase
        await utils.reveal(accounts[1], 'Rock')
        await utils.reveal(accounts[2], 'None')
        await utils.reveal(accounts[3], 'Paper')
        await utils.reveal(accounts[4], 'None')
        await utils.reveal(accounts[5], 'Scissors')
        await utils.reveal(accounts[6], 'None')

        /// Result phase
        const winner1 = await utils.result(accounts[2])
        const winner2 = await utils.result(accounts[3])
        const winner3 = await utils.result(accounts[6])

        expect(winner1).to.equal(accounts[1].address)
        expect(winner2).to.equal(accounts[3].address)
        expect(winner3).to.equal(accounts[5].address)
    })

    it("Is a draw if both players pick None", async function() {
        /// Move phase
        await utils.move(accounts[1], 'None', 0, accounts[2])
        await utils.move(accounts[2], 'None', 0, accounts[1])
        /// Reveal phase
        await utils.reveal(accounts[1], 'None')
        await utils.reveal(accounts[2], 'None')
        /// Result phase
        const winner = await utils.result(accounts[2])

        expect(winner).to.equal(ethers.constants.AddressZero)
    })

    it("Terminate the game if the other player does not want to reveal", async function() {
        const balanceBeforeP1 = await gameContract.balance(accounts[1].address)
        const balanceBeforeP2 = await gameContract.balance(accounts[2].address)
        /// Move phase
        await utils.move(accounts[1], 'Paper', ethers.utils.parseUnits("0.1", "ether"), accounts[2])
        await utils.move(accounts[2], 'Scissors', ethers.utils.parseUnits("0.2", "ether"), accounts[1])
        /// Reveal phase
        await utils.reveal(accounts[1], 'Paper')
        /// Increase the timestamp of next block
        await utils.increaseTimestamp()
        /// Result phase  
        await utils.terminateGame(accounts[1])
        const winner = await utils.result(accounts[1])
        
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
        await utils.move(accounts[1], 'Paper', ethers.utils.parseUnits("0.1", "ether"), accounts[2])
        await utils.move(accounts[2], 'Scissors', ethers.utils.parseUnits("0.1", "ether"), accounts[1])
        /// Reveal phase
        await utils.reveal(accounts[2], 'Scissors')
        /// Increase the timestamp of next block
        await utils.increaseTimestamp()
        /// Result phase
        await expect(utils.terminateGame(accounts[1])).to.be.revertedWith("RevealMoveFirst")
        await expect(utils.result(accounts[1])).to.be.revertedWith("RevealMoveFirst")
        await expect(utils.result(accounts[2])).to.be.revertedWith("RevealMoveFirst")
        
        await utils.terminateGame(accounts[2])
        const winner = await utils.result(accounts[2])
        expect(winner).to.equal(accounts[2].address)
    })

    it("Player cannot double wager trying to terminate the game", async function() {
        /// Move phase
        await utils.move(accounts[1], 'Paper', ethers.utils.parseUnits("0.1", "ether"), accounts[2])
        await utils.move(accounts[2], 'Scissors', ethers.utils.parseUnits("0.2", "ether"), accounts[1])
        /// Reveal phase
        await utils.reveal(accounts[1], 'Scissors')
        /// Increase the timestamp of next block
        await utils.increaseTimestamp()
        /// Result phase
        await expect(utils.terminateGame(accounts[2])).to.be.revertedWith("RevealMoveFirst")
        
        await utils.reveal(accounts[2], 'Paper')
        await expect(utils.terminateGame(accounts[2])).to.be.revertedWith("ResultFunctionShouldBeCalled")
    })    
})
