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
