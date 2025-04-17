require("dotenv").config();
const fastify = require("fastify")({
  logger: true,
});
const connectDB = require("./connect/connect");
const authRoutes = require("./routes/authRoutes");
const friendRoutes = require("./routes/friendRoutes")
const User = require("./models/User");
const Friend = require("./models/Friend");
const fastifyCookie = require('@fastify/cookie');
const fastifyJwt = require('@fastify/jwt');

const start = async () => {
  try {
    // 1. Connect to DB
    const db = await connectDB("application");
    console.log("Database connected");

    // 2. Initiliaze models
    const userModel = new User(db);
    const friendModel = new Friend(db);

    // Register plugins
    fastify.register(fastifyCookie, {
      secret: process.env.COOKIE_SECRET
    });
    fastify.register(fastifyJwt, {
      secret: process.env.JWT_SECRET,
      sign: {
        expiresIn: '30d'
      },
      cookie: {
        cookieName: 'token',
        secure: process.env.NODE_ENV === 'production', // HTTPS-only
        sameSite: 'lax',  // Basic CSRF protection
        httpOnly: true,  // Blocks JavaScript access to prevent XSS
        signed: true // Enable encryption to get signed cookie, signature is automatically provided by @fastify/cookie
      }
    });

    // 3. Register routes
    fastify.register(authRoutes, { userModel });
    fastify.register(friendRoutes, { friendModel });

    // 4. Start server
    await fastify.listen({ port: 3000 });
    console.log("Server running on http://localhost:3000");
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
};

start();
