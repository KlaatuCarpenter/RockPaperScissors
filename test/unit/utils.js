

async function deposit(account, amount) {
    const depositTx = await gameContract.connect(account).deposit({ value: amount })
    await depositTx.wait()
}
async function move(account, choice, wager, opponent) {
        const switchChoice = function() {
            switch(choice) {
                case 'Rock': return 1
                case 'Paper': return 2
                case 'Scissors': return 3
            }
            return 0
        }
        const choiceNo = switchChoice()
        const blindedMove = ethers.utils.solidityKeccak256(["uint8", "bytes32"], [choiceNo, secretSalt])
        const playerMove = await gameContract.connect(account).move(blindedMove, wager, opponent.address)
        await playerMove.wait()
        const moveOfPlayer = await gameContract.moves(accounts[1].address)
        return moveOfPlayer
        
    }
async function reveal(account, choice) {
        const switchChoice = function() {
            switch(choice) {
                case 'Rock': return 1
                case 'Paper': return 2
                case 'Scissors': return 3
            }
            return 0
        }
        const choiceNo = switchChoice()
        await gameContract.connect(account).reveal(choiceNo, secretSalt)
        const moveOfPlayer = await gameContract.moves(account.address)
        return moveOfPlayer
    }

async function increaseTimestamp() {
    const moreThanFiveMinutes = 5 * 60 + 1
    await network.provider.send("evm_increaseTime", [moreThanFiveMinutes])
    await network.provider.send("evm_mine")
}

async function terminateGame(account) {
    const abortMove = await gameContract.connect(account).terminateGame()
    abortMove.wait()
    const moveOfPlayer = await gameContract.moves(account.address)
    return moveOfPlayer
}

async function result(account) {
    const result = await gameContract.connect(account).result()
    const txReceipt = await result.wait()
    const event = txReceipt.events.find(event => event.event === "GameEnded")
    const winner = event.args[0]
    return winner
}

module.exports = { deposit, move, reveal, increaseTimestamp, terminateGame, result }
