const CustomError = require("../errors");

module.exports = (matchModel, teamModel, userModel) => {
	return {
		createMultiplayerMatch: async ({
			team1_name,
			team2_name,
			players,
			currentUserId,
		}) => {
			// Helper function to validate team names
			const validateTeamNames = () => {
				if (!team1_name || !team2_name) {
					throw new CustomError.BadRequestError(
						"Team names are required"
					);
				}

				if (team1_name === team2_name) {
					throw new CustomError.BadRequestError(
						"Team names must be different"
					);
				}
			};

			// Helper function to validate player count and authorization
			const validatePlayersBasics = () => {
				if (
					!players ||
					!Array.isArray(players) ||
					players.length !== 4
				) {
					throw new CustomError.BadRequestError(
						"Exactly 4 players (2 per team) are required for multiplayer matches"
					);
				}

				// Check that there's exactly one real player in the match (currentUser)
				const realPlayerCount = players.filter(
					(p) => p.user_id === currentUserId
				).length;
				if (realPlayerCount !== 1) {
					throw new CustomError.BadRequestError(
						"Exactly one player must be the current user in multiplayer matches"
					);
				}

				// Ensure non-authenticated players have null user_id
				for (const player of players) {
					if (player.user_id && player.user_id !== currentUserId) {
						throw new CustomError.UnauthorizedError(
							"Only the current user's ID should be provided, impersonating other users is forbidden"
						);
					}
				}
			};

			// Helper function to check for duplicate player names
			const validatePlayerNames = () => {
				const playerNames = players.map((p) => p.name);
				const uniqueNames = new Set(playerNames);
				if (uniqueNames.size !== players.length) {
					throw new CustomError.BadRequestError(
						"Player names must be unique across the entire match"
					);
				}

				// Validate individual player names
				for (const player of players) {
					if (!player.name) {
						throw new CustomError.BadRequestError(
							"All players must have names"
						);
					}

					if (player.name.includes(" ")) {
						throw new CustomError.BadRequestError(
							"Player names cannot contain spaces"
						);
					}
				}
			};

			// Helper function to validate authenticated player username matches
			const validateAuthenticatedPlayer = async () => {
				for (const player of players) {
					if (player.user_id) {
						const user = await userModel.findById(player.user_id);
						if (!user || user.username !== player.name) {
							throw new CustomError.BadRequestError(
								"Player name does not match user's username"
							);
						}
					}
				}

				const authenticatedPlayer = players.find(
					(p) => p.user_id === currentUserId
				);
				if (!authenticatedPlayer) {
					throw new CustomError.BadRequestError(
						"Could not find the authenticated player in the players list"
					);
				}

				return authenticatedPlayer;
			};

			// Helper function to validate team structure
			const validateTeamStructure = () => {
				const team1Players = players.filter((p) => p.team === 1);
				const team2Players = players.filter((p) => p.team === 2);

				if (team1Players.length !== 2 || team2Players.length !== 2) {
					throw new CustomError.BadRequestError(
						"Each team must have exactly 2 players"
					);
				}

				return { team1Players, team2Players };
			};

			// Helper function to create the match and teams
			const createMatchAndTeams = async (authenticatedPlayer) => {
				// Create match with proper player info
				const match = await matchModel.createMatch({
					player1_id: currentUserId,
					player2_id: null,
					player1_name: authenticatedPlayer.name,
					player2_name: "N/A", // As per requirement for multiplayer
					match_type: "multiplayer",
				});

				// Create teams
				const team1 = await teamModel.createTeam({
					name: team1_name,
					match_id: match.id,
				});

				const team2 = await teamModel.createTeam({
					name: team2_name,
					match_id: match.id,
				});

				return { match, team1, team2 };
			};

			// Helper function to add players to teams
			const addPlayersToTeams = async (
				team1Players,
				team2Players,
				team1,
				team2
			) => {
				// Add players to team 1
				for (const player of team1Players) {
					const playerName =
						player.user_id === currentUserId
							? player.name
							: `${player.name} (local)`;

					await teamModel.addPlayerToTeam({
						team_id: team1.id,
						user_id:
							player.user_id === currentUserId
								? player.user_id
								: null,
						player_name: playerName,
					});
				}

				// Add players to team 2
				for (const player of team2Players) {
					const playerName =
						player.user_id === currentUserId
							? player.name
							: `${player.name} (local)`;

					await teamModel.addPlayerToTeam({
						team_id: team2.id,
						user_id:
							player.user_id === currentUserId
								? player.user_id
								: null,
						player_name: playerName,
					});
				}
			};

			validateTeamNames(); // Step 1: Validate team names
			validatePlayersBasics(); // Step 2: Validate player count and authorization
			validatePlayerNames(); // Step 3: Validate player names

			const authenticatedPlayer = await validateAuthenticatedPlayer(); // Step 4: Validate authenticated player and get their info
			const { team1Players, team2Players } = validateTeamStructure(); // Step 5: Validate team structure and get players by team
			
            // Step 6: Create match and teams
            const { match, team1, team2 } = await createMatchAndTeams(
				authenticatedPlayer
			);

            // Step 7: Add players to teams
			await addPlayersToTeams(team1Players, team2Players, team1, team2);

			// Step 8: Get full match with teams and players
			const teams = await teamModel.getTeamsByMatchId(match.id);
			match.teams = teams;

			return match;
		},

		finalizeMultiplayerMatch: async (
			matchId,
			team1_score,
			team2_score,
			currentUserId
		) => {
			// Check if match exists and is multiplayer
			const match = await matchModel.getMatch(matchId);
			if (!match) {
				throw new CustomError.NotFoundError(
					`No match with id ${matchId}`
				);
			}

			if (match.match_type !== "multiplayer") {
				throw new CustomError.BadRequestError(
					"This endpoint is only for multiplayer matches"
				);
			}

			if (match.status === "finished") {
				throw new CustomError.BadRequestError(
					"Match has already been finalized"
				);
			}

			// Check if current user is part of this match
			const teams = await teamModel.getTeamsByMatchId(matchId);
			let isAuthorized = false;

			for (const team of teams) {
				for (const player of team.players) {
					if (player.user_id === currentUserId) {
						isAuthorized = true;
						break;
					}
				}
				if (isAuthorized) break;
			}

			if (!isAuthorized) {
				throw new CustomError.UnauthorizedError(
					"You are not authorized to finalize this match"
				);
			}

			// Update team scores
			if (teams.length !== 2) {
				throw new CustomError.BadRequestError(
					"Invalid multiplayer match structure"
				);
			}

			await teamModel.updateTeamScore(teams[0].id, team1_score);
			await teamModel.updateTeamScore(teams[1].id, team2_score);

			// Update match status
			const [updatedMatch] = await matchModel
				.db("matches")
				.where({ id: matchId })
				.update({
					status: "finished",
					updated_at: matchModel.db.fn.now(),
				})
				.returning("*");

			updatedMatch.teams = [
				{ ...teams[0], score: team1_score },
				{ ...teams[1], score: team2_score },
			];

			return updatedMatch;
		},

		listUserMultiplayerMatches: async (userId, limit, page) => {
			const user = await userModel.findById(userId);
			if (!user) {
				throw new CustomError.NotFoundError(
					`No user with id ${userId}`
				);
			}

			const multiplayer_matches =
				await matchModel.listUserMultiplayerMatches(
					userId,
					limit,
					page
				);

			for (const multiplayer_match of multiplayer_matches) {
				// Get teams for each match
				const matchTeams = await teamModel.getTeamsByMatchId(
					multiplayer_match.id
				);
				if (matchTeams.length !== 2) continue;

				multiplayer_match.teams = matchTeams;
			}

			return multiplayer_matches;
		},

		getUserMultiplayerStats: async (userId) => {
			const user = await userModel.findById(userId);
			if (!user) {
				throw new CustomError.NotFoundError(
					`No user with id ${userId}`
				);
			}

			// Find all multiplayer matches where the user participated
			const teamPlayers = await teamModel
				.db("team_players")
				.where({ user_id: userId })
				.select("team_id");

			const teamIds = teamPlayers.map((tp) => tp.team_id);

			if (teamIds.length === 0) {
				return {
					totalGames: 0,
					cancelledGames: 0,
					wins: 0,
					losses: 0,
				};
			}

			// Get all teams for this user
			const teams = await teamModel
				.db("teams")
				.whereIn("id", teamIds)
				.select("id", "match_id", "score");

			const matchIds = teams.map((t) => t.match_id);

			// Get all matches
			const matches = await matchModel
				.db("matches")
				.whereIn("id", matchIds)
				.where({ match_type: "multiplayer" });

			// Calculate stats
			const stats = {
				totalGames: matches.length,
				cancelledGames: matches.filter((m) => m.status === "cancelled")
					.length,
				wins: 0,
				losses: 0,
			};

			// For finished matches, determine if user's team won
			const finishedMatches = matches.filter(
				(m) => m.status === "finished"
			);

			for (const match of finishedMatches) {
				// Get all teams for this match
				const matchTeams = await teamModel.getTeamsByMatchId(match.id);
				if (matchTeams.length !== 2) continue;

				// Find the user's team
				const userTeam = matchTeams.find((t) =>
					t.players.some((p) => p.user_id === userId)
				);

				if (!userTeam) continue;

				// Find the opponent team
				const opponentTeam = matchTeams.find(
					(t) => t.id !== userTeam.id
				);

				// Determine if user's team won
				if (userTeam.score > opponentTeam.score) {
					stats.wins++;
				} else if (userTeam.score < opponentTeam.score) {
					stats.losses++;
				}
				// Equal scores don't count as win or loss
			}

			return stats;
		},
	};
};
