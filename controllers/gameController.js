const { StatusCodes } = require("http-status-codes");

module.exports = (matchModel) => ({
	createGame: async (request, reply) => {
		const { user } = request.user;
		const { player2_name, match_type } = request.body;

		const newMatch = await matchModel.createMatch({
			player1_name: user.username,
			player2_name,
			match_type,
		});

		return reply.status(StatusCodes.CREATED).send({ match: newMatch });
	},

	updateGameResult: async (request, reply) => {
		const { matchId, player1_score, player2_score } = request.body;


		const updatedMatch = await matchModel.finalizeMatch(matchId, player1_score, player2_score);
    
		return reply.status(StatusCodes.OK).send({ match: updatedMatch });
	},
});
