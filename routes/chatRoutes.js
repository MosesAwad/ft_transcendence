const {
	getSingleChatOpts,
	createChatOpts,
	createMessageOpts,
	getMessagesOpts,
} = require("../schemas/chatSchemas");

const chatRoutes = function (fastify, options) {
	const { chatModel, notificationModel, onlineUsers } = options;
	const io = fastify.io;

	const {
		getSingleChat,
		getAllChats,
		createChat,
		createMessage,
		getMessages,
	} = require("../controllers/chatController")(chatModel, notificationModel, io, onlineUsers);

	fastify.get(
		"/chats/:chatId/messages",
		{ preHandler: fastify.authenticate, schema: getMessagesOpts.schema },
		getMessages
	);
	// This route just serves as a checker for the front-end to test whether a chat has to be created or not
	fastify.get(
		"/chats/between/:otherUserId",
		{
			preHandler:
				fastify.authenticate , schema: getSingleChatOpts.schema,
		},
		getSingleChat
	);
	// This route gets all chats belonging to a single user ordered by the updated_at field in the "chats" table
	fastify.get(
		"/chats",
		{ preHandler: fastify.authenticate},
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
};

module.exports = chatRoutes;
