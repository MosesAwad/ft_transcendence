require("dotenv").config();
const fastify = require("fastify")({
	logger: {
		level: "error",
		transport: {
			target: "pino-pretty",
			options: {
				colorize: true, // Adds color to the logs
				translateTime: "SYS:standard", // Human-readable timestamp
				ignore: "pid,hostname", // Hide unneeded fields
			},
		},
	},
});

const path = require("path");
const connectDB = require("./connect/connect");
const authRoutes = require("./routes/authRoutes");
const friendRoutes = require("./routes/friendRoutes");
const userRoutes = require("./routes/userRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const chatRoutes = require("./routes/chatRoutes");

const User = require("./models/User");
const Token = require("./models/Token");
const Friend = require("./models/Friend");
const Notification = require("./models/Notification");
const Chat = require("./models/Chat");

const fastifyCookie = require("@fastify/cookie");
const fastifyJwt = require("@fastify/jwt");
const fastifyStatic = require("@fastify/static");
const oauthPlugin = require("@fastify/oauth2");
const multipart = require("@fastify/multipart");

// jobs
const cleanUpTokensJob = require("./jobs/cleanUpTokensJob");

// socket dependencies
const socketIo = require("socket.io");
const {
	handleSocketSetup,
	onlineUsers,
} = require("./sockets/mainSocketSetupHandler");

const start = async () => {
	try {
		// 1. Connect to DB
		const db = connectDB("application");
		console.log("Database connected");

		// 2. Initialize models
		const friendModel = new Friend(db);
		const userModel = new User(db);
		const tokenModel = new Token(db);
		const notificationModel = new Notification(db);
		const chatModel = new Chat(db);

		// 3. Register plugins (Must register fastifyCookie before fastifyJwt and oauthPlugin)
		fastify.register(require("@fastify/cors"), {
			origin: ["http://127.0.0.1:3000"],
			method: ["GET", "POST", "HEAD"],
			credentials: true,
		});
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
		fastify.register(oauthPlugin, {
			name: "googleOAuth2",
			scope: ["profile", "email"], // refers to Google's /auth/userinfo.email and /auth/userinfo.profile
			credentials: {
				client: {
					id: process.env.GOOGLE_CLIENT_ID,
					secret: process.env.GOOGLE_CLIENT_SECRET,
				},
				auth: oauthPlugin.GOOGLE_CONFIGURATION,
			},
			startRedirectPath: process.env.GOOGLE_REDIRECT_PATH, // register a fastify url to start the redirect flow to the service provider's OAuth2 login
			callbackUri: process.env.GOOGLE_CALLBACK_URL, // service provider redirects here after user login
			generateStateFunction: (request) => {
				const state = request.query.state;
				return state;
			},
			checkStateFunction: (request, callback) => {
				if (request.query.state === request.cookies["oauth2_state"]) {
					const base64 = decodeURIComponent(request.query.state);
					const json = Buffer.from(base64, "base64").toString(
						"utf-8"
					);
					const parsed = JSON.parse(json);
					request.deviceId = parsed.deviceId;
					callback();
					return;
				}
				callback(new Error("Invalid state"));
			},
		});
		fastify.register(multipart, {
			limits: {
				fileSize: 5 * 1024 * 1024, // 5MB max file size
				files: 1, // Max one file upload at a time
			},
		});
		fastify.register(require("./plugins/authentication"));

		// 4. Set up Socket.io
		const io = socketIo(fastify.server); // Attach Socket.io to Fastify's server instance
		fastify.decorate("io", io);
		handleSocketSetup(fastify);

		// 5. Initialize services (after Socket.io setup)
		const blockService = require("./services/blockService")(
			userModel,
			friendModel,
			notificationModel,
			io,
			onlineUsers
		);

		// 6. Register routes
		fastify.register(authRoutes, {
			userModel,
			tokenModel,
			prefix: "/api/v1/auth",
		});
		fastify.register(friendRoutes, {
			friendModel,
			notificationModel,
			onlineUsers,
			prefix: "/api/v1/friendships",
		});
		fastify.register(userRoutes, {
			userModel,
			blockService,
			prefix: "/api/v1/users",
		});
		fastify.register(notificationRoutes, {
			notificationModel,
			prefix: "/api/v1/notifications",
		});
		fastify.register(chatRoutes, {
			chatModel,
			notificationModel,
			onlineUsers,
			prefix: "/api/v1",
		});

		// 7. Start server with dual-stack support
		const address = await fastify.listen({
			port: 3000,
			host: "0.0.0.0",
		});

		console.log("Server running on ", address);

		// 8. Console log the addresses of a socket each time a new one connects to our server
		fastify.server.on("connection", (socket) => {
			console.log("New connection from:", socket.remoteAddress);
		});

		// 9. Display online users in the console at regular intervals
		setInterval(() => {
			console.log(onlineUsers);
		}, 5 * 1000);

		// 10. Clean up stale refresh tokens from db at regular intervals
		cleanUpTokensJob(tokenModel);
		setInterval(() => {
			cleanUpTokensJob(tokenModel);
		}, 5 * 60 * 1000);
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
