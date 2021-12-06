const chai = require('chai');
const BN = require('bn.js');
const { ethers } = require('hardhat');
const { expect } = require('chai');

// Enable and inject BN dependency
chai.use(require('chai-bn')(BN));

describe("Rock Paper Scissors Multiplayer Game Unit Test for two players",function () {
    before(async function() {
        GameContract = await ethers.getContractFactory("Game")
        gameContract = await GameContract.deploy()
        await gameContract.deployed()
        accounts = await ethers.getSigners()
        firstPlayerSecretSalt = ethers.utils.formatBytes32String("firstPlayerSecretSalt")
        secondPlayerSecretSalt = ethers.utils.formatBytes32String("secondPlayerSecretSalt")
    })

    it("Is possible to make a move", async function() {
        const blindedMove = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [1, firstPlayerSecretSalt])
        const playerMove = await gameContract.connect(accounts[0]).move(blindedMove, accounts[1].address)
        await playerMove.wait()
        const moveOfPlayer = await gameContract.moves(accounts[0].address)
        expect(moveOfPlayer.blindedMove).to.equal(blindedMove)
    })

    it("Is possible to make a counter move by the second player", async function() {  
        const blindedMove = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [2, secondPlayerSecretSalt])
        const playerMove = await gameContract.connect(accounts[1]).move(blindedMove, accounts[0].address)
        await playerMove.wait()
        const moveOfPlayer2 = await gameContract.moves(accounts[1].address)
        expect(moveOfPlayer2.blindedMove).to.equal(blindedMove)
    })

    it("Reveals the move of first player", async function() {
        const revealMove = await gameContract.connect(accounts[0]).reveal(1, firstPlayerSecretSalt)
        await revealMove.wait()
        const moveOfPlayer = await gameContract.moves(accounts[0].address)
        expect(moveOfPlayer.choice).to.equal(1)
    })

    it("Reveals the move of the second player", async function() {
        const revealMove = await gameContract.connect(accounts[1]).reveal(2, secondPlayerSecretSalt)
        await revealMove.wait()
        const moveOfPlayer = await gameContract.moves(accounts[1].address)
        expect(moveOfPlayer.choice).to.equal(2)
    })

    it("The rock loses with the paper", async function() {
        const result = await gameContract.connect(accounts[0]).result()
        const rc = await result.wait()
        const event = rc.events.find(event => event.event === "GameEnded")
        const [winner] = event.args
        expect(winner).to.equal(accounts[1].address)
    })

    it("The paper wins with the rock", async function() {
        const result = await gameContract.connect(accounts[1]).result()
        const rc = await result.wait()
        const event = rc.events.find(event => event.event === "GameEnded")
        const [winner] = event.args
        expect(winner).to.equal(accounts[1].address)
    })

    it("The rock wins with the scissors", async function() {
        const blindedMoveP1 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [1, firstPlayerSecretSalt])
        const blindedMoveP2 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [3, firstPlayerSecretSalt])
        const moveP1 = await gameContract.connect(accounts[0]).move(blindedMoveP1, accounts[1].address)
        await moveP1.wait()
        const moveP2 = await gameContract.connect(accounts[1]).move(blindedMoveP2, accounts[0].address)
        await moveP2.wait()

        const revealP1 = await gameContract.connect(accounts[0]).reveal(1, firstPlayerSecretSalt)
        await revealP1.wait()
        const revealP2 = await gameContract.connect(accounts[1]).reveal(3, firstPlayerSecretSalt)
        await revealP2.wait()

        const movesOfP1 = await gameContract.moves(accounts[0].address)
        const movesOfP2 = await gameContract.moves(accounts[1].address)

        const result = await gameContract.connect(accounts[0]).result()
        const rc = await result.wait()
        const event = rc.events.find(event => event.event === "GameEnded")
        const [winner] = event.args

        expect(movesOfP1.choice).to.equal(1)
        expect(movesOfP2.choice).to.equal(3)
        expect(winner).to.equal(accounts[0].address)


    })
    
})

describe("Rock Paper Scissors Multiplayer Game for a few games in the same time.", async function() {
    before(async function() {
        GameContract = await ethers.getContractFactory("Game")
        gameContract = await GameContract.deploy()
        await gameContract.deployed()
        accounts = await ethers.getSigners()
    })
    
    it("Is possible to play for several players independently, the rock loses with the scissors and the scissors wins wuth the paper.", async () => {
        const secretSaltP3 = ethers.utils.formatBytes32String("EleMeleDudki2021!?")
        const secretSaltP4 = ethers.utils.formatBytes32String("Źdzbło")
        const secretSaltP5 = ethers.utils.formatBytes32String("12345678")
        const secretSaltP6 = ethers.utils.formatBytes32String("123BabaJagaPatrzy!!??")
        
        const blindedMoveP3 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [3, secretSaltP3])
        const blindedMoveP4 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [1, secretSaltP4])
        const blindedMoveP5 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [2, secretSaltP5])
        const blindedMoveP6 = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [3, secretSaltP6])
        
        await gameContract.connect(accounts[2]).move(blindedMoveP3, accounts[3].address)
        await gameContract.connect(accounts[3]).move(blindedMoveP4, accounts[2].address)
        await gameContract.connect(accounts[4]).move(blindedMoveP5, accounts[5].address)
        await gameContract.connect(accounts[5]).move(blindedMoveP6, accounts[4].address)

        const moveP3 = await gameContract.moves(accounts[2].address)
        const moveP4 = await gameContract.moves(accounts[3].address)
        const moveP5 = await gameContract.moves(accounts[4].address)
        const moveP6 = await gameContract.moves(accounts[5].address)

        await gameContract.connect(accounts[2]).reveal(3, secretSaltP3)
        await gameContract.connect(accounts[3]).reveal(1, secretSaltP4)
        await gameContract.connect(accounts[4]).reveal(2, secretSaltP5)
        await gameContract.connect(accounts[5]).reveal(3, secretSaltP6)

        const resultGame2 = await gameContract.connect(accounts[2]).result()
        const rc2 = await resultGame2.wait()
        const event2 = rc2.events.find(event => event.event === "GameEnded")
        const [winner2] = event2.args

        const resultGame3 = await gameContract.connect(accounts[5]).result()
        const rc3 = await resultGame3.wait()
        const event3 = rc3.events.find(event => event.event === "GameEnded")
        const [winner3] = event3.args
        
        expect(winner2).to.equal(accounts[3].address)
        expect(winner3).to.equal(accounts[5].address)
    })
})

