const {
	registerOpts,
	loginOpts,
	logoutOpts,
	refreshOpts,
} = require("../schemas/authSchemas");

async function authRoutes(fastify, options) {
	const { userModel, tokenModel } = options;
	const { errorHandler, register, login, googleCallback, logout, refresh } =
		require("../controllers/authController")(
			userModel,
			tokenModel,
			fastify
		);

	// set the error handler
	fastify.setErrorHandler(errorHandler);

	// set the endpoints
	fastify.post("/register", registerOpts, register);
	fastify.post("/login", loginOpts, login);

	fastify.get("/google/callback", googleCallback.bind(fastify));

	fastify.post(
		"/logout",
		{
			preHandler: fastify.authenticate,
			schema: logoutOpts.schema,
		},
		logout
	);

	fastify.post("/refresh", refreshOpts, refresh);
}

module.exports = authRoutes;

/*
    NOTES

    Note 1
      .pop() → gets " users.email" from the end of that array.
      ?.trim() → this is the optional chaining operator.

      The optional chaining operator ensures that if .pop() 
      returns undefined (like if the array was empty), calling .trim() won't throw an error.
*/
