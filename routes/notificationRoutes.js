const { listNotificationOpts } = require("../schemas/notificationSchemas");

async function notificationRoutes(fastify, options) {
	const { notificationModel } = options;
	const {
		listMessageNotifications,
		listOtherNotifications,
		indirectMarkMessageNotificiationAsRead,
		markNonMessageNotificationAsRead,
		markAllNonMessageNotificationsAsOpened,
	} = require("../controllers/notificationController")(notificationModel);

	fastify.get(
		"/messages",
		{
			preHandler: fastify.authenticate,
			schema: listNotificationOpts.schema,
		},
		listMessageNotifications
	);
	fastify.get(
		"/others",
		{
			preHandler: fastify.authenticate,
			schema: listNotificationOpts.schema,
		},
		listOtherNotifications
	);
	// Note 1
	fastify.patch(
		"/messages/by-chat/:chatId",
		{ preHandler: fastify.authenticate },
		indirectMarkMessageNotificiationAsRead
	);
	fastify.patch(
		"/others/:notificationId",
		{ preHandler: fastify.authenticate },
		markNonMessageNotificationAsRead
	);
	fastify.patch(
		"/others",
		{ preHandler: fastify.authenticate },
		markAllNonMessageNotificationsAsOpened
	);
}

module.exports = notificationRoutes;

/*
	NOTES

	GENERAL

		(C) # Fetch message notifications
		GET    /notifications/messages

		(C) # Indirectly mark message notification as read for a specific chat
		PATCH /notifications/messages/by-chat/:chatId

		(C) # Fetch other (non-message) notifications
		GET    /notifications/others

		(C) # Mark other (non-message) notification as read (by ID)
		PATCH  /notifications/others/:notificationId

		(C) # Mark all non-message notifications as opened (triggered when user opens the notification box)
		PATCH  /notifications/others


	Note 1

		This route is used in the scenario where a user joins a chatroom before checking the notification saying 'User X has 
		sent you a message'. In that scenario, we want to update the notification to say that is_read is true because even
		though the user technically has not read the notification yet, he already knows that he has received a message. The 
		trick with marking it as read is that the front-end would not have access to the notification list when the user joins the 
		chatroom and thus, no notificationId to pass in the URL. So, we need to use a query parameter instead to pass the chatId and 
		that would be the filter/identifier (not the notificationId) for which notification to mark as read now.

*/
