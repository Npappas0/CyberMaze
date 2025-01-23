const path = require('path');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

const rooms = {}; // Store active game rooms

// Sample maze layout (0 = open space, 1 = wall)
const maze = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 0, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// Endpoint to create a game room
app.post('/create-room', (req, res) => {
    const roomId = uuidv4();
    rooms[roomId] = { players: {}, host: null };
    res.json({ roomId, inviteLink: `http://localhost:3000/?room=${roomId}` });
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', ({ roomId, playerName }) => {
        if (!rooms[roomId]) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        const isHost = Object.keys(rooms[roomId].players).length === 0;
        if (isHost) rooms[roomId].host = socket.id;

        // Assign player a random open tile
        let startPosition = findOpenTile();
        rooms[roomId].players[socket.id] = {
            id: socket.id,
            name: playerName,
            row: startPosition.row,
            col: startPosition.col,
            color: getRandomColor(),
            isHost
        };

        socket.join(roomId);
        io.to(roomId).emit('player-joined', Object.values(rooms[roomId].players));
    });

    // Handle player movement
    socket.on('move', ({ roomId, direction }) => {
        if (!rooms[roomId] || !rooms[roomId].players[socket.id]) return;

        let player = rooms[roomId].players[socket.id];
        let newRow = player.row;
        let newCol = player.col;

        // Determine movement direction
        if (direction === "up") newRow -= 1;
        if (direction === "down") newRow += 1;
        if (direction === "left") newCol -= 1;
        if (direction === "right") newCol += 1;

        // Ensure movement is within bounds and not into a wall
        if (maze[newRow] && maze[newRow][newCol] === 0) {
            player.row = newRow;
            player.col = newCol;
            io.to(roomId).emit('updatePlayers', Object.values(rooms[roomId].players));
        }
    });

    // Handle player disconnect
    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            if (rooms[roomId].players[socket.id]) {
                delete rooms[roomId].players[socket.id];
                io.to(roomId).emit('updatePlayers', Object.values(rooms[roomId].players));
            }
        }
        console.log('User disconnected:', socket.id);
    });

    // Start game event (host only)
    socket.on('start-game', (roomId) => {
        if (rooms[roomId] && rooms[roomId].host === socket.id) {
            io.to(roomId).emit('game-started');
        }
    });
});

// Utility function to find a random open tile for spawning players
function findOpenTile() {
    let openTiles = [];
    for (let row = 0; row < maze.length; row++) {
        for (let col = 0; col < maze[row].length; col++) {
            if (maze[row][col] === 0) openTiles.push({ row, col });
        }
    }
    return openTiles[Math.floor(Math.random() * openTiles.length)];
}

// Generate a random color for each player
function getRandomColor() {
    return "#" + Math.floor(Math.random() * 16777215).toString(16);
}

app.use(express.static(path.join(__dirname, 'public')));

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
