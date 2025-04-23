const { StatusCodes } = require("http-status-codes");
const bcrypt = require("bcryptjs");
const CustomError = require("../errors");

module.exports = (friendModel) => ({
	// Send a friend request
	createFriendship: async (request, reply) => {
		const { friendId } = request.body;
		const {
			user: { id: userId },
		} = request.user;
		if (request.user.user.id === friendId) {
			throw new CustomError.BadRequestError(
				"Cannot send friend request to yourself"
			);
		}
		await friendModel.sendRequest(userId, friendId);
		reply.code(StatusCodes.CREATED).send({ success: true });
	},

	// Accept or reject a request
	updateFriendship: async (request, reply) => {
		const { friendshipId } = request.params;
		const { action } = request.body;
		const {
			user: { id: userId },
		} = request.user;
		await friendModel.handleRequest(friendshipId, userId, action);
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
		// use validation schema? to ensure that status must be pending but
		// other than that, I want it to always be pending
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
