const { listNotificationOpts } = require("../schemas/notificationSchemas");

async function notificationRoutes(fastify, options) {
	const { notificationModel } = options;
	const {
		listNotifications,
		updateNotificationById,
		updateUnopenedMessageNotification,
		updateAllUnopenedNotifications,
	} = require("../controllers/notificationController")(notificationModel);

	fastify.get(
		"/",
		{
			preHandler: fastify.authenticate,
			schema: listNotificationOpts.schema,
		},
		listNotifications
	);
	// Note 1
	fastify.patch(
		"/",
		{ preHandler: fastify.authenticate },
		async (request, reply) => {
			if (request.query.chatId) {
				return updateUnopenedMessageNotification(request, reply);
			} else {
				return updateAllUnopenedNotifications(request, reply);
			}
		}
	);
	fastify.patch(
		"/:notificationId",
		{ preHandler: fastify.authenticate },
		updateNotificationById
	);
}

module.exports = notificationRoutes;

/*
	NOTES

	Note 1

		This route is used in the scenario where a user joins a chatroom before checking the notification saying 'User X has 
		sent you a message'. In that scenario, we want to update the notification to say that is_read is true because even
		though the user technically has not read the notification yet, he already knows that he has received a message. The 
		trick with marking it as read is that the front-end would not have access to the notification list when the user joins the 
		chatroom and thus, no notificationId to pass in the URL. So, we need to use a query parameter instead to pass the chatId and 
		that would be the filter/identifier (not the notificationId) for which notification to mark as read now.

*/
