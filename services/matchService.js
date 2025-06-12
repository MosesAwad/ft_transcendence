const CustomError = require("../errors");

module.exports = (matchModel, userModel) => ({
	validateAndPrepareMatchPlayers: async ({
		player1_id,
		player2_id,
		player1_name,
		player2_name,
		currentUserId,
	}) => {
		// Determine if current user is player1 or player2
		let otherPlayerName;

		if (player1_name === player2_name) {
			throw new CustomError.BadRequestError(
				"Player names cannot be the same"
			);
		}
		if (player1_id === currentUserId) {
			// Verify player1_name matches user's username
			const user = await userModel.findById(currentUserId);
			if (!user || user.username !== player1_name) {
				throw new CustomError.BadRequestError(
					"Player 1 name does not match user's username"
				);
			}
			// Validate and prepare player2's name
			if (player2_name.includes(" ")) {
				throw new CustomError.BadRequestError(
					"Player 2 name cannot contain spaces"
				);
			}
			otherPlayerName = `${player2_name} (local)`;
			return { player1_name, player2_name: otherPlayerName };
		} else if (player2_id === currentUserId) {
			// Verify player2_name matches user's username
			const user = await userModel.findById(currentUserId);
			if (!user || user.username !== player2_name) {
				throw new CustomError.BadRequestError(
					"Player 2 name does not match user's username"
				);
			}
			// Validate and prepare player1's name
			if (player1_name.includes(" ")) {
				throw new CustomError.BadRequestError(
					"Player 1 name cannot contain spaces"
				);
			}
			otherPlayerName = `${player1_name} (local)`;
			return { player1_name: otherPlayerName, player2_name };
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
