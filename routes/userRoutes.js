const {
	listSingleUserOpts,
	listAllUsersOpts,
	createBlockOpts,
	deleteBlockOpts,
} = require("../schemas/userSchemas");

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
	fastify.get(
		"/blocks",
		{ preHandler: fastify.authenticate },
		async (request, reply) => {}
	);
	fastify.post(
		"/blocks",
		{
			preHandler: fastify.authenticate,
			schema: createBlockOpts.schema,
		},
		async (request, reply) => {}
	);
	fastify.delete(
		"/blocks/:blockId",
		{
			preHandler: fastify.authenticate,
			schema: deleteBlockOpts.schema,
		},
		async (request, reply) => {}
	);
}

module.exports = userRoutes;
