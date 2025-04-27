module.exports = (notificationModel) => ({
	updateNotification: async (request, reply) => {
		const { notificationId } = request.params;
		const {
			user: { id: userId },
		} = request.user;
		await notificationModel.markAsRead(notificationId, userId);

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
