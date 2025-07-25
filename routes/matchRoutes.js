const {
	createMatchOpts,
	updateMatchOpts,
	listUserMatchesOpts,
} = require("../schemas/matchSchemas");

async function matchRoutes(fastify, options) {
	const { matchModel, teamModel, userModel } = options;
	const { createMatch, updateMatchResult } =
		require("../controllers/matchController")(matchModel, teamModel, userModel);

	fastify.post(
		"/",
		{
			preHandler: fastify.authenticate,
			schema: createMatchOpts.schema,
		},
		createMatch
	);

	fastify.patch(
		"/:matchId",
		{
			preHandler: fastify.authenticate,
			schema: updateMatchOpts.schema,
		},
		updateMatchResult
	);
}

module.exports = matchRoutes;
