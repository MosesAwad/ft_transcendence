const { StatusCodes } = require("http-status-codes");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const CustomError = require("../errors");
const { ref } = require("process");

/*
	INSTRUCTIONS FOR FRONT-END:

	1*	The front-end should generate a deviceId upon log-in page load and save it in local storage. If one already exists, it 
		should not create a new one. 
*/

const createPayload = (user) => {
	return {
		id: user.id,
		username: user.username,
	};
};

const createJWT = (fastify, payload, expiresIn) => {
	return fastify.jwt.sign(payload, { expiresIn }); // payload must be an object (fastify.jwt.sign automatically adds iat and exp timestamps)
};

/*
	5m | new Date(Date.now() + 5 * 60 * 1000)
	1d | new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
*/
const attachCookiesToReply = (fastify, reply, user, refreshTokenId) => {
	const accessToken = createJWT(fastify, { user }, "1m"); // must match cookie expiration below
	reply.setCookie("accessToken", accessToken, {
		path: "/", // Makes cookie available to ALL routes [see Note 0]
		secure: process.env.NODE_ENV === "production", // Must match plugin config
		sameSite: "lax", // Basic CSRF protection
		httpOnly: true, // Must match plugin config
		signed: true, // Must match plugin config
		expires: new Date(Date.now() + 1 * 60 * 1000), // When the browser deletes the cookie, set it up to match JWT expiration above
	});

	const refreshToken = createJWT(fastify, { user, refreshTokenId }, "5m"); // must match cookie expriation below
	reply.setCookie("refreshToken", refreshToken, {
		path: "/api/v1/auth/refresh", // Makes cookie available to ALL routes
		secure: process.env.NODE_ENV === "production", // Must match plugin config
		sameSite: "lax", // Basic CSRF protection
		httpOnly: true, // Must match plugin config
		signed: true, // Must match plugin config
		expires: new Date(Date.now() + 5 * 60 * 1000), // When the browser deletes the cookie, set it up to match JWT expiration above
	});
};

module.exports = (userModel, tokenModel, fastify) => ({
	// Note 1
	register: async (request, reply) => {
		const user = await userModel.createUser(request.body);
		// attachCookiesToReply(fastify, reply, user);
		console.log(user);
		reply.send({ user: { id: user.id, username: user.username } });
	},

	login: async (request, reply) => {
		const { email, password, deviceId } = request.body;
		const user = await userModel.findByEmail(email);
		if (!user) {
			throw new CustomError.UnauthenticatedError("Invalid credentials");
		}
		const isPasswordCorrect = await userModel.comparePassword(
			password,
			user.password
		);
		if (!isPasswordCorrect) {
			throw new CustomError.UnauthenticatedError("Invalid credentials");
		}

		const userPayload = createPayload(user);
		console.log("(", user.id, ",", deviceId, ")");
		const existingToken = await tokenModel.findByUserIdAndDeviceId(
			user.id,
			deviceId
		);

		// 👇 Control path: If refresh token exists and specifically for the device the user is trying to log into now
		if (existingToken) {
			// Set old one to invalid
			await tokenModel.invalidateRefreshToken(
				existingToken.refresh_token_id
			); // Note 2
			// Generate a new one
			const refreshTokenId = crypto.randomBytes(40).toString("hex");
			const userAgent = request.headers["user-agent"];
			const ip = request.ip; // ip address of the client who made the request
			const userToken = {
				refreshTokenId,
				ip,
				userAgent,
				userId: user.id,
				deviceId,
			};
			await tokenModel.createRefreshToken(userToken);
			attachCookiesToReply(fastify, reply, userPayload, refreshTokenId); // Note 3
			return reply.send({ user: userPayload });
		}

		/* 
		👇 Control path: 
			1. If refresh token doesn't exist 
			2. exists but for a separate device different from the one the user is trying to log into now
			3. 
		*/
		const refreshTokenId = crypto.randomBytes(40).toString("hex");
		const userAgent = request.headers["user-agent"];
		const ip = request.ip; // ip address of the client who made the request
		const userToken = {
			refreshTokenId,
			ip,
			userAgent,
			userId: user.id,
			deviceId,
		};
		await tokenModel.createRefreshToken(userToken);
		attachCookiesToReply(fastify, reply, userPayload, refreshTokenId);

		reply.send({ user: { id: user.id, username: user.username } });
	},

	googleCallback: async function (request, reply) {
		const { token } =
			await this.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(
				request
			); // 'this' must refer to the fastify instance, NO arrow function here

		// You now have token.access_token, you can fetch user info using it
		const userResponse = await fetch(
			"https://www.googleapis.com/oauth2/v2/userinfo",
			{
				headers: {
					Authorization: `Bearer ${token.access_token}`,
				},
			}
		);
		const userInfo = await userResponse.json();

		reply.send({ message: "Logged in with Google", user: userInfo });
	},

	logout: async (request, reply) => {
		const { deviceId } = request.body;
		const { id: userId } = request.user.user;

		await tokenModel.deleteRefreshToken(userId, deviceId); // Note 4
		reply.setCookie("accessToken", "logout", {
			path: "/",
			httpOnly: true,
			expires: new Date(Date.now()),
		});
		reply.setCookie("refreshToken", "logout", {
			path: "api/v1/auth/refresh",
			httpOnly: true,
			expires: new Date(Date.now()),
		});
		reply.send({
			msg: `User ${request.user.user.username} has been logged out`,
		});
	},

	refresh: async (request, reply) => {
		// Both control paths below involve the access token being invalid (aka no long there due to expiry)
		const { refreshToken } = request.cookies;
		if (!refreshToken) {
			// No refresh token can happen if a client hits our refresh endpoint without having logged in in the first place
			throw new CustomError.UnauthenticatedError(
				"Authentication Invalid"
			);
		}
		const unsignedCookie = request.unsignCookie(refreshToken);
		if (!unsignedCookie.valid) {
			// Note 5
			throw new CustomError.UnauthenticatedError(
				"Authentication Invalid"
			);
		}
		const payload = await fastify.jwt.verify(unsignedCookie.value); // Note 5 (ibid)
		const existingToken = await tokenModel.findByUserIdAndRefreshTokenId(
			payload.user.id,
			payload.refreshTokenId
		);

		const { deviceId } = request.body;
		// 👇 Control path if neither refresh token nor access token can be found, or no access token but refresh token is invalid (admin set it due to malicous behavior) even though present
		if (
			!existingToken ||
			!existingToken?.is_valid ||
			existingToken.device_id !== deviceId // Even if attacker intercepted our refreshToken cookie, he still needs our deviceId (additional layer of security)
		) {
			throw new CustomError.UnauthenticatedError(
				"Authentication Invalid"
			);
		}

		// Set old one to invalid
		await tokenModel.invalidateRefreshToken(existingToken.refresh_token_id);
		// Generate a new one
		const newRefreshTokenId = crypto.randomBytes(40).toString("hex");
		const userAgent = request.headers["user-agent"];
		const ip = request.ip; // ip address of the client who made the request
		const userToken = {
			refreshTokenId: newRefreshTokenId,
			ip,
			userAgent,
			userId: payload.user.id,
			deviceId,
		};
		await tokenModel.createRefreshToken(userToken);

		// 👇 Control path if refresh token is present and valid but access token is no longer valid. In that case, attachCookiesToResponse makes a new access token.
		attachCookiesToReply(fastify, reply, payload.user, newRefreshTokenId);
		reply.send({ msg: "Access token refreshed" });
	},

	errorHandler: (err, request, reply) => {
		let customError = {
			statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
			msg: err.message || "Something went wrong, try again later",
		};

		console.log(err);

		// Handle SQLite UNIQUE constraint violation
		if (err.code === "SQLITE_CONSTRAINT") {
			customError.statusCode = StatusCodes.BAD_REQUEST;
			if (err.message.includes("UNIQUE constraint failed")) {
				const field = err.message.split(":").pop()?.trim(); // 2
				customError.msg = `Duplicate value for field: ${field}`;
			} else {
				customError.msg = "Database constraint violation";
			}
		}

		// Handle deviceId misconfugration message
		if (err.code === "FST_ERR_VALIDATION") {
			if (err.validation[0]?.instancePath === "/deviceId") {
				customError.msg = "deviceId must be in UUID format";
			}
		}
		reply.status(customError.statusCode).send({ error: customError.msg });
	},
});

/*
  Notes

  Note 0
	
	If you don't set the path of the accessToken cookie to "/", and you decide to restrict it to "/api/v1", then 
	sockets from the front-end won't be able to send accessToken cookies because they are trying to connect to 
	http://localhost:3000 and not http://localhost:3000/api/v1. This is how the connection is made on the front-end:
		
		const socket = io("http://localhost:3000", {
			withCredentials: true,
		});

  Note 1

    // Simple sample regular arrow function with return:
    const add = (a, b) => {
      return a + b;
    };

    // Same function using parentheses shorthand (no need for return):
    const addShort = (a, b) => (a + b);

    So the parenthesis scoping the whole module export is shorthand syntax to do this:

      module.exports = (userModel) => ({
        register: async (req, res) => { use userModel here },
        login: async (req, res) => { use userModel here },
        errorHandler: (err, req, res) => { errorHandler logic here }
      });

    instead of this:

      module.exports = (userModel) => {
        return {
          register: async (req, res) => { use userModel here },
          login: async (req, res) => { use userModel here },
          errorHandler: (err, req, res) => { errorHandler logic here }
        }
      };
	
	Note 2

		I know you might be thinking, shouldn't I be filtering by userId and deviceId for this model? Well the answe is no because filteration 
		by userId and deviceId has already been done. Look at how we got the existingToken in the first place, it was obtained with a userId 
		and tokenId combo filter.
	
	Note 3

		Always attach a refreshToken to a response when we hit the login route even if the user already has one. Yes, that would restart 
		the timer on the refreshToken, meaning I now just extended it. That's fine. But you might be thinking, hey, if it's an already 
		existing refresh token, why should I update it everytime the user logs-in. Well, the reason is what if the user manuallyu deletes 
		the cookie containig his refresh token from their browser? In that case, my databse would still say he has one even though on his 
		browser, he actually doesn't. So, to fix that issue, always re-issue a new refresh token once the login endpoint is reached, even 
		if he already has one. In my database though, I still keep the same refreshTokenId for him; so technically it's a new refresh token, 
		but a replica of the older one, all I did was update the updated_at timestamp. This is the best middle-ground to always ensure that 
		a refreshToken stored in my database is paired with an actual refresh token stored in the user's browser.
	
	Note 4

		Since refreshToken is sent only to refreshToken route, I cannot pluck it out form request.cookies here. Now my concern is that since deviceId
		sits in local storage, it can easily be intercepted. So I shouldn't look up the refreshToken and delete it from the db merely by receiving a
		a deviceId; instead, I pair it with userId. That would be much harder to obtain because the userId is stored in a JWT within a cookie, and the 
		cookie is Http-Only, XSS is no longer a threat. As such, only if the pair of userId provided and deviceId provided match an entry in the db, do 
		we proceed to delete the refreshToken from the db.

	Note 5

		Calling request.unsignCookie(cookieValue) returns the following object:

			{
				valid: true or false,         // Whether the signature is valid
				value: 'original_value_here'  // The actual cookie content (unsigned)
			}
		
		Also, @fastify/jwt is so good it automatically bakes "iat" and "exp" into the JWT and so, if an attacker attempts to used an expired refreshToken, 
		fastify.jwt.verify would automatically detect that for us. This is espacially important because sometimes, when the user closes an incongito window 
		without hitting the logout button, his cookie never gets deleted from our database; we lose access to it and its is_valid will always be true. Additionally, 
		if the refreshToken just expires and before logging in again, he lost lost the device id (cleared his localstorage for example), upon log-in, we lost access 
		to the refreshToken that expired and so we never get to invalidate it. That is why we also rely on the expiry date, not just our is_valid boolean, this way 
		we ensure that no replay attack is possible even if the refreshToken somehow got leaked.
*/
