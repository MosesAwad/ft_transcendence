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
					enum: ["1v1", "1vAi", "multiplayer"],
				},
				// For multiplayer matches
				team1_name: { type: "string" },
				team2_name: { type: "string" },
				players: {
					type: "array",
					items: {
						type: "object",
						properties: {
							name: { type: "string" },
							team: { type: "number", enum: [1, 2] },
							user_id: { type: "number", nullable: true },
						},
						required: ["name", "team"],
					},
					minItems: 4,
					maxItems: 4,
				},
			},
			allOf: [
				{
					if: {
						properties: { match_type: { enum: ["multiplayer"] } },
					},
					then: {
						required: [
							"match_type",
							"team1_name",
							"team2_name",
							"players",
						],
					},
				},
				{
					if: {
						properties: {
							match_type: { enum: ["1v1"] },
						},
					},
					then: {
						required: [
							"match_type",
							"player1_id",
							"player2_id",
							"player1_name",
							"player2_name",
						],
					},
				},
				{
					if: {
						properties: {
							match_type: { enum: ["1vAi"] },
						},
					},
					then: {
						required: ["match_type", "player1_id", "player1_name"],
					},
				},
			],
		},
	},
};

const updateMatchOpts = {
	schema: {
		params: {
			type: "object",
			properties: {
				matchId: { type: "number" },
			},
			required: ["matchId"],
		},
		body: {
			type: "object",
			properties: {
				player1_score: { type: "number", minimum: 0 },
				player2_score: { type: "number", minimum: 0 },
				// For multiplayer matches
				team1_score: { type: "number", minimum: 0 },
				team2_score: { type: "number", minimum: 0 },
				is_multiplayer: { type: "boolean" },
			},
			allOf: [
				{
					if: {
						properties: { is_multiplayer: { enum: [true] } },
					},
					then: {
						required: ["team1_score", "team2_score"],
					},
				},
				{
					if: {
						not: {
							properties: { is_multiplayer: { enum: [true] } },
						},
					},
					then: {
						required: ["player1_score", "player2_score"],
					},
				},
			],
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
					enum: ["1v1", "1vAi", "tournament", "multiplayer"],
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
