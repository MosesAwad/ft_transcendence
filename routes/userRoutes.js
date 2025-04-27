const { listUserOpts } = require("../schemas/userSchemas");

async function userRoutes(fastify, options) {
	const { userModel } = options;
	const { listUsers } = require("../controllers/userController")(userModel);
	fastify.get(
		"/showUser",
		{ preHandler: fastify.authenticate },
		async (request, reply) => {
			reply.send({ user: request.user });
		}
	);
	fastify.get(
		"/",
		{ preHandler: fastify.authenticate, schema: listUserOpts.schema },
		listUsers
	);
}

module.exports = userRoutes;
