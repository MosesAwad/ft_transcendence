const { getChatOpts, createChatOpts } = require("../schemas/chatSchemas");

const authRoutes = function (fastify, options) {
	const { chatModel } = options;
	const { getChat, createChat } = require("../controllers/chatController")(
		chatModel
	);
	fastify.post(
		"/",
		{ preHandler: fastify.authenticate, schema: createChatOpts.schema },
		createChat
	);
	fastify.get(
		"/",
		{ preHandler: fastify.authenticate, schema: getChatOpts.schema },
		getChat
	);

	// Get All Chats belonging to a single user
};

module.exports = authRoutes;
