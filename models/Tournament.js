const CustomError = require("../errors");

class Tournament {
	constructor(db) {
		this.db = db;
	}

	async createTournament(player_capacity = 4) {
		const [tournament] = await this.db("tournaments")
			.insert({
				player_capacity,
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

		// Get all matches associated with this tournament
		const matches = await this.db("matches")
			.where({ tournament_id: tournamentId })
			.orderBy("created_at", "asc");

		return {
			...tournament,
			matches,
		};
	}

	async listTournaments() {
		const tournaments = await this.db("tournaments")
			.select("*")
			.orderBy("created_at", "desc");

		// For each tournament, get the count of matches
		const tournamentsWithCounts = await Promise.all(
			tournaments.map(async (tournament) => {
				const [{ count }] = await this.db("matches")
					.where({ tournament_id: tournament.id })
					.count();

				return {
					...tournament,
					match_count: parseInt(count),
				};
			})
		);

		return tournamentsWithCounts;
	}
}

module.exports = Tournament;
