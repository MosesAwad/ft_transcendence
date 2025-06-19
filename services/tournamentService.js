const CustomError = require("../errors");

module.exports = (tournamentModel, matchModel, userModel) => {
	// Tournament-specific validation logic instead of using matchService
	// Make our tournament validation function available within the module
	const validateAndPrepareTournamentPlayers = async (
		tournamentId,
		currentUserId,
		player1_id,
		player2_id,
		player1_name,
		player2_name
	) => {
		// Check if names are identical
		if (player1_name === player2_name) {
			throw new CustomError.BadRequestError(
				"Player names cannot be the same"
			);
		}

		// Validate no spaces in names
		const validateNoSpaces = (name, label) => {
			if (name.includes(" ")) {
				throw new CustomError.BadRequestError(
					`${label} name cannot contain spaces`
				);
			}
		};

		validateNoSpaces(player1_name, "Player 1");
		validateNoSpaces(player2_name, "Player 2");

		// Validate authenticated users (if any)
		const validateAuthUser = async (userId, providedName, label) => {
			if (userId) {
				const user = await userModel.findById(userId);
				if (!user) {
					throw new CustomError.NotFoundError(
						`${label} user not found`
					);
				}
				if (user.username !== providedName) {
					throw new CustomError.BadRequestError(
						`${label} name does not match user's username`
					);
				}
				return user.username;
			}
			return null;
		};

		// Get existing participants in the tournament to check for duplicates
		const existingMatches = await matchModel.getTournamentMatches(
			tournamentId
		);

		// Create a map to track player names and their IDs for consistency checking
		// Structure: { playerName: userId }
		const playerNameToId = new Map();

		// Build a map of player names to user IDs for consistency checking
		existingMatches.forEach((match) => {
			const player1 = match.player1_name.replace(" (local)", "");
			const player2 = match.player2_name.replace(" (local)", "");

			// Track player1's ID (could be null for local players)
			if (!playerNameToId.has(player1)) {
				playerNameToId.set(player1, match.player1_id);
			}

			// Track player2's ID (could be null for local players)
			if (!playerNameToId.has(player2)) {
				playerNameToId.set(player2, match.player2_id);
			}
		});

		// Process player1
		let finalPlayer1Name = player1_name;
		if (player1_id === currentUserId) {
			// Current user is player1, validate username
			await validateAuthUser(player1_id, player1_name, "Player 1");
		} else if (player1_id) {
			// Another user ID was provided, which is not allowed
			throw new CustomError.UnauthorizedError(
				"Only the current user's ID should be provided, impersonating other users is forbidden"
			);
		} else {
			// Local player, add (local) suffix
			finalPlayer1Name = `${player1_name} (local)`;
		}

		// Process player2
		let finalPlayer2Name = player2_name;
		if (player2_id === currentUserId) {
			// Current user is player2, validate username
			await validateAuthUser(player2_id, player2_name, "Player 2");
		} else if (player2_id) {
			// Another user ID was provided, which is not allowed
			throw new CustomError.UnauthorizedError(
				"Only the current user's ID should be provided, impersonating other users is forbidden"
			);
		} else {
			// Local player, add (local) suffix
			finalPlayer2Name = `${player2_name} (local)`;
		}

		// Check for player name/ID consistency across the tournament
		// Players can participate in multiple matches in a tournament,
		// but the same name must always have the same ID

		// Check player1 name/ID consistency
		if (playerNameToId.has(player1_name)) {
			const existingId = playerNameToId.get(player1_name);
			// If player had an ID before, it must match; or both must be null (local players)
			if (existingId !== player1_id) {
				throw new CustomError.BadRequestError(
					`Player name "${player1_name}" is already used in this tournament with a different ID`
				);
			}
		}

		// Check player2 name/ID consistency
		if (playerNameToId.has(player2_name)) {
			const existingId = playerNameToId.get(player2_name);
			// If player had an ID before, it must match; or both must be null (local players)
			if (existingId !== player2_id) {
				throw new CustomError.BadRequestError(
					`Player name "${player2_name}" is already used in this tournament with a different ID`
				);
			}
		}

		return {
			player1_name: finalPlayer1Name,
			player2_name: finalPlayer2Name,
		};
	};

	// Define tournament completion check function
	const checkTournamentComplete = async (tournamentId) => {
		const tournament = await tournamentModel.getTournament(tournamentId);
		if (!tournament) {
			throw new CustomError.NotFoundError(
				`No tournament with id ${tournamentId}`
			);
		}

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

		return {
			isComplete: matchCount >= maxMatches,
			currentMatchCount: matchCount,
			maxMatches: maxMatches,
			remainingMatches: Math.max(0, maxMatches - matchCount),
		};
	};

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
				matches,
				tournamentStatus: await checkTournamentComplete(tournamentId),
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

					const tournamentStatus = await checkTournamentComplete(
						tournament.id
					);

					return {
						id: tournament.id,
						player_capacity: tournament.player_capacity,
						created_at: tournament.created_at,
						updated_at: tournament.updated_at,
						match_count: matchCount,
						participants: Array.from(participantNames),
						isComplete: tournamentStatus.isComplete,
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

			// Check if tournament is already complete
			const tournamentStatus = await checkTournamentComplete(
				tournamentId
			);
			if (tournamentStatus.isComplete) {
				throw new CustomError.BadRequestError(
					`Tournament is already complete with ${tournamentStatus.currentMatchCount} matches`
				);
			}

			// Get existing matches to check for real players
			const existingMatches = await matchModel.getTournamentMatches(
				tournamentId
			);
			const currentMatchCount = existingMatches.length;

			// Determine if we're creating the match that completes the kickoff stage
			// For 4-player tournaments, the 2nd match completes the kickoff (indexes 0-1)
			// For 8-player tournaments, the 4th match completes the kickoff (indexes 0-3)
			const isCompletingKickoffStage =
				(tournament.player_capacity === 4 && currentMatchCount === 1) ||
				(tournament.player_capacity === 8 && currentMatchCount === 3);

			// If we're completing the kickoff stage, check for at least one real player
			if (isCompletingKickoffStage) {
				// Check if any player in existing matches is a real player (has an ID)
				const hasRealPlayerInExistingMatches = existingMatches.some(
					(match) =>
						match.player1_id !== null || match.player2_id !== null
				);

				// Check if any player in current match is a real player
				const hasRealPlayerInCurrentMatch =
					player1_id !== null || player2_id !== null;

				// If no real players in existing or current match, reject
				if (
					!hasRealPlayerInExistingMatches &&
					!hasRealPlayerInCurrentMatch
				) {
					throw new CustomError.BadRequestError(
						`Tournament must have at least one authenticated player by the end of the kickoff round`
					);
				}
			}

			// Use tournament-specific validation
			const {
				player1_name: finalPlayer1Name,
				player2_name: finalPlayer2Name,
			} = await validateAndPrepareTournamentPlayers(
				tournamentId,
				currentUserId,
				player1_id,
				player2_id,
				player1_name,
				player2_name
			);

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

		// Check if a tournament is complete (has the maximum number of matches)
		getTournamentStatus: async (tournamentId) => {
			return checkTournamentComplete(tournamentId);
		},
	};
};
