const {
	sendRequestOpts,
	acceptRequestOpts,
} = require("../schemas/friendSchemas");

async function friendRoutes(fastify, options) {
	const { friendModel } = options;
	const { createFriendship, updateFriendship, listFriends, listRequests } =
		require("../controllers/friendController")(friendModel);

	fastify.post(
		"/",
		{ preHandler: fastify.authenticate, sendRequestOpts },
		createFriendship
	);
	fastify.patch(
		"/:friendshipId",
		{ preHandler: fastify.authenticate, acceptRequestOpts },
		updateFriendship
	);
	fastify.get(
		"/",
		{ preHandler: fastify.authenticate },
		async (request, reply) => {
			const hasQueryParams = Object.keys(request.query).length > 0;

			if (hasQueryParams) {
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
