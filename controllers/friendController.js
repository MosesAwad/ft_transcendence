const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");

module.exports = (friendModel, notificationModel, io, onlineUsers) => ({
	// Send a friend request
	createFriendship: async (request, reply) => {
		const { friendId } = request.body;
		const {
			user: { id: userId, username },
		} = request.user;
		if (request.user.user.id === friendId) {
			throw new CustomError.BadRequestError(
				"Cannot send friend request to yourself"
			);
		}
		await friendModel.sendRequest(userId, friendId);

		// Notification handling
		const targetSockets = onlineUsers.get(friendId); // After successful friend request, check if receiver is online
		if (targetSockets) {
			targetSockets.forEach((socketId) => {
				io.to(socketId).emit("friendRequestInform", {
					fromUserId: userId,
					message: `${username} sent you a friend request!`,
				});
				console.log(
					`Request notification sent to user ${friendId} on socket ${socketId}`
				);
			});
		} else {
			console.log(
				`Request sent but user ${friendId} is offline, can't send notification right now.`
			);
		}
		await notificationModel.createNotification(
			userId,
			friendId,
			"friendRequest",
			`${username} sent you a friend request!`,
			false
		);

		reply.code(StatusCodes.CREATED).send({ success: true });
	},

	// Accept or reject a request
	updateFriendship: async (request, reply) => {
		const { friendshipId } = request.params;
		const { action } = request.body;
		const {
			user: { id: userId, username },
		} = request.user;
		const { requestSenderId, requestSenderUsername, status } =
			await friendModel.handleRequest(friendshipId, userId, action);

		// Notification handling
		if (status === "accepted") {
			const targetSockets = onlineUsers.get(requestSenderId);
			if (targetSockets) {
				targetSockets.forEach((socketId) => {
					io.to(socketId).emit("friendRequestAccept", {
						fromUserId: userId,
						message: `${username} has accepted your friend request!`,
					});
					console.log(
						`Acceptance notification sent to user ${requestSenderId} on socket ${socketId}`
					);
				});
			} else {
				console.log(
					`Request sent but user ${requestSenderId} is offline, can't send notification right now.`
				);
			}

			// Send them a notification stating that they accepted your friend request
			await notificationModel.createNotification(
				userId,
				requestSenderId,
				"friendRequest",
				`${username} has accepted your friend request!`,
				false
			);

			// Delete the notification stating that they sent you a friend request
			await notificationModel.deleteNotification(
				requestSenderId,
				userId,
				"friendRequest"
			);

			await notificationModel.createNotification(
				requestSenderId,
				userId,
				"friendRequest",
				`You are now friends with ${requestSenderUsername}`,
				false
			);
		} else {
			// This is the control path you hit when you decline a friend request
			// Just delete the notification stating that they sent you a friend request, no need to create anything
			await notificationModel.deleteNotification(
				requestSenderId,
				userId,
				"friendRequest"
			);
		}

		reply.send({ success: true });
	},

	// Cancel a pending request that you sent or delete a friendship
	deleteFriendship: async (request, reply) => {
		const { friendshipId } = request.params;
		const {
			user: { id: userId },
		} = request.user;
		const exFriendIdCapture = await friendModel.abortFriendship(
			friendshipId,
			userId
		);

		// Notification handling
		await notificationModel.deleteAllBilateralNotifications(
			userId,
			exFriendIdCapture,
			"friendRequest"
		);

		reply.code(204).send();
	},

	listFriends: async (request, reply) => {
		const {
			user: { id: userId },
		} = request.user;
		const friends = await friendModel.listFriends(userId);

		reply.send(friends);
	},

	listRequests: async (request, reply) => {
		const {
			user: { id: userId },
		} = request.user;
		const { status, direction } = request.query;
		const requests = await friendModel.listRequests(
			userId,
			status,
			direction
		);

		reply.send(requests);
	},
});

/*
	TO DO

		* (C) Handle (not allowed to send friend request to someone who has already sent you a request (someone you are pending))
		* (C) Handle if no such id in users table
		* (C) Handle preventing a user from sending a friend request to someone who still has them on hold (the friend request exists and is already pending)
		* (C) Handle preventing a user from sending a request to someone already in their friend's list
*/

/*
	NOTES

	Note 1

		Delete the notification stating that they sent you a friend request from your panel whenever you reject them AND 
		even when you accept their request, because it makes no sense to still see in your notifications panel that "user 
		X has sent you a friend request" after you already became friends.

*/
