const getChatOpts = {
	schema: {
		query: {
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

module.exports = {
	getChatOpts,
	createChatOpts,
};
