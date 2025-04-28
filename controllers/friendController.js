const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");

module.exports = (friendModel, notificationModel, io, onlineUsers) => {
	const friendNotificationService =
		require("../services/friendNotificationService")(
			notificationModel,
			io,
			onlineUsers
		);

	return {
		// Send a friend request
		createFriendship: async (request, reply) => {
			const { friendId } = request.body;
			const { user } = request.user;

			await friendModel.sendRequest(user.id, friendId);
			await friendNotificationService.notifyFriendRequestSent(
				user,
				friendId
			);
			reply.code(StatusCodes.CREATED).send({ success: true });
		},

		// Accept or reject a request
		updateFriendship: async (request, reply) => {
			const { friendshipId } = request.params;
			const { action } = request.body;
			const { user: receiverUser } = request.user;

			const { senderUser, status } = await friendModel.handleRequest(
				friendshipId,
				receiverUser.id,
				action
			);

			if (status === "accepted") {
				await friendNotificationService.notfiyFriendRequestAccepted(
					senderUser,
					receiverUser
				);
			} else {
				await friendNotificationService.cleanUpRejectedRequest(
					senderUser.id,
					receiverUser.id
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

			await friendNotificationService.cleanupBilateralRequestNotifications(
				userId,
				exFriendIdCapture
			);

			reply.code(204).send();
		},

		// List all your friends
		listFriends: async (request, reply) => {
			const {
				user: { id: userId },
			} = request.user;
			const friends = await friendModel.listFriends(userId);

			reply.send(friends);
		},

		// List pending outgoing requests (direction: sent) + List pending incoming requests (direction: received)
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
	};
};

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
