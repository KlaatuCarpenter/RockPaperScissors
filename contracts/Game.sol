// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "hardhat/console.sol";

/// @title Rock Paper Scissors Game
/// @author Damian Piorun aka KlaatuCarpenter
contract Game {
   
    enum Choice {
        None,
        Rock,
        Paper,
        Scissors
    }
    struct Move {
        bytes32 blindedMove;
        uint256 deposit;
        address counterPlayer;
        bool notRevealed;
        Choice choice;
    }
    mapping(address => Move) public moves;

    /// Events
    event MoveMade(address moveMaker);
    event GameEnded(address winner);

    /// Errors
    /// Game is already ended
    error GameAlreadyEnded();

    /// Place a blinded move with `blindedMove` = 
    /// keccak256(abi.encodePacked(address, move, salt)).
    /// The game can only be won, when the move is correctly
    /// reveled in the revealing phase.
    function move(bytes32 _blindedMove, address _counterPlayer) external payable { 
        /// Prevent user to move several times, without revealing.
        require(!moves[msg.sender].notRevealed, "Your last move is not revealed. Reveal it first.");      
        Move storage m = moves[msg.sender];       
        m.blindedMove = _blindedMove;
        m.deposit = msg.value;
        m.counterPlayer = _counterPlayer;
        m.notRevealed = true;
        m.choice = Choice.None;
    }

    /// Reveal users blinded move
    function reveal(Choice _choice, bytes32 _salt) external {
        moves[msg.sender].notRevealed = false; 
        if (moves[msg.sender].blindedMove == keccak256(abi.encodePacked(_choice, _salt))) {
            Move storage m = moves[msg.sender];
            m.choice = _choice;
        }
    }

    /// Check the result of the game
    function result() external returns(address) {
        address _playerA = msg.sender;
        address _playerB = moves[_playerA].counterPlayer;
        
        require(!moves[_playerA].notRevealed, "The choice of player A is not revealed");
        require(!moves[_playerB].notRevealed, "The choice of player B is not revealed");
    
        if (moves[_playerA].choice == moves[_playerB].choice) {
            payable(_playerA).transfer(moves[_playerA].deposit);
            payable(_playerB).transfer(moves[_playerB].deposit);
            emit GameEnded(0x0000000000000000000000000000000000000000);
            return 0x0000000000000000000000000000000000000000;
        } else if (
            (moves[_playerA].choice == Choice.Rock      && moves[_playerB].choice == Choice.Scissors) || 
            (moves[_playerA].choice == Choice.Paper     && moves[_playerB].choice == Choice.Rock) || 
            (moves[_playerA].choice == Choice.Scissors  && moves[_playerB].choice == Choice.Paper) ||
            (moves[_playerA].choice != Choice.None      && moves[_playerB].choice == Choice.None)
        ) {
            payable(_playerA).transfer((moves[_playerA].deposit + moves[_playerB].deposit));
            emit GameEnded(_playerA);
            return _playerA;
        } else {
            payable(_playerB).transfer((moves[_playerA].deposit + moves[_playerB].deposit));
            emit GameEnded(_playerB);
            return _playerB;
        }
    }
}