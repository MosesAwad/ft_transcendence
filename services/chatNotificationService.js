module.exports = (notificationModel, io, onlineUsers) => ({
	notifyMessageReceived: async (senderUser, receiverUserId, chatId) => {
		const { id: senderId, username } = senderUser;

		const targetSockets = onlineUsers.get(receiverUserId); // After successful friend request, check if receiver is online

		if (targetSockets) {
			// Using a for-of loop here because I need to return/break, you can't break out of a forEach
			for (const socketId of targetSockets) {
				const socket = io.sockets.sockets.get(socketId);
				if (socket && socket.rooms.has(chatId.toString())) {
					// They're already in the chat room and saw your message in realtime — don't create or send notification
					return ;
				}
			}

            // Emit socket notification if online but not in the chat
            targetSockets.forEach((socketId) => {
                io.to(socketId).emit("messageReceivedInform", {
                    fromUserId: senderId,
                    message: `${username} sent you a message!`,
                });
            });
		}

		await notificationModel.createNotification(
			senderId,
			receiverUserId,
            chatId,
			"message",
			`${username} sent you a message!`,
			false
		);
	},
});
