const CustomError = require("../errors");

module.exports = (tournamentModel, matchModel, userModel) => {
	// Import the match service to reuse validation logic
	const matchService = require("./matchService")(matchModel, userModel);

	return {
		// Get tournament with all its matches
		getTournamentWithMatches: async (tournamentId) => {
			const tournament = await tournamentModel.getTournament(
				tournamentId
			);
			if (!tournament) {
				throw new CustomError.NotFoundError(
					`No tournament with id ${tournamentId}`
				);
			}

			// For each tournament, get the matches and extract player names
			const matches = await matchModel.getTournamentMatches(tournament.id);

			// Get match count
			const matchCount = matches.length;

			// Extract unique player names from matches
			const participantNames = new Set();
			matches.forEach((match) => {
				participantNames.add(match.player1_name);
				participantNames.add(match.player2_name);
			});

			return {
				id: tournament.id,
				player_capacity: tournament.player_capacity,
				created_at: tournament.created_at,
				updated_at: tournament.updated_at,
				match_count: matchCount,
				participants: Array.from(participantNames),
			};
		},

		// List all tournaments with participant names
		listTournamentsWithParticipants: async (limit = 10, page = 1) => {
			const tournaments = await tournamentModel.listTournaments();

			// For each tournament, get the matches and extract player names
			const tournamentsWithParticipants = await Promise.all(
				tournaments.map(async (tournament) => {
					const matches = await matchModel.getTournamentMatches(
						tournament.id
					);

					// Get match count
					const matchCount = matches.length;

					// Extract unique player names from matches
					const participantNames = new Set();
					matches.forEach((match) => {
						participantNames.add(match.player1_name);
						participantNames.add(match.player2_name);
					});

					return {
						id: tournament.id,
						player_capacity: tournament.player_capacity,
						created_at: tournament.created_at,
						updated_at: tournament.updated_at,
						match_count: matchCount,
						participants: Array.from(participantNames),
					};
				})
			);

			// Apply pagination
			const startIndex = (page - 1) * limit;
			const endIndex = page * limit;
			const paginatedTournaments = tournamentsWithParticipants.slice(
				startIndex,
				endIndex
			);

			return {
				tournaments: paginatedTournaments,
				totalCount: tournaments.length,
				page,
				limit,
			};
		},

		// Create a tournament match
		createTournamentMatch: async (
			tournamentId,
			currentUserId,
			matchData
		) => {
			const { player1_id, player2_id, player1_name, player2_name } =
				matchData;

			const tournament = await tournamentModel.getTournament(
				tournamentId
			);

			if (!tournament) {
				throw new CustomError.NotFoundError(
					`No tournament with id ${tournamentId}`
				);
			}

			// Get current number of matches in this tournament
			const matches = await matchModel.getTournamentMatches(tournamentId);
			const matchCount = matches.length;

			// For 4-player tournaments, max 3 matches (semifinal + final)
			// For 8-player tournaments, max 7 matches (quarterfinal + semifinal + final)
			const maxMatches =
				tournament.player_capacity === 4
					? 3
					: tournament.player_capacity === 8
					? 7
					: 0;

			if (matchCount >= maxMatches) {
				throw new CustomError.BadRequestError(
					`Tournament with ${tournament.player_capacity} players cannot have more than ${maxMatches} matches`
				);
			}

			// Use the match service to validate player names
			const {
				player1_name: finalPlayer1Name,
				player2_name: finalPlayer2Name,
			} = await matchService.validateAndPrepareMatchPlayers({
				player1_id,
				player2_id,
				player1_name,
				player2_name,
				currentUserId,
				match_type: "tournament",
			});

			// Create a match with tournament_id
			const match = await matchModel.createMatch({
				player1_id,
				player2_id,
				player1_name: finalPlayer1Name,
				player2_name: finalPlayer2Name,
				match_type: "tournament",
				tournament_id: tournamentId,
			});

			return match;
		},
	};
};
