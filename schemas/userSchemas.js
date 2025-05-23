const listAllUsersOpts = {
	schema: {
		query: {
			type: "object",
			properties: {
				page: {
					type: "number",
					minimum: 1,
				},
				limit: {
					type: "number",
					minimum: 1,
				},
				search: {
					type: "string",
				},
				tournament: {
					type: "string",
				},
			},
			required: ["page", "limit"],
			oneOf: [
				{ required: ["search"] }, // Either 'search' is required
				{ required: ["tournament"] }, // Or 'tournament' is required
			],
		},
	},
};

const listSingleUserOpts = {
	schema: {
		params: {
			type: "object",
			properties: {
				userId: {
					type: "number",
				},
			},
			required: ["userId"],
		},
	},
};

const createBlockOpts = {
	schema: {
		body: {
			type: "object",
			required: ["blockRecipientId"],
			properties: {
				blockRecipientId: { type: "number" },
			},
		},
	},
};

const deleteBlockOpts = {
	schema: {
		params: {
			type: "object",
			required: ["blockId"],
			properties: {
				blockId: { type: "number" },
			},
		},
	},
};

module.exports = {
	listSingleUserOpts,
	listAllUsersOpts,
	createBlockOpts,
	deleteBlockOpts,
};

/*
	You can add more later, besides search, perhaps like (tournament instead of search query to list all players participating). I left 
	it there just for reference, but as of now, code only supports search query.
*/
