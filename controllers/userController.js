module.exports = (userModel) => ({
	listUsers: async (request, reply) => {
		const { search, page, limit } = request.query;
		const {
			user: { id: userId },
		} = request.user;
		const users = await userModel.listUsers(search, page, limit, userId);

		reply.send(users);
	},
});
