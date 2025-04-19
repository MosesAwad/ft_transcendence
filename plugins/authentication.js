const fp = require("fastify-plugin");
const { UnauthenticatedError } = require("../errors");

async function authenticate(request, reply) {
	const { accessToken } = request.cookies;
	if (!accessToken) {
		throw new UnauthenticatedError("Access token missing");
	}
	try {
		await request.jwtVerify();
	} catch (err) {
		console.log(err);
		throw new UnauthenticatedError("Authentication invalid");
	}
}

module.exports = fp(async (fastify) => {
	fastify.decorate("authenticate", authenticate);
});

// module.exports = fp(async (fastify) => {
// 	fastify.addHook("preHandler", authenticate);
// });

/*
	NOTES

	Note 1
		For your convenience, request.jwtVerify() will look for the token in the cookies property of the decorated request (see Ref 1). But for 
		that to work, you need to have registered the @fastify/jwt instance (done in the beginning of launching your app) with the cookie option.
		Verify JWT using fastify-jwt; the decoded payload is automatically attached to request.user by @fastify/jwt (no manual decoding needed).

	Note 2

		You should add your authenticate function to a preHandler hook, not onRequest.
		Why?
			* onRequest runs before cookies are parsed.
			* preHandler runs after cookies and body have been parsed, and before your actual handler.
			* Since request.cookies and request.jwtVerify({ cookie: ... }) depend on the cookies being parsed, preHandler is the right spot.
*/

/*
	REFERENCES

	Ref 1 - https://github.com/fastify/fastify-jwt?tab=readme-ov-file#fastifyjwtcookie
*/
