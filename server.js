const path = require('path');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    }
});

app.use(cors());
app.use(express.json());

const rooms = {}; // Store active game rooms

// Endpoint to create a game room
app.post('/create-room', (req, res) => {
    const roomId = uuidv4(); // Generate a unique room ID
    rooms[roomId] = { players: [], host: null }; // Track the host
    res.json({ roomId, inviteLink: `http://localhost:3000/?room=${roomId}` });
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join-room', ({ roomId, playerName }) => {
        if (!rooms[roomId]) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }
    
        const isHost = rooms[roomId].players.length === 0; // First player is host
        if (isHost) rooms[roomId].host = socket.id;
    
        rooms[roomId].players.push({ id: socket.id, name: playerName, isHost });
        socket.join(roomId);
        io.to(roomId).emit('player-joined', rooms[roomId].players);
    });
    

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
            io.to(roomId).emit('player-joined', rooms[roomId].players);
        }
        console.log('User disconnected:', socket.id);
    });

    socket.on('start-game', (roomId) => {
        if (rooms[roomId] && rooms[roomId].host === socket.id) {
            io.to(roomId).emit('game-started');
        }
    });    
});

app.use(express.static(path.join(__dirname, 'public')));

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
