const {
	listSingleUserOpts,
	listAllUsersOpts,
	createBlockOpts,
	deleteBlockOpts,
	uploadProfilePictureOpts,
} = require("../schemas/userSchemas");
const { listUserMatchesOpts } = require("../schemas/matchSchemas");

async function userRoutes(fastify, options) {
	const { userModel, blockService, matchModel, onlineUsers, friendModel } =
		options;
	const {
		listAllUsers,
		listSingleUser,
		listAllBlocks,
		blockUser,
		unblockUser,
		uploadProfilePicture,
		deleteProfilePicture,
		listUserMatches,
	} = require("../controllers/userController")(
		userModel,
		blockService,
		matchModel,
		onlineUsers,
		friendModel
	);

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
	fastify.delete(
		"/uploads/profile-picture",
		{ preHandler: fastify.authenticate },
		deleteProfilePicture
	);
	fastify.get(
		"/:userId/matches",
		{
			preHandler: fastify.authenticate,
			schema: listUserMatchesOpts.schema,
		},
		listUserMatches
	);
}

module.exports = userRoutes;
