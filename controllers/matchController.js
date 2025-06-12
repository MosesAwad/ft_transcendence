const { StatusCodes } = require("http-status-codes");

module.exports = (matchModel, userModel) => {
	const matchService = require("../services/matchService")(
		matchModel,
		userModel
	);

	return {
		createMatch: async (request, reply) => {
			const { id: currentUserId } = request.user.user;
			const {
				player1_id,
				player2_id,
				player1_name,
				player2_name,
				match_type,
			} = request.body;

			// Validate and prepare player names
			const {
				player1_name: finalPlayer1Name,
				player2_name: finalPlayer2Name,
			} = await matchService.validateAndPrepareMatchPlayers({
				player1_id,
				player2_id,
				player1_name,
				player2_name,
				currentUserId,
			});

			const match = await matchModel.createMatch({
				player1_id,
				player2_id,
				player1_name: finalPlayer1Name,
				player2_name: finalPlayer2Name,
				match_type,
			});

			return reply.status(StatusCodes.CREATED).send({ match });
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
			const { limit, page, match_type } = request.query;

			const matches = await matchService.listUserMatches(
				userId,
				limit,
				page,
				match_type
			);
			return reply.status(StatusCodes.OK).send(matches);
		},
	};
};
