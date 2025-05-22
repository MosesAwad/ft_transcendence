module.exports = (notificationModel) => ({
	// CC
	markNonMessageNotificationAsRead: async (request, reply) => {
		const { notificationId } = request.params;
		const {
			user: { id: userId },
		} = request.user;

		await notificationModel.markNonMessageNotificationAsRead(
			notificationId,
			userId
		);
		reply.send({ success: true });
	},

	// CC
	indirectMarkMessageNotificiationAsRead: async (request, reply) => {
		const {
			user: { id: userId },
		} = request.user;
		const { chatId } = request.params;

		await notificationModel.indirectMarkMessageNotificiationAsRead(chatId, userId);
		reply.send({ success: true });
	},

	// CC
	markAllNonMessageNotificationsAsOpened: async (request, reply) => {
		const {
			user: { id: userId },
		} = request.user;

		await notificationModel.markAllNonMessageNotificationsAsOpened(userId);
		reply.send({ success: true });
	},

	listOtherNotifications: async (request, reply) => {
		const { page, limit } = request.query;
		const {
			user: { id: userId },
		} = request.user;
		const notifications = await notificationModel.listOtherNotifications(
			page,
			limit,
			userId
		);

		reply.send(notifications);
	},

	listMessageNotifications: async (request, reply) => {
		const { page, limit } = request.query;
		const {
			user: { id: userId },
		} = request.user;
		const notifications = await notificationModel.listMessageNotifications(
			page,
			limit,
			userId
		);

		reply.send(notifications);
	},
});
