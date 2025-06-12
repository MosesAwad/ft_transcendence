const CustomError = require("../errors");

module.exports = (matchModel, userModel) => ({
	validateAndPrepareMatchPlayers: async ({
		player1_id,
		player2_id,
		player1_name,
		player2_name,
		currentUserId,
		match_type,
	}) => {
		const validateUsername = async (userId, expectedUsername, label) => {
			const user = await userModel.findById(userId);
			if (!user || user.username !== expectedUsername) {
				throw new CustomError.BadRequestError(
					`${label} name does not match user's username`
				);
			}
		};

		const validateNoSpaces = (name, label) => {
			if (name.includes(" ")) {
				throw new CustomError.BadRequestError(
					`${label} name cannot contain spaces`
				);
			}
		};

		if (match_type === "1vAi") {
			if (player1_id !== currentUserId) {
				throw new CustomError.BadRequestError(
					"Player1 must be the current user in 1vAi matches"
				);
			}
			await validateUsername(currentUserId, player1_name, "Player 1");
			return {
				player1_name,
				player2_name: "AI bot",
			};
		}
		if (player1_id && player2_id) {
			throw new CustomError.UnauthorizedError(
				"Only the current user's ID should be provided, impersonating other users is forbidden"
			);
		}
		if (player1_name === player2_name) {
			throw new CustomError.BadRequestError(
				"Player names cannot be the same"
			);
		}

		if (player1_id === currentUserId) {
			await validateUsername(currentUserId, player1_name, "Player 1");
			validateNoSpaces(player2_name, "Player 2");
			return {
				player1_name,
				player2_name: `${player2_name} (local)`,
			};
		}

		if (player2_id === currentUserId) {
			await validateUsername(currentUserId, player2_name, "Player 2");
			validateNoSpaces(player1_name, "Player 1");
			return {
				player1_name: `${player1_name} (local)`,
				player2_name,
			};
		}

		throw new CustomError.BadRequestError(
			"Current user must be either player1 or player2, check provided player IDs"
		);
	},

	listUserMatches: async (userId, limit, page, match_type) => {
		// First verify user exists
		const user = await userModel.findById(userId);
		if (!user) {
			throw new CustomError.NotFoundError(`No user with id ${userId}`);
		}

		const matches = await matchModel.listUserMatches(
			user.username,
			limit,
			page,
			match_type
		);
		return matches;
	},
});
