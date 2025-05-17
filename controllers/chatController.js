const CustomError = require("../errors");

module.exports = (chatModel) => ({
	getChat: async (request, reply) => {
		const {
			user: { id: user1Id },
		} = request.user;
		const { user2Id } = request.query;

		const chatId = await chatModel.getChatBetweenUsers(user1Id, user2Id);
		if (!chatId) {
			throw new CustomError.NotFoundError(
				`No chat with ${user2Id} was found`
			);
		}
		reply.send({ msg: "Chat found", chat_id: chatId });
	},

	createChat: async (request, reply) => {
		const {
			user: { id: user1Id },
		} = request.user;
		const { user2Id } = request.body;
		const chatId = await chatModel.createChatBetweenUsers(user1Id, user2Id);
		if (!chatId) {
			throw new CustomError.BadRequestError(
				`Unable to start a new chat!`
			);
		}
		reply
			.status(201)
			.send({ msg: "Chat creation successful", chat_id: chatId });
	},
});
