module.exports = (userModel) => ({
	listAllUsers: async (request, reply) => {
		const { search, page, limit } = request.query;
		const {
			user: { id: userId },
		} = request.user;
		const users = await userModel.listUsers(search, page, limit, userId);

		reply.send(users);
	},

	listSingleUser: async (request, reply) => {
		const { userId } = request.params;
		const user = await userModel.listSingleUser(userId);

		reply.send(user);
	},

	listAllBlocks: async (request, reply) => {
		const {
			user: { id: userId },
		} = request.user;
		const blocks = await userModel.listAllBlocks(userId);

		reply.send(blocks);
	},

	blockUser: async (request, reply) => {
		const { blockRecipientId } = request.body;
		const {
			user: { id: userId },
		} = request.user;
		const block = await userModel.blockUser(userId, blockRecipientId);

		reply.send(block);
	},

	unblockUser: async (request, reply) => {
		const { blockId } = request.params;
		const {
			user: { id: userId },
		} = request.user;
		const unblockedUserId = await userModel.unblockUser(userId, blockId);

		reply.send({
			msg: `Successfuly unblocked user with id ${unblockedUserId}`,
		});
	},
});
