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

const uploadProfilePictureOpts = {
	schema: {
		// This is a RESPONSE schema!
		response: {
			200: {
				type: "object",
				properties: {
					message: { type: "string" },
					url: { type: "string" },
				},
			},
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

const updateProfileOpts = {
	schema: {
		body: {
			type: "object",
			properties: {
				username: {
					type: "string",
					minLength: 3,
					maxLength: 50,
					pattern: "^[\\S]+$", // No whitespace allowed
				},
				email: {
					type: "string",
					format: "email",
				},
				currentPassword: {
					type: "string",
					minLength: 6,
				},
				newPassword: {
					type: "string",
					minLength: 6,
				},
			},
			// Require at least one field to be updated
			anyOf: [
				{ required: ["username"] },
				{ required: ["email"] },
				{ required: ["currentPassword", "newPassword"] },
			],
		},
		response: {
			200: {
				type: "object",
				properties: {
					message: { type: "string" },
					user: {
						type: "object",
						properties: {
							id: { type: "number" },
							username: { type: "string" },
							email: { type: "string" },
						},
					},
				},
			},
		},
	},
};

module.exports = {
	listSingleUserOpts,
	listAllUsersOpts,
	createBlockOpts,
	deleteBlockOpts,
	uploadProfilePictureOpts,
	updateProfileOpts,
};

/*
	You can add more later, besides search, perhaps like (tournament instead of search query to list all players participating). I left 
	it there just for reference, but as of now, code only supports search query.
*/
