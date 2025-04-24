const { StatusCodes } = require("http-status-codes");
const bcrypt = require("bcryptjs");
const CustomError = require("../errors");

module.exports = (friendModel, io, onlineUsers) => ({
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

		// Notification handler
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
		// await notificationModel.storeNotification(
		// 	userId,
		// 	friendId,
		// 	"friendRequest",
		// 	`${username} sent you a friend request!`
		// );

		reply.code(StatusCodes.CREATED).send({ success: true });
	},

	// Accept or reject a request
	updateFriendship: async (request, reply) => {
		const { friendshipId } = request.params;
		const { action } = request.body;
		const {
			user: { id: userId, username },
		} = request.user;
		const requestSenderId = await friendModel.handleRequest(
			friendshipId,
			userId,
			action
		);

		// Notification handler
		if (requestSenderId) {
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
					`Request sent but user ${requestSenderId} is offline, can't send notification.`
				);
			}
		}
		reply.send({ success: true });
	},

	// Cancel a pending request that you sent or delete a friendship
	deleteFriendship: async (request, reply) => {
		const { friendshipId } = request.params;
		const {
			user: { id: userId },
		} = request.user;
		await friendModel.abortFriendship(friendshipId, userId);
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
