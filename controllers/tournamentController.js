const { StatusCodes } = require("http-status-codes");

module.exports = (tournamentModel, matchModel, userModel) => {
	const tournamentService = require("../services/tournamentService")(
		tournamentModel,
		matchModel,
		userModel
	);

	return {
		createTournament: async (request, reply) => {
			const { player_capacity = 4 } = request.body;
			const { id: currentUserId } = request.user.user;

			// Validate player capacity is either 4 or 8
			if (player_capacity !== 4 && player_capacity !== 8) {
				return reply.status(StatusCodes.BAD_REQUEST).send({
					message: "Tournament can only have 4 or 8 players",
				});
			}

			const tournament = await tournamentModel.createTournament(
				player_capacity,
				currentUserId
			);

			return reply.status(StatusCodes.CREATED).send({ tournament });
		},

		getTournament: async (request, reply) => {
			const { tournamentId } = request.params;

			const tournament = await tournamentService.getTournamentWithMatches(
				tournamentId
			);

			return reply.status(StatusCodes.OK).send(tournament);
		},

		listTournaments: async (request, reply) => {
			const { limit = 10, page = 1 } = request.query;

			const result =
				await tournamentService.listTournamentsWithParticipants(
					limit,
					page
				);

			return reply.status(StatusCodes.OK).send(result);
		},

		createTournamentMatch: async (request, reply) => {
			const { tournamentId } = request.params;
			const { id: currentUserId } = request.user.user;
			const matchData = request.body;

			const match = await tournamentService.createTournamentMatch(
				tournamentId,
				currentUserId,
				matchData
			);

			return reply.status(StatusCodes.CREATED).send({ match });
		},

		updateTournamentMatch: async (request, reply) => {
			const { tournamentId, matchId } = request.params;
			const { id: currentUserId } = request.user.user;
			const { player1_score, player2_score } = request.body;

			const match = await tournamentService.updateTournamentMatch(
				tournamentId,
				matchId,
				currentUserId,
				player1_score,
				player2_score
			);

			return reply.status(StatusCodes.OK).send({ match });
		},
	};
};
