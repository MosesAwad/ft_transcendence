const CustomError = require("../errors");

module.exports = (chatModel, notificationModel, io, onlineUsers) => {
	const chatNotificationService =
		require("../services/chatNotificationService")(
			notificationModel,
			io,
			onlineUsers
		);
	return {
		getSingleChat: async (request, reply) => {
			const {
				user: { id: user1Id },
			} = request.user;
			const { otherUserId: user2Id } = request.params;

			const chatId = await chatModel.getChatBetweenUsers(
				user1Id,
				user2Id
			);
			reply.send({ msg: "Chat found", chat_id: chatId });
		},

		getAllChats: async (request, reply) => {
			const {
				user: { id: user1Id },
			} = request.user;

			const chatsData = await chatModel.getAllUserChats(user1Id);
			reply.send(chatsData);
		},

		createChat: async (request, reply) => {
			const {
				user: { id: user1Id },
			} = request.user;
			const { user2Id } = request.body;

			const chatId = await chatModel.createChatBetweenUsers(
				user1Id,
				user2Id
			);
			reply
				.status(201)
				.send({ msg: "Chat creation successful", chat_id: chatId });
		},

		createMessage: async (request, reply) => {
			const { user } = request.user;
			const { id: senderId } = user;
			const { chatId, content } = request.body;

			const { message, receiverUserId } = await chatModel.createMessage(
				senderId,
				chatId,
				content
			);

			reply.send({
				msg: `Message with id ${message.id} was successfuly sent`,
			});
			await chatNotificationService.notifyMessageReceived(
				user,
				receiverUserId,
				chatId,
				message.content
			);
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
	};
};
