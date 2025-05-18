const CustomError = require("../errors");

module.exports = (chatModel, io) => ({
	getSingleChat: async (request, reply) => {
		const {
			user: { id: user1Id },
		} = request.user;
		const { chatId } = request.params;

		const chat = await validateChatIdAndUserParticipation(user1Id, chatId);
		// if (!chat)
		reply.send({ msg: "Chat fetch approved", chat_id: chatId });
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

		const message = await chatModel.createMessage(
			senderId,
			chatId,
			content
		);

		reply.send({
			msg: `Message with id ${message.id} was successfuly sent`,
		});

		io.to(chatId.toString()).emit("newMessage", message);
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
