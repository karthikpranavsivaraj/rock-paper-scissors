const socket = io();

// Join a random room
const room = Math.random().toString(36).substring(2, 8);  // Generate a random room code
socket.emit('joinRoom', room);

document.getElementById('rock').onclick = () => makeMove('rock');
document.getElementById('paper').onclick = () => makeMove('paper');
document.getElementById('scissors').onclick = () => makeMove('scissors');

function makeMove(choice) {
    document.getElementById('status').textContent = "You made your move: " + choice;
    socket.emit('playerMove', { room, choice });
}

// Receive game start notification
socket.on('startGame', () => {
    document.getElementById('status').textContent = "Game started! Make your move.";
});

// Receive the game result
socket.on('gameResult', ({ result, yourChoice, opponentChoice }) => {
    document.getElementById('result').innerHTML = `
        <p>You chose: ${yourChoice}</p>
        <p>Your opponent chose: ${opponentChoice}</p>
        <h2>${result}</h2>
    `;
});

// Handle disconnection
socket.on('disconnect', () => {
    document.getElementById('status').textContent = "Disconnected from the server.";
});
