const authPlugin = require("../plugins/authentication");

async function userRoutes(fastify, options) {
	fastify.get(
		"/users/showUser",
		{ preHandler: fastify.authenticate },
		async (request, reply) => {
			reply.send({ user: request.user });
		}
	);
}

module.exports = userRoutes;
