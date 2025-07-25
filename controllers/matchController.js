const { StatusCodes } = require("http-status-codes");

module.exports = (matchModel, teamModel, userModel) => {
	const matchService = require("../services/matchService")(
		matchModel,
		teamModel,
		userModel
	);
	const multiplayerService = require("../services/multiplayerService")(
		matchModel,
		teamModel,
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
				team1_name,
				team2_name,
				players,
			} = request.body;

			if (match_type === "multiplayer") {
				const match = await multiplayerService.createMultiplayerMatch({
					team1_name,
					team2_name,
					players,
					currentUserId,
				});

				return reply.status(StatusCodes.CREATED).send({ match });
			}

			const {
				player1_name: finalPlayer1Name,
				player2_name: finalPlayer2Name,
			} = await matchService.validateAndPrepareMatchPlayers({
				player1_id,
				player2_id,
				player1_name,
				player2_name,
				currentUserId,
				match_type,
			});

			const match = await matchModel.createMatch({
				player1_id,
				player2_id,
				player1_name: finalPlayer1Name,
				player2_name: finalPlayer2Name,
				match_type,
			});

			return reply.status(StatusCodes.CREATED).send(match);
		},

		updateMatchResult: async (request, reply) => {
			const {
				user: { id: currentUserId },
			} = request.user;
			const { matchId } = request.params;
			const {
				player1_score,
				player2_score,
				is_multiplayer,
				team1_score,
				team2_score,
			} = request.body;

			// Handle multiplayer match update
			if (is_multiplayer) {
				const updatedMatch = await multiplayerService.finalizeMultiplayerMatch(
					matchId,
					team1_score,
					team2_score,
					currentUserId
				);

				return reply
					.status(StatusCodes.OK)
					.send({ match: updatedMatch });
			}

			// For non-multiplayer matches, continue with the existing logic
			const updatedMatch = await matchModel.finalizeMatch(
				matchId,
				player1_score,
				player2_score,
				currentUserId
			);

			return reply.status(StatusCodes.OK).send(updatedMatch);
		},
	};
};
