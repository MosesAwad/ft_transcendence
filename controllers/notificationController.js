module.exports = (notificationModel) => ({
	updateNotificationById: async (request, reply) => {
		const { notificationId } = request.params;
		const {
			user: { id: userId },
		} = request.user;

		await notificationModel.markNotificationAsRead(
			notificationId,
			userId
		);
		reply.send({ success: true });
	},

	updateUnopenedMessageNotification: async (request, reply) => {
		const {
			user: { id: userId },
		} = request.user;
		const { chatId } = request.query;

		const messageCounter = await notificationModel.markMessageNotificationAsOpened(chatId, userId);
		reply.send({ success: true, messageCounter });
	},

	updateAllUnopenedNotifications: async (request, reply) => {
		const {
			user: { id: userId },
		} = request.user;

		await notificationModel.markAllNotificationsAsOpened(userId);
		reply.send({ success: true });
	},

	listNotifications: async (request, reply) => {
		const { page, limit } = request.query;
		const {
			user: { id: userId },
		} = request.user;
		const notifications = await notificationModel.listNotifications(
			page,
			limit,
			userId
		);

		reply.send(notifications);
	},
});
