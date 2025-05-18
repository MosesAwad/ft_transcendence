
function setupChatSocket(userId, socket) {
	// Join a room
	socket.on("joinRoom", (chatId) => {
		socket.join(chatId.toString());
		console.log(`User ${userId} joined room ${chatId.toString()}`);
	});
}

module.exports = { setupChatSocket };
