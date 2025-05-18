const getSingleChatOpts = {
	schema: {
		params: {
			type: "object",
			properties: {
				otherUserId: {
					type: "number",
				},
			},
			required: ["otherUserId"],
		},
	},
};

const createChatOpts = {
	schema: {
		body: {
			type: "object",
			properties: {
				user2Id: {
					type: "number",
				},
			},
			required: ["user2Id"],
		},
	},
};

const createMessageOpts = {
	schema: {
		body: {
			type: "object",
			properties: {
				chatId: {
					type: "number",
				},
				content: {
					type: "string",
				},
			},
			required: ["chatId", "content"],
		},
	},
};

const getMessagesOpts = {
	schema: {
		params: {
			type: "object",
			properties: {
				chatId: {
					type: "number",
				},
			},
			required: ["chatId"],
		},
	},
};

module.exports = {
	getSingleChatOpts,
	createChatOpts,
	createMessageOpts,
	getMessagesOpts,
};
