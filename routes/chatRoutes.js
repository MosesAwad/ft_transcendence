const {
	getChatOpts,
	createChatOpts,
	createMessageOpts,
	getMessagesOpts,
} = require("../schemas/chatSchemas");

const authRoutes = function (fastify, options) {
	const { chatModel } = options;
	const io = fastify.io;

	const { getSingleChat, createChat, createMessage, getMessages } =
		require("../controllers/chatController")(chatModel, io);

	fastify.get(
		"/chats/:chatId/messages",
		{ preHandler: fastify.authenticate, schema: getMessagesOpts.schema },
		getMessages
	);
	fastify.get("/chats/:chatId", { preHandler: fastify.authenticate, /* schema: getMessagesOpts.schema */},
		getSingleChat
	);
	fastify.get(
		"/chats",
		{ preHandler: fastify.authenticate, schema: getChatOpts.schema },
		getAllChats
	);
	fastify.post(
		"/chats",
		{ preHandler: fastify.authenticate, schema: createChatOpts.schema },
		createChat
	);
	fastify.post(
		"/messages",
		{ preHandler: fastify.authenticate, schema: createMessageOpts.schema },
		createMessage
	);
	// Get All Chats belonging to a single user ordered by the updated_at field in the "chats" table
};

module.exports = authRoutes;
