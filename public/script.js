const socket = io("http://localhost:3000");  // Connect to the backend server

document.getElementById("createRoomBtn").addEventListener("click", async () => {
    const response = await fetch("http://localhost:3000/create-room", { method: "POST" });
    const data = await response.json();
    
    const roomLink = document.getElementById("roomLink");
    roomLink.innerHTML = `Invite Link: <a href="?room=${data.roomId}">${data.inviteLink}</a>`;
    roomLink.style.display = "block";
});

document.getElementById("joinRoomBtn").addEventListener("click", () => {
    const roomId = document.getElementById("roomIdInput").value;
    const playerName = document.getElementById("playerNameInput").value;

    if (!roomId || !playerName) {
        alert("Please enter both Room ID and Name.");
        return;
    }

    joinRoom(roomId, playerName);
});

function joinRoom(roomId, playerName) {
    socket.emit("join-room", { roomId, playerName });

    document.getElementById("roomIdDisplay").innerText = roomId;
    document.getElementById("game-area").style.display = "block";
}

socket.on("player-joined", (players) => {
    const playersList = document.getElementById("playersList");
    playersList.innerHTML = "";

    const currentPlayer = players.find(p => p.id === socket.id);
    const isHost = currentPlayer ? currentPlayer.isHost : false;

    document.getElementById("startGameBtn").style.display = isHost ? "block" : "none";

    players.forEach(player => {
        const li = document.createElement("li");
        li.textContent = player.name + (player.isHost ? " (Host)" : "");
        playersList.appendChild(li);
    });
});

document.getElementById("startGameBtn").addEventListener("click", () => {
    const roomId = document.getElementById("roomIdDisplay").innerText;
    socket.emit("start-game", roomId);
});

socket.on("game-started", () => {
    alert("The game has started!");
});

// Auto-join room if invite link is used
window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get("room");
    if (roomId) {
        document.getElementById("roomIdInput").value = roomId;
    }
};

//Game Setup
//-------------------------------------------------------------------------------

//GRID
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Grid settings
const gridSize = 10;  // Number of tiles per row/column
const tileSize = 50;  // Size of each tile in pixels

canvas.width = gridSize * tileSize;
canvas.height = gridSize * tileSize;

// Sample maze layout (0 = empty, 1 = wall)
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

// Function to draw the grid
function drawGrid() {
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            if (maze[row][col] === 1) {
                ctx.fillStyle = "black";  // Wall color
            } else {
                ctx.fillStyle = "white";  // Empty space
            }
            ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
            ctx.strokeRect(col * tileSize, row * tileSize, tileSize, tileSize);
        }
    }
}

// Initial draw
drawGrid();

//PLAYERS
const players = {
    "player1": { row: 1, col: 1, color: "red" },
    "player2": { row: 8, col: 8, color: "blue" }
};

// Function to draw players on the grid
function drawPlayers() {
    for (const playerId in players) {
        const player = players[playerId];
        ctx.fillStyle = player.color;
        ctx.fillRect(player.col * tileSize, player.row * tileSize, tileSize, tileSize);
    }
}

// Update the draw function to include players
function drawGame() {
    drawGrid();
    drawPlayers();
}

// Initial draw
drawGame();

//MOVEMENT LOGIC
document.addEventListener("keydown", (event) => {
    movePlayer("player1", event.key);
});

function movePlayer(playerId, key) {
    const player = players[playerId];
    if (!player) return;

    let newRow = player.row;
    let newCol = player.col;

    // Handle movement keys
    switch (key) {
        case "ArrowUp":
        case "w":
            newRow -= 1;
            break;
        case "ArrowDown":
        case "s":
            newRow += 1;
            break;
        case "ArrowLeft":
        case "a":
            newCol -= 1;
            break;
        case "ArrowRight":
        case "d":
            newCol += 1;
            break;
        default:
            return; // Ignore other keys
    }

    // Check if the new position is within bounds and not a wall
    if (maze[newRow] && maze[newRow][newCol] === 0) {
        player.row = newRow;
        player.col = newCol;
        drawGame(); // Redraw grid with new player position
    }
}
