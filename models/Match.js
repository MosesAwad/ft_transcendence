const CustomError = require("../errors");

class Match {
	constructor(db) {
		this.db = db;
	}

	async createMatch({
		player1_id,
		player2_id,
		player1_name,
		player2_name,
		match_type,
	}) {
		const [match] = await this.db("matches")
			.insert({
				player1_id,
				player2_id,
				player1_name,
				player2_name,
				match_type,
			})
			.returning("*");

		return match;
	}

	async finalizeMatch(matchId, player1_score, player2_score, currentUserId) {
		const match = await this.db("matches").where({ id: matchId }).first();
		if (!match) {
			throw new CustomError.NotFoundError(`No match with id ${matchId}`);
		}

		if (match.match_type === "multiplayer") {
			// For multiplayer, authorization check is done in the teamService
			throw new CustomError.BadRequestError(
				"Multiplayer matches should be finalized through the match endpoint with is_multiplayer=true"
			);
		}

		if (
			match.player1_id !== currentUserId &&
			match.player2_id !== currentUserId
		) {
			throw new CustomError.UnauthorizedError(
				"You are not authorized to patch this match's results"
			);
		}

		if (match.status === "finished") {
			throw new CustomError.BadRequestError(
				"Match has already been finalized"
			);
		}

		const [updatedMatch] = await this.db("matches")
			.where({ id: matchId })
			.update({
				player1_score,
				player2_score,
				status: "finished",
			})
			.returning("*");

		return updatedMatch;
	}

	async getMatch(matchId) {
		const match = await this.db("matches").where({ id: matchId }).first();

		if (!match) {
			throw new CustomError.NotFoundError(`No match with id ${matchId}`);
		}

		return match;
	}

	async listUserNonMultiplayerMatches(username, limit, page, match_type) {
		const query = this.db("matches").where(function () {
			this.where("player1_name", username).orWhere(
				"player2_name",
				username
			);
		});

		// Always exclude multiplayer matches
		query.andWhereNot("match_type", "multiplayer");

		// Apply match_type filter if given (but still excluding "multiplayer")
		if (match_type && match_type !== "multiplayer") {
			query.andWhere("match_type", match_type);
		}

		const matches = await query
			.orderBy("created_at", "desc")
			.limit(limit)
			.offset((page - 1) * limit);

		return matches;
	}

	// Helper function for tournamentService
	async getTournamentMatches(tournamentId) {
		const matches = await this.db("matches")
			.where({ tournament_id: tournamentId })
			.orderBy("created_at", "asc");

		return matches;
	}

	// Helper function for teamService
	async listUserMultiplayerMatches(userId, limit, page) {
		const multiplayerMatches = await this.db("matches")
			.select(
				"id",
				"status",
				"match_type",
				"tournament_id",
				"created_at",
				"updated_at"
			)
			.where(function () {
				this.where("player1_id", userId).orWhere("player2_id", userId);
			})
			.andWhere({ match_type: "multiplayer" })
			.orderBy("created_at", "desc")
			.limit(limit)
			.offset((page - 1) * limit);

		return multiplayerMatches;
	}
}

module.exports = Match;
