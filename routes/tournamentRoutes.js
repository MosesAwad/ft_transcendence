const {
	createTournamentOpts,
	getTournamentOpts,
	createTournamentMatchOpts,
	updateTournamentMatchOpts,
	listTournamentsOpts,
} = require("../schemas/tournamentSchemas");

async function tournamentRoutes(fastify, options) {
	const { tournamentModel, matchModel, userModel } = options;
	const {
		createTournament,
		getTournament,
		listTournaments,
		createTournamentMatch,
		updateTournamentMatch,
	} = require("../controllers/tournamentController")(
		tournamentModel,
		matchModel,
		userModel
	);

	// Create a new tournament
	fastify.post(
		"/",
		{
			preHandler: fastify.authenticate,
			schema: createTournamentOpts.schema,
		},
		createTournament
	);

	// Get a specific tournament with its matches
	fastify.get(
		"/:tournamentId",
		{
			preHandler: fastify.authenticate,
			schema: getTournamentOpts.schema,
		},
		getTournament
	);

	// List all tournaments
	fastify.get(
		"/",
		{
			preHandler: fastify.authenticate,
			schema: listTournamentsOpts.schema,
		},
		listTournaments
	);

	// Create a match within a tournament
	fastify.post(
		"/:tournamentId/matches",
		{
			preHandler: fastify.authenticate,
			schema: createTournamentMatchOpts.schema,
		},
		createTournamentMatch
	);

	// Update a match within a tournament
	fastify.patch(
		"/:tournamentId/matches/:matchId",
		{
			preHandler: fastify.authenticate,
			schema: updateTournamentMatchOpts.schema,
		},
		updateTournamentMatch
	);
}

module.exports = tournamentRoutes;
