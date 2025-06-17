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
		tournament_id = null,
	}) {
		// // Reject tournament matches - should use tournament route instead
		// if (tournament_id) {
		// 	throw new CustomError.BadRequestError(
		// 		"Tournament matches should be created through /api/v1/tournaments/:tournamentId/matches endpoint"
		// 	);
		// }

		// // Reject tournament match_type - should use tournament route instead
		// if (match_type === "tournament") {
		// 	throw new CustomError.BadRequestError(
		// 		"Tournament matches should be created through /api/v1/tournaments/:tournamentId/matches endpoint"
		// 	);
		// }

		const [match] = await this.db("matches")
			.insert({
				player1_id,
				player2_id,
				player1_name,
				player2_name,
				match_type,
				tournament_id
			})
			.returning("*");

		return match;
	}

	async finalizeMatch(matchId, player1_score, player2_score, currentUserId) {
		const match = await this.db("matches").where({ id: matchId }).first();
		if (!match) {
			throw new CustomError.NotFoundError(`No match with id ${matchId}`);
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

	async listUserMatches(username, limit, page, match_type) {
		const query = this.db("matches").where(function () {
			this.where("player1_name", username).orWhere(
				"player2_name",
				username
			);
		});

		if (match_type) {
			query.andWhere({ match_type });
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
}

module.exports = Match;
