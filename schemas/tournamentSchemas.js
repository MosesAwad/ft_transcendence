const createTournamentOpts = {
	schema: {
		body: {
			type: "object",
			properties: {
				player_capacity: {
					type: "number",
					enum: [4, 8],
					default: 4,
				},
			},
		},
	},
};

const getTournamentOpts = {
	schema: {
		params: {
			type: "object",
			properties: {
				tournamentId: { type: "number" },
			},
			required: ["tournamentId"],
		},
	},
};

const createTournamentMatchOpts = {
	schema: {
		params: {
			type: "object",
			properties: {
				tournamentId: { type: "number" },
			},
			required: ["tournamentId"],
		},
		body: {
			type: "object",
			properties: {
				player1_id: { type: "number", nullable: true },
				player2_id: { type: "number", nullable: true },
				player1_name: { type: "string" },
				player2_name: { type: "string" },
			},
			required: [
				"player1_id",
				"player2_id",
				"player1_name",
				"player2_name",
			],
		},
	},
};

const updateTournamentMatchOpts = {
	schema: {
		params: {
			type: "object",
			properties: {
				tournamentId: { type: "number" },
				matchId: { type: "number" },
			},
			required: ["tournamentId", "matchId"],
		},
		body: {
			type: "object",
			properties: {
				player1_score: { type: "number", minimum: 0 },
				player2_score: { type: "number", minimum: 0 },
			},
			required: ["player1_score", "player2_score"],
		},
	},
};

const listTournamentsOpts = {
	schema: {
		querystring: {
			type: "object",
			properties: {
				limit: { type: "number", minimum: 1, default: 10 },
				page: { type: "number", minimum: 1, default: 1 },
			},
		},
	},
};

module.exports = {
	createTournamentOpts,
	getTournamentOpts,
	createTournamentMatchOpts,
	updateTournamentMatchOpts,
	listTournamentsOpts,
};
