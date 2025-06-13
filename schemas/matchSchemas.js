const createMatchOpts = {
	schema: {
		body: {
			type: "object",
			properties: {
				player1_id: { type: "number", nullable: true },
				player2_id: { type: "number", nullable: true },
				player1_name: { type: "string" },
				player2_name: { type: "string" },
				match_type: {
					type: "string",
					enum: ["1v1", "1vAi", "tournament"],
				},
			},
			required: [
				"player1_id",
				"player2_id",
				"player2_name",
				"match_type",
			],
		},
	},
};

const updateMatchOpts = {
	schema: {
		body: {
			type: "object",
			properties: {
				matchId: { type: "number" },
				player1_score: { type: "number", minimum: 0 },
				player2_score: { type: "number", minimum: 0 },
			},
			required: ["matchId", "player1_score", "player2_score"],
		},
	},
};

const listUserMatchesOpts = {
	schema: {
		params: {
			type: "object",
			required: ["userId"],
			properties: {
				userId: { type: "number" },
			},
		},
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
				match_type: {
					type: "string",
					enum: ["1v1", "1vAi", "tournament"],
				},
			},
			required: ["page", "limit"],
		},
	},
};

module.exports = {
	createMatchOpts,
	updateMatchOpts,
	listUserMatchesOpts,
};
