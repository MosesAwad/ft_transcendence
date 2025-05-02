require("dotenv").config();
const fastify = require("fastify")({
	// logger: true,
	logger: {
		level: "error",
	},
});
const path = require("path");
const connectDB = require("./connect/connect");
const authRoutes = require("./routes/authRoutes");
const friendRoutes = require("./routes/friendRoutes");
const userRoutes = require("./routes/userRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const User = require("./models/User");
const Token = require("./models/Token");
const Friend = require("./models/Friend");
const Notification = require("./models/Notification");
const fastifyCookie = require("@fastify/cookie");
const fastifyJwt = require("@fastify/jwt");
const fastifyStatic = require("@fastify/static");

// socket dependencies
const socketIo = require("socket.io");
const {
	handleSocketConnection,
	onlineUsers,
} = require("./sockets/connectionHandler");

const start = async () => {
	try {
		// 1. Connect to DB
		const db = connectDB("application");
		console.log("Database connected");

		// 2. Initiliaze models
		const userModel = new User(db);
		const friendModel = new Friend(db);
		const tokenModel = new Token(db);
		const notificationModel = new Notification(db);

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

		// 4. Set up Socket.io
		const io = socketIo(fastify.server); // Attach Socket.io to Fastify's server instance
		handleSocketConnection(io);

		setInterval(() => {
			console.log(onlineUsers);
		}, 5000);

		// 5. Register routes
		fastify.register(authRoutes, {
			userModel,
			tokenModel,
			prefix: "/api/v1/auth",
		});
		fastify.register(friendRoutes, {
			friendModel,
			notificationModel,
			io,
			onlineUsers,
			prefix: "/api/v1/friendships",
		});
		fastify.register(userRoutes, { userModel, prefix: "/api/v1/users" });
		fastify.register(notificationRoutes, {
			notificationModel,
			prefix: "/api/v1/notifications",
		});

		// 6. Start server with dual-stack support
		const address = await fastify.listen({
			port: 3000,
			host: "0.0.0.0", // Only IPv4
		});
		console.log("Server running on ", address);

		setInterval(() => {
			console.log(onlineUsers);
		}, 5000);
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
