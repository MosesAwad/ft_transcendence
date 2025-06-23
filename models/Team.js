const CustomError = require("../errors");

class Team {
	constructor(db) {
		this.db = db;
	}

	async createTeam({ name, match_id }) {
		const [team] = await this.db("teams")
			.insert({
				name,
				match_id,
			})
			.returning("*");

		return team;
	}

	async addPlayerToTeam({ team_id, user_id, player_name }) {
		const [teamPlayer] = await this.db("team_players")
			.insert({
				team_id,
				user_id,
				player_name,
			})
			.returning("*");

		return teamPlayer;
	}

	async getTeamWithPlayers(teamId) {
		const team = await this.db("teams")
			.where({ id: teamId })
			.select("id", "name", "score", "match_id") // Exclude timestamps
			.first();

		if (!team) {
			throw new CustomError.NotFoundError(`No team with id ${teamId}`);
		}

		const players = await this.db("team_players")
			.where({ team_id: teamId })
			.select("user_id", "player_name"); // Only select needed fields, exclude id

		team.players = players;
		return team;
	}

	async updateTeamScore(teamId, score) {
		const [updatedTeam] = await this.db("teams")
			.where({ id: teamId })
			.update({ score })
			.returning("*");

		return updatedTeam;
	}

	async getTeamsByMatchId(matchId) {
		const teams = await this.db("teams")
			.where({ match_id: matchId })
			.select("id", "name", "score", "match_id"); // Exclude timestamps

		for (let team of teams) {
			team.players = await this.db("team_players")
				.where({ team_id: team.id })
				.select("user_id", "player_name"); // Only select needed fields, exclude id
		}

		return teams;
	}
}

module.exports = Team;
