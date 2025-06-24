const CustomError = require("../errors");

class Tournament {
	constructor(db) {
		this.db = db;
	}

	async createTournament(player_capacity = 4, creator_id) {
		const [tournament] = await this.db("tournaments")
			.insert({
				player_capacity,
				creator_id,
			})
			.returning("*");

		return tournament;
	}

	async getTournament(tournamentId) {
		const tournament = await this.db("tournaments")
			.where({ id: tournamentId })
			.first();

		if (!tournament) {
			throw new CustomError.NotFoundError(
				`No tournament with id ${tournamentId}`
			);
		}

		return tournament;
	}

	async listTournaments() {
		const tournaments = await this.db("tournaments")
			.select("*")
			.orderBy("created_at", "desc");

		return tournaments;
	}
}

module.exports = Tournament;
