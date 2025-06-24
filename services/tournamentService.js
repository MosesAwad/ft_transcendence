const CustomError = require("../errors");

module.exports = (tournamentModel, matchModel, userModel) => {
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

		/*
		 * For 4-player tournaments, max 3 matches (semifinal + final)
		 * For 8-player tournaments, max 7 matches (quarterfinal + semifinal + final)
		 */
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

	// Validate real player requirement for tournament matches
	const validateRealPlayerRequirement = async (
		tournamentId,
		player1_id,
		player2_id
	) => {
		const tournament = await tournamentModel.getTournament(tournamentId);
		const existingMatches = await matchModel.getTournamentMatches(
			tournamentId
		);
		const currentMatchCount = existingMatches.length;

		/*
			Determine if we're creating the match that completes the kickoff stage:
				* For 4-player tournaments, the 2nd match completes the kickoff (indexes 0-1)
				* For 8-player tournaments, the 4th match completes the kickoff (indexes 0-3)
		*/
		const isCompletingKickoffStage =
			(tournament.player_capacity === 4 && currentMatchCount === 1) ||
			(tournament.player_capacity === 8 && currentMatchCount === 3);
		// Only perform this validation if we're completing the kickoff stage
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

			// Helper function to validate and prepare tournament players
			const validateAndPrepareTournamentPlayers = async (tournament) => {
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

				// Get existing participants in the tournament to check for duplicates
				const existingMatches = await matchModel.getTournamentMatches(
					tournamentId
				);

				// Create a map to track player names and their IDs for consistency checking
				const playerNameToId = new Map(); // Structure: { playerName: userId }
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

				// Validate no duplicate players within the same round (prevents bracket conflicts)
				const validateSameRoundDuplicates = () => {
					const currentMatchCount = existingMatches.length;

					// Determine current round based on match count and tournament capacity
					let currentRoundMatches = [];

					// 4-player tournament: match 0-1 = kickoff, match 2 = final
					if (tournament.player_capacity === 4) {
						if (currentMatchCount <= 1) {
							currentRoundMatches = existingMatches.slice(0, 2); // We're in kickoff round (matches 0-1)
						} else {
							currentRoundMatches = existingMatches.slice(2, 3); // We're in final round (match 2)
						}
					}
					// 8-player tournament: match 0-3 = kickoff, match 4-5 = semi, match 6 = final
					else if (tournament.player_capacity === 8) {
						if (currentMatchCount <= 3) {
							currentRoundMatches = existingMatches.slice(0, 4); // We're in kickoff round (matches 0-3)
						} else if (currentMatchCount <= 5) {
							currentRoundMatches = existingMatches.slice(4, 6); // We're in semifinal round (matches 4-5)
						} else {
							currentRoundMatches = existingMatches.slice(6, 7); // We're in final round (match 6)
						}
					}

					// Extract all player names from current round (without (local) suffix)
					const currentRoundPlayers = new Set();
					currentRoundMatches.forEach((match) => {
						const player1Clean = match.player1_name.replace(
							" (local)",
							""
						);
						const player2Clean = match.player2_name.replace(
							" (local)",
							""
						);
						currentRoundPlayers.add(player1Clean);
						currentRoundPlayers.add(player2Clean);
					});

					// Check if either of the new players is already in the current round
					if (currentRoundPlayers.has(player1_name)) {
						throw new CustomError.BadRequestError(
							`Player "${player1_name}" is already participating in the current round of this tournament`
						);
					}

					if (currentRoundPlayers.has(player2_name)) {
						throw new CustomError.BadRequestError(
							`Player "${player2_name}" is already participating in the current round of this tournament`
						);
					}
				};

				// Validate player identity consistency across tournament (prevents identity conflicts)
				const validatePlayerIdentityConsistency = () => {
					// Check player1 name/ID consistency
					if (playerNameToId.has(player1_name)) {
						const existingId = playerNameToId.get(player1_name);
						// If player had an ID before, it must match; or both must be null (local players)
						if (existingId !== player1_id) {
							throw new CustomError.BadRequestError(
								`Player name "${player1_name}" is already used in this tournament with a different identity`
							);
						}
					}

					// Check player2 name/ID consistency
					if (playerNameToId.has(player2_name)) {
						const existingId = playerNameToId.get(player2_name);
						// If player had an ID before, it must match; or both must be null (local players)
						if (existingId !== player2_id) {
							throw new CustomError.BadRequestError(
								`Player name "${player2_name}" is already used in this tournament with a different identity`
							);
						}
					}
				};

				// Validate no new participants after kickoff round (prevents late tournament entries)
				const validateNoNewParticipantsAfterKickoff = () => {
					const currentMatchCount = existingMatches.length;

					// Determine if we're past the kickoff round
					const isPastKickoffRound =
						(tournament.player_capacity === 4 &&
							currentMatchCount >= 2) ||
						(tournament.player_capacity === 8 &&
							currentMatchCount >= 4);

					if (isPastKickoffRound) {
						// Get all existing tournament participants
						const existingParticipants = new Set();
						existingMatches.forEach((match) => {
							const player1Clean = match.player1_name.replace(
								" (local)",
								""
							);
							const player2Clean = match.player2_name.replace(
								" (local)",
								""
							);
							existingParticipants.add(player1Clean);
							existingParticipants.add(player2Clean);
						});

						// Check if either new player is not already a tournament participant
						if (!existingParticipants.has(player1_name)) {
							throw new CustomError.BadRequestError(
								`Player "${player1_name}" cannot join the tournament after the kickoff round has ended`
							);
						}

						if (!existingParticipants.has(player2_name)) {
							throw new CustomError.BadRequestError(
								`Player "${player2_name}" cannot join the tournament after the kickoff round has ended`
							);
						}
					}
				};

				// Run validations
				validateSameRoundDuplicates();
				validatePlayerIdentityConsistency();
				validateNoNewParticipantsAfterKickoff();

				// Validate authenticated users (if any)
				const validateAuthUser = async (
					userId,
					providedName,
					label
				) => {
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

				// Helper function to process and validate individual players
				const processPlayer = async (
					playerId,
					playerName,
					playerLabel
				) => {
					if (playerId === currentUserId) {
						// Current user, validate username
						await validateAuthUser(
							playerId,
							playerName,
							playerLabel
						);
						return playerName;
					} else if (playerId) {
						// Another user ID was provided, which is not allowed
						throw new CustomError.UnauthorizedError(
							"Only the current user's ID should be provided, impersonating other users is forbidden"
						);
					} else {
						// Local player, add (local) suffix
						return `${playerName} (local)`;
					}
				};

				// Process both players
				const finalPlayer1Name = await processPlayer(
					player1_id,
					player1_name,
					"Player 1"
				);
				const finalPlayer2Name = await processPlayer(
					player2_id,
					player2_name,
					"Player 2"
				);

				return {
					player1_name: finalPlayer1Name,
					player2_name: finalPlayer2Name,
				};
			};

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

			// Validate the real player requirement (makes sure that there is at least one real player per tournament)
			await validateRealPlayerRequirement(
				tournamentId,
				player1_id,
				player2_id
			);

			// Validate and prepare tournament players
			const {
				player1_name: finalPlayer1Name,
				player2_name: finalPlayer2Name,
			} = await validateAndPrepareTournamentPlayers(tournament);

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

		// Update a tournament match
		updateTournamentMatch: async (
			tournamentId,
			matchId,
			currentUserId,
			player1_score,
			player2_score
		) => {
			// Get the tournament
			const tournament = await tournamentModel.getTournament(
				tournamentId
			);
			if (!tournament) {
				throw new CustomError.NotFoundError(
					`No tournament with id ${tournamentId}`
				);
			}

			// Check if the current user is the tournament creator
			if (tournament.creator_id !== currentUserId) {
				throw new CustomError.UnauthorizedError(
					"Only the tournament creator can update tournament matches"
				);
			}

			// Get the match
			const match = await matchModel.getMatch(matchId);
			if (!match) {
				throw new CustomError.NotFoundError(
					`No match with id ${matchId}`
				);
			}

			// Verify the match belongs to this tournament
			if (match.tournament_id !== parseInt(tournamentId)) {
				throw new CustomError.BadRequestError(
					`Match ${matchId} does not belong to tournament ${tournamentId}`
				);
			}

			// Check if match is already finished
			if (match.status === "finished") {
				throw new CustomError.BadRequestError(
					"Match has already been finalized"
				);
			}

			// Update the match
			const [updatedMatch] = await matchModel
				.db("matches")
				.where({ id: matchId })
				.update({
					player1_score,
					player2_score,
					status: "finished",
					updated_at: matchModel.db.fn.now(),
				})
				.returning("*");

			return updatedMatch;
		},
	};
};
