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
		const [match] = await this.db("matches")
			.insert({
				player1_id,
				player2_id,
				player1_name,
				player2_name,
				match_type,
				tournament_id,
			})
			.returning("*");

		return match;
	}

	async finalizeMatch(matchId, player1_score, player2_score) {
		const match = await this.db("matches").where({ id: matchId }).first();

		if (!match) {
			throw new CustomError.NotFoundError(`No match with id ${matchId}`);
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
}

module.exports = Match;
