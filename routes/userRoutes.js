const {
	listSingleUserOpts,
	listAllUsersOpts,
	createBlockOpts,
	deleteBlockOpts,
	uploadProfilePictureOpts,
} = require("../schemas/userSchemas");

async function userRoutes(fastify, options) {
	const { userModel, blockService } = options;
	const {
		listAllUsers,
		listSingleUser,
		listAllBlocks,
		blockUser,
		unblockUser,
		uploadProfilePicture,
	} = require("../controllers/userController")(userModel, blockService);

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
	fastify.get("/blocks", { preHandler: fastify.authenticate }, listAllBlocks);
	fastify.post(
		"/blocks",
		{
			preHandler: fastify.authenticate,
			schema: createBlockOpts.schema,
		},
		blockUser
	);
	fastify.delete(
		"/blocks/:blockId",
		{
			preHandler: fastify.authenticate,
			schema: deleteBlockOpts.schema,
		},
		unblockUser
	);
	fastify.post(
		"/uploads/profile-picture",
		{
			preHandler: fastify.authenticate,
			schema: uploadProfilePictureOpts.schema,
		},
		uploadProfilePicture
	);
}

module.exports = userRoutes;
