function setupChatSocket(userId, socket) {
	// Join a room
	socket.on("joinRoom", (chatId) => {
		socket.join(chatId.toString());
		console.log(`User ${userId} joined room ${chatId.toString()}`);
	});

	// Leave a room
	socket.on("leaveRoom", (chatId) => {
		socket.leave(chatId.toString());
		console.log(`User ${userId} left room ${chatId}`);
	});
}

module.exports = { setupChatSocket };
