module.exports = (notificationModel, io, onlineUsers) => ({
	notifyFriendRequestSent: async (senderUser, receiverUserId) => {
		const { id: senderId, username } = senderUser;

		const targetSockets = onlineUsers.get(receiverUserId); // After successful friend request, check if receiver is online
		if (targetSockets) {
			targetSockets.forEach((socketId) => {
				io.to(socketId).emit("friendRequestInform", {
					fromUserId: senderId,
					message: `${username} sent you a friend request!`,
				});
			});
		}
		await notificationModel.createNotification(
			senderId,
			receiverUserId,
			null,
			"friendRequest",
			`${username} sent you a friend request!`,
			false
		);
	},

	notifyFriendRequestAccepted: async (senderUser, receiverUser) => {
		const { id: accepterId, username: accepterUsername } = receiverUser; // receiver of the friend request
		const { id: requesterId, username: requesterUsername } = senderUser; // sender of the friend request

		const targetSockets = onlineUsers.get(requesterId);
		if (targetSockets) {
			targetSockets.forEach((socketId) => {
				io.to(socketId).emit("friendRequestAccept", {
					fromUserId: accepterId,
					message: `${accepterUsername} has accepted your friend request!`,
				});
			});
		}

		// Send them a notification stating that they accepted your friend request
		await notificationModel.createNotification(
			accepterId,
			requesterId,
			null,
			"friendRequest",
			`${accepterUsername} has accepted your friend request!`,
			false
		);

		// Delete the notification stating that they sent you a friend request
		await notificationModel.deleteNotification(
			requesterId,
			accepterId,
			"friendRequest"
		);

		await notificationModel.createNotification(
			requesterId,
			accepterId,
			null,
			"friendRequest",
			`You are now friends with ${requesterUsername}`,
			false
		);
	},

	cleanUpRejectedRequest: async (senderUserId, receiverUserId) => {
		await notificationModel.deleteNotification(
			senderUserId,
			receiverUserId,
			"friendRequest"
		);
	},

	cleanupBilateralRequestNotifications: async (userId1, userId2) => {
		await notificationModel.deleteAllBilateralNotifications(
			userId1,
			userId2,
			"friendRequest"
		);
	},
});
