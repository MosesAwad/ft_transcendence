const {
	getChatOpts,
	createChatOpts,
	createMessageOpts,
	getMessagesOpts,
} = require("../schemas/chatSchemas");

const authRoutes = function (fastify, options) {
	const { chatModel } = options;
	const { getChat, createChat, createMessage, getMessages } =
		require("../controllers/chatController")(chatModel);

	fastify.get(
		"/chats/:chatId/messages",
		{ preHandler: fastify.authenticate, schema: getMessagesOpts.schema },
		getMessages
	);
	fastify.post(
		"/chats",
		{ preHandler: fastify.authenticate, schema: createChatOpts.schema },
		createChat
	);
	fastify.get(
		"/chats",
		{ preHandler: fastify.authenticate, schema: getChatOpts.schema },
		getChat
	);
	fastify.post(
		"/messages",
		{ preHandler: fastify.authenticate, schema: createMessageOpts.schema },
		createMessage
	);
	// Get All Chats belonging to a single user ordered by the updated_at field in the "chats" table
};

module.exports = authRoutes;
