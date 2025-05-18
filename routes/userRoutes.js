const { listSingleUserOpts, listAllUsersOpts } = require("../schemas/userSchemas");

async function userRoutes(fastify, options) {
	const { userModel } = options;
	const { listAllUsers, listSingleUser } =
		require("../controllers/userController")(userModel);
	fastify.get(
		"/showUser",
		{ preHandler: fastify.authenticate },
		async (request, reply) => {
			reply.send({ user: request.user });
		}
	);
	fastify.get(
		"/:userId",
		{ preHandler: fastify.authenticate, schema: listSingleUserOpts.schema },
		listSingleUser
	);
	fastify.get(
		"/",
		{ preHandler: fastify.authenticate, schema: listAllUsersOpts.schema },
		listAllUsers
	);
}

module.exports = userRoutes;
