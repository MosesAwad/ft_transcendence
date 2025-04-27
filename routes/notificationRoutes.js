// const {  } = require("../schemas/notificationSchemas");

async function notificationRoutes(fastify, options) {
	const { notificationModel } = options;
	const { listNotifications, updateNotification } =
		require("../controllers/notificationController")(notificationModel);

	fastify.get("/", { preHandler: fastify.authenticate }, listNotifications);

	fastify.patch(
		"/:notificationId",
		{ preHandler: fastify.authenticate },
		updateNotification
	);
}

module.exports = notificationRoutes;
