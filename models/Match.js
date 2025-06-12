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

	async listUserMatches(userId, limit = 10, offset = 0) {
		const user = await this.db("users").where({ id: userId }).first();

		if (!user) {
			throw new CustomError.NotFoundError(`No user with id ${userId}`);
		}

		const matches = await this.db("matches")
			.where(function () {
				this.where("player1_name", user.username).orWhere(
					"player2_name",
					user.username
				);
			})
			.orderBy("created_at", "desc")
			.limit(limit)
			.offset(offset);

		const total = await this.db("matches")
			.where(function () {
				this.where("player1_name", user.username).orWhere(
					"player2_name",
					user.username
				);
			})
			.count("* as count")
			.first();

		return {
			matches,
			total: total.count,
			limit,
			offset,
		};
	}
}

module.exports = Match;
