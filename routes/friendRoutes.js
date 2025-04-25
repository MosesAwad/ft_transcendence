const {
	createFriendshipOpts,
	updateFriendshipOpts,
	deleteFriendshipOpts,
	listFriendshipOpts,
} = require("../schemas/friendshipSchemas");

async function friendRoutes(fastify, options) {
	const { friendModel, notificationModel, io, onlineUsers } = options;
	const {
		createFriendship,
		updateFriendship,
		deleteFriendship,
		listFriends,
		listRequests,
	} = require("../controllers/friendController")(friendModel, notificationModel, io, onlineUsers);

	fastify.post(
		"/",
		{
			preHandler: fastify.authenticate,
			schema: createFriendshipOpts.schema,
		},
		createFriendship
	);
	fastify.patch(
		"/:friendshipId",
		{
			preHandler: fastify.authenticate,
			schema: updateFriendshipOpts.schema,
		},
		updateFriendship
	);
	fastify.delete(
		"/:friendshipId",
		{
			preHandler: fastify.authenticate,
			schema: deleteFriendshipOpts.schema,
		},
		deleteFriendship
	);
	fastify.get(
		"/",
		{ preHandler: fastify.authenticate, schema: listFriendshipOpts.schema },
		async (request, reply) => {
			if (request.query.status && request.query.direction) {
				return listRequests(request, reply);
			} else {
				return listFriends(request, reply);
			}
		}
	);
}

module.exports = friendRoutes;

/*
🌍 RESTful Routes Design

	Method		Route												Description
	POST		/friendships										Send a friend request
	PATCH		/friendships/:friendshipId							Update a request (accept or reject)
	DELETE		/friendships/:id									Cancel a pending request OR unfriend
	GET			/friendships										Get all accepted friends
	GET			/friendships?status=pending&direction=received		Get pending requests you've received
*/
