const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {}; // Store info about rooms, rounds, moves, etc.

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Create or join a room
    socket.on('createRoom', ({ roomId, rounds }) => {
        socket.join(roomId);
        console.log(`${socket.id} created room: ${roomId} with ${rounds} rounds`);

        rooms[roomId] = {
            players: [socket.id],
            rounds: rounds,
            moves: {},  // To track moves for each round
            scores: { [socket.id]: 0 },
            roundCount: 0
        };

        socket.emit('roomCreated', { roomId });
    });

    socket.on('joinRoom', (roomId) => {
        if (!rooms[roomId]) {
            socket.emit('error', 'Room does not exist');
            return;
        }

        const room = rooms[roomId];
        if (room.players.length >= 2) {
            socket.emit('error', 'Room is full');
            return;
        }

        socket.join(roomId);
        room.players.push(socket.id);
        room.scores[socket.id] = 0;

        io.to(roomId).emit('startGame', { message: 'Game started!', rounds: room.rounds });
    });

    // Handle move
    socket.on('move', ({ roomId, move }) => {
        const room = rooms[roomId];
        if (!room) return;

        // Track moves for current round
        room.moves[socket.id] = move;
        console.log(`${socket.id} made a move: ${move}`);

        // Check if both players have made a move
        if (Object.keys(room.moves).length === 2) {
            const [player1, player2] = room.players;
            const result = determineRoundWinner(room.moves[player1], room.moves[player2]);

            if (result === 'draw') {
                io.to(roomId).emit('roundResult', 'Draw! Both players chose the same move.');
            } else {
                const winner = result === 'player1' ? player1 : player2;
                room.scores[winner]++;
                io.to(roomId).emit('roundResult', `Player ${winner} wins this round!`);
            }

            room.roundCount++;
            room.moves = {}; // Reset moves for next round

            // Check if the game has finished
            if (room.roundCount >= room.rounds) {
                const overallWinner = determineOverallWinner(room.scores, room.players);
                io.to(roomId).emit('gameOver', { winner: overallWinner });
                delete rooms[roomId]; // Clean up the room after game is over
            } else {
                io.to(roomId).emit('nextRound', { round: room.roundCount + 1 });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        // Handle cleanup of rooms if a player disconnects
    });
});

// Determine the winner for a single round
function determineRoundWinner(move1, move2) {
    if (move1 === move2) return 'draw';
    if ((move1 === 'rock' && move2 === 'scissors') ||
        (move1 === 'scissors' && move2 === 'paper') ||
        (move1 === 'paper' && move2 === 'rock')) {
        return 'player1';
    }
    return 'player2';
}

// Determine the overall winner after all rounds
function determineOverallWinner(scores, players) {
    const [player1, player2] = players;
    if (scores[player1] > scores[player2]) {
        return player1;
    } else if (scores[player2] > scores[player1]) {
        return player2;
    } else {
        return 'draw';
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
