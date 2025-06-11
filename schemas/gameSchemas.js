const createGameOpts = {
	schema: {
		body: {
			type: "object",
			properties: {
				player2_name: { type: "string" },
				match_type: {
					type: "string",
					enum: ["1v1", "1vAi"],
				},
			},
			required: ["player2_name", "match_type"],
		},
	},
};

const updateGameOpts = {
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

module.exports = {
	createGameOpts,
	updateGameOpts,
};
