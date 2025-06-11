const { createGameOpts, updateGameOpts } = require("../schemas/gameSchemas");

async function gameRoutes(fastify, options) {
    const { matchModel } = options;
	const {
		createGame,
		updateGameResult,
	} = require("../controllers/gameController")(matchModel);

	fastify.post(
		"/",
		{
			preHandler: fastify.authenticate,
			schema: createGameOpts.schema,
		},
		createGame
	);

	fastify.patch(
		"/",
		{
			preHandler: fastify.authenticate,
			schema: updateGameOpts.schema,
		},
		updateGameResult
	);
}

module.exports = gameRoutes;
