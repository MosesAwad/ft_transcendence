module.exports = (notificationModel) => ({
	updateNotificationById: async (request, reply) => {
		const { notificationId } = request.params;
		const {
			user: { id: userId },
		} = request.user;

		await notificationModel.markOtherNotificationAsRead(
			notificationId,
			userId
		);
		reply.send({ success: true });
	},

	updateNotificationsByQuery: async (request, reply) => {
		const {
			user: { id: userId },
		} = request.user;
		const { chatId } = request.query;

		await notificationModel.markMessageNotificationAsRead(chatId, userId);
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
