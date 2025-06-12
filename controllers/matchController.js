const { StatusCodes } = require("http-status-codes");

module.exports = (matchModel) => ({
	createMatch: async (request, reply) => {
		const { user } = request.user;
		const { player2_name, match_type } = request.body;

		const newMatch = await matchModel.createMatch({
			player1_name: user.username,
			player2_name,
			match_type,
		});

		return reply.status(StatusCodes.CREATED).send({ match: newMatch });
	},

	updateMatchResult: async (request, reply) => {
		const { matchId, player1_score, player2_score } = request.body;

		const updatedMatch = await matchModel.finalizeMatch(
			matchId,
			player1_score,
			player2_score
		);

		return reply.status(StatusCodes.OK).send({ match: updatedMatch });
	},

	listUserMatches: async (request, reply) => {
		const { userId } = request.params;
		const { limit , offset } = request.query;

		const matches = await matchModel.listUserMatches(userId, limit, offset);

		return reply.status(StatusCodes.OK).send(matches);
	},
});
