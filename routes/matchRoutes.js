const {
	createMatchOpts,
	updateMatchOpts,
	listUserMatchesOpts,
} = require("../schemas/matchSchemas");

async function matchRoutes(fastify, options) {
	const { matchModel } = options;
	const { createMatch, updateMatchResult } =
		require("../controllers/matchController")(matchModel);

	fastify.post(
		"/",
		{
			preHandler: fastify.authenticate,
			schema: createMatchOpts.schema,
		},
		createMatch
	);

	fastify.patch(
		"/",
		{
			preHandler: fastify.authenticate,
			schema: updateMatchOpts.schema,
		},
		updateMatchResult
	);
}

module.exports = matchRoutes;
