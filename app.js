require("dotenv").config();
const fastify = require("fastify")({
	logger: true,
});
const path = require("path");
const connectDB = require("./connect/connect");
const authRoutes = require("./routes/authRoutes");
const friendRoutes = require("./routes/friendRoutes");
const userRoutes = require("./routes/userRoutes");
const User = require("./models/User");
const Token = require("./models/Token");
const Friend = require("./models/Friend");
const fastifyCookie = require("@fastify/cookie");
const fastifyJwt = require("@fastify/jwt");
const fastifyStatic = require("@fastify/static");

// socket dependencies
const socketIo = require("socket.io");
const crypto = require("crypto");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");

function parseCookies(rawCookieHeader) {
	const cookies = {};
	if (!rawCookieHeader) {
		return cookies; // If no cookies, return empty object
	}

	rawCookieHeader.split(";")?.forEach((cookie) => {
		const [name, ...rest] = cookie.trim().split("=");
		if (!name || rest.length === 0) {
			return;
		}
		cookies[name] = decodeURIComponent(rest.join("="));
	});
	return cookies;
}

function verifySignedCookie(rawCookieHeader, cookieName, secret) {
	const cookies = parseCookies(rawCookieHeader);
	const rawValue = cookies[cookieName];

	if (!rawValue) {
		return null; // No cookie found
	}

	// Fastify signed cookie format: "<jwt>.<signature>"
	const lastDotPos = rawValue.lastIndexOf(".");
	if (lastDotPos === -1) {
		return null;
	}

	const value = rawValue.slice(0, lastDotPos);
	const signature = rawValue.slice(lastDotPos + 1);

	const sigBuf = Buffer.from(signature, "base64"); // This is standard base64 (which JWT uses) NOT base64url, there's a difference
	const expectedSig = crypto
		.createHmac("sha256", secret)
		.update(value)
		.digest("base64"); // ← STOP here
	const expectedBuf = Buffer.from(expectedSig, "base64"); // This is standard base64 (which JWT uses) NOT base64url, there's a difference

	if (sigBuf.length !== expectedBuf.length) {
		return null; // Not valid
	}

	if (crypto.timingSafeEqual(sigBuf, expectedBuf)) {
		return value; // Valid signature
	}
	return null; // tampered or invalid
}

const start = async () => {
	try {
		// 1. Connect to DB
		const db = connectDB("application");
		console.log("Database connected");

		// 2. Initiliaze models
		const userModel = new User(db);
		const friendModel = new Friend(db);
		const tokenModel = new Token(db);

		// 3. Register plugins (Must register fastifyCookie before fastifyJwt)
		fastify.register(fastifyStatic, {
			root: path.join(__dirname, "public"),
			prefix: "/", // Note 1
		});
		fastify.register(fastifyCookie, {
			secret: process.env.COOKIE_SECRET,
		});
		fastify.register(fastifyJwt, {
			secret: process.env.JWT_SECRET,
			cookie: {
				cookieName: "accessToken",
				signed: true,
			},
		});
		fastify.register(require("./plugins/authentication"));

		// 4. Register routes
		fastify.register(authRoutes, {
			userModel,
			tokenModel,
			prefix: "/api/v1/auth",
		});
		fastify.register(friendRoutes, {
			friendModel,
			prefix: "api/v1/friendships",
		});
		fastify.register(userRoutes, { prefix: "api/v1/users" });

		// 5. Set up Socket.io
		const onlineUsers = new Map();

		const io = socketIo(fastify.server); // Attach Socket.io to Fastify's server instance
		io.on("connection", (socket) => {
			const rawCookieHeader = socket.handshake.headers.cookie;
			if (!rawCookieHeader) {
				console.log(
					"No accessToken cookie was fond OR client did not initialize socket with the following option withCredentials: true"
				);
				socket.disconnect();
				return;
			}

			const token = verifySignedCookie(
				rawCookieHeader,
				"accessToken",
				process.env.COOKIE_SECRET
			);
			if (!token) {
				console.log("No accessToken cookie found");
				socket.disconnect();
				return;
			}

			try {
				const payload = jwt.verify(token, process.env.JWT_SECRET);
				const userId = payload.user.id; // or however you structure your JWT

				// You can now map userId to socket.id
				onlineUsers.set(userId, socket.id);
				console.log(
					`User ${userId} connected with socket ${socket.id}`
				);

				// Handle disconnection
				socket.on("disconnect", () => {
					onlineUsers.delete(userId);
					console.log(`User ${userId} disconnected`);
				});
			} catch (err) {
				console.log("Invalid token:", err.message);
				socket.disconnect();
			}
		});

		// 6. Start server
		await fastify.listen({ port: 3000 });
		console.log("Server running on http://localhost:3000");
	} catch (err) {
		console.log(err.message);
		process.exit(1);
	}
};

start();

/*
	NOTES

	Note 1

		What's the point of the prefix?
			* If your frontend expects URLs like /index.html, /styles.css, etc. — use prefix: '/'.
			* If your frontend refers to files like /public/index.html, /public/styles.css — use prefix: '/public/'.
		
		Obviously, the front-end would be using option 1 and thus, we set prefix to '/'. Basically, the prefix depends on 
		how you're referencing assets in your HTML/JS
*/
