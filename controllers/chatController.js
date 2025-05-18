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
				`No such chat was found`
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
		reply
			.status(201)
			.send({ msg: "Chat creation successful", chat_id: chatId });
	},

	createMessage: async (request, reply) => {
		const {
			user: { id: senderId },
		} = request.user;
		const { chatId, content } = request.body;

		const messageId = await chatModel.createMessage(
			senderId,
			chatId,
			content
		);
		reply.send({
			msg: `Message with id ${messageId} was successfuly sent`,
		});
	},

	getMessages: async (request, reply) => {
		const {
			user: { id: userId },
		} = request.user;
		const { chatId } = request.params;

		const messages = await chatModel.getMessages(userId, chatId);
		reply.send(messages);
	},
});
