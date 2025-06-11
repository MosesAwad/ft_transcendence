const CustomError = require("../errors");

class Match {
	constructor(db) {
		this.db = db;
	}

	async createMatch({
		player1_name,
		player2_name,
		match_type,
		tournament_id = null,
	}) {
		const [match] = await this.db("matches")
			.insert({
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

	async listMatches(filters = {}) {
		const query = this.db("matches");

		if (filters.match_type) {
			query.where({ match_type: filters.match_type });
		}

		if (filters.tournament_id) {
			query.where({ tournament_id: filters.tournament_id });
		}

		if (filters.status) {
			query.where({ status: filters.status });
		}

		const matches = await query.orderBy("created_at", "desc");
		return matches;
	}
}

module.exports = Match;
