const createFriendshipOpts = {
	schema: {
		body: {
			type: "object",
			required: ["friendId"],
			properties: {
				friendId: { type: "number" },
			},
		},
	},
};

const updateFriendshipOpts = {
	schema: {
		params: {
			type: "object",
			properties: {
				friendshipId: { type: "number" },
			},
			required: ["friendshipId"],
		},
		body: {
			type: "object",
			properties: {
				action: { type: "string", enum: ["accept", "reject"] },
			},
			required: ["action"],
		},
	},
};

const deleteFriendshipOpts = {
	schema: {
		params: {
			type: "object",
			properties: {
				friendshipId: { type: "number" },
			},
			required: ["friendshipId"],
		},
	},
};

const listFriendshipOpts = {
	schema: {
		query: {
			type: "object",
			properties: {
				direction: {
					type: "string",
					enum: ["received", "sent"],
				},
				status: {
					type: "string",
					enum: ["pending"],
				},
			},
			required: [], // Both are optional
		},
	},
};

module.exports = {
	createFriendshipOpts,
	updateFriendshipOpts,
	deleteFriendshipOpts,
	listFriendshipOpts,
};
