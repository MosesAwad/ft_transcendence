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
});
