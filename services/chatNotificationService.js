module.exports = (notificationModel, io, onlineUsers) => ({
	notifyMessageReceived: async (senderUser, receiverUserId, chatId) => {
		const { id: senderId, username } = senderUser;

		const targetSockets = onlineUsers.get(receiverUserId); // After successful friend request, check if receiver is online
		let shouldNotify = true;

		if (targetSockets) {
			// Using a for-of loop here because I need to break, you can't break out of a forEach
			for (const socketId of targetSockets) {
				const socket = io.sockets.sockets.get(socketId);
				if (socket && socket.rooms.has(chatId.toString())) {
					// They're already in the chat room — don't send notification
					shouldNotify = false;
					break;
				}
			}

			if (shouldNotify) {
				// Emit socket notification if not in the chat
				targetSockets.forEach((socketId) => {
					io.to(socketId).emit("messageReceivedInform", {
						fromUserId: senderId,
						message: `${username} sent you a message!`,
					});
				});
			}
		}

		await notificationModel.createNotification(
			senderId,
			receiverUserId,
			"message",
			`${username} sent you a message!`,
			false
		);
	},
});
