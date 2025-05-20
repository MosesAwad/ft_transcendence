const CustomError = require("../errors");

class Notification {
	constructor(db) {
		this.db = db;
	}

	async createNotification(senderId, receiverId, chatId, type, message, systemWide) {
		if (!systemWide && !senderId) {
			throw new Error(
				"Missing required notification data, unable to create notification"
			);
		}
		if (!receiverId || !type || !message) {
			throw new Error(
				"Missing required notification data, unable to create notification"
			); // Note 1
		}

		if (type === "message") {
			const existingMessage = await this.db("notifications")
				.where({
					sender_id: senderId,
					receiver_id: receiverId,
					chat_id: chatId,
					type,
				})
				.orderBy("updated_at", "desc") // Just in case there are old ones, but there shouldn't be any unless there's a bug
				.first();

			// Avoid cluttering receiver UI with "user X has sent you a message" and use a "rotating" notification instead
			if (existingMessage) {
				const senderUsername = existingMessage.message.split(" ")[0];

				if (!existingMessage.is_read) {
					const newCount = existingMessage.message_count + 1;
					await this.db("notifications")
						.where({ id: existingMessage.id })
						.update({
							message: `${senderUsername} has sent you ${newCount} messages!`,
							message_count: newCount,
							updated_at: this.db.raw("CURRENT_TIMESTAMP"),
						});
				} else {
					// Reset it to a new unread message
					await this.db("notifications")
						.where({ id: existingMessage.id })
						.update({
							message: `${senderUsername} has sent you a message!`,
							message_count: 1,
							is_read: false,
							updated_at: this.db.raw("CURRENT_TIMESTAMP"),
						});
				}

				return;
			}
		}

		await this.db("notifications").insert({
			sender_id: senderId,
			receiver_id: receiverId,
			chat_id: type === "message" ? chatId : null,
			type,
			message,
		});
	}

	async deleteNotification(senderId, receiverId, type) {
		if (!senderId || !receiverId || !type) {
			throw new Error(
				"Missing required notification data, unable to delete notification"
			); // Note 1 (ibid)
		}
		await this.db("notifications")
			.where({
				sender_id: senderId,
				receiver_id: receiverId,
				type,
			})
			.del();
	}

	async deleteAllBilateralNotifications(friend1Id, friend2Id, type) {
		if (!friend1Id || !friend2Id || !type) {
			throw new Error(
				"Missing required notification data, unable to delete notifications"
			); // Note 1 (ibid)
		}
		await this.db("notifications")
			.where({
				sender_id: friend1Id,
				receiver_id: friend2Id,
				type,
			})
			.orWhere({
				sender_id: friend2Id,
				receiver_id: friend1Id,
				type,
			})
			.del();
	}

	async listNotifications(page, limit, receiverId) {
		const notifications = await this.db("notifications")
			.where("receiver_id", receiverId)
			.orderBy("updated_at", "desc") // descending meaning newest ("largest") date first
			.limit(limit)
			.offset((page - 1) * limit);

		return notifications;
	}

	async markAsRead(notificationId, userId) {
		const notification = await this.db("notifications")
			.where("id", notificationId)
			.first();
		if (!notification) {
			throw new CustomError.BadRequestError(
				"No such notification was found"
			);
		}
		if (notification.receiver_id !== userId) {
			throw new CustomError.UnauthorizedError(
				"You're not authorized to update this notification"
			);
		}
		const updatedNotification = await this.db("notifications")
			.where("id", notificationId)
			.update({ is_read: 1 })
			.returning("*");
		return updatedNotification;
	}
}

module.exports = Notification;

/*
    NOTES

    Note 1

        This method is abstracted away from the client/end-user. The client indirectly calls this model method (not via a direct notfication 
        endpoint/route but indirectly on createFriendships which is the controller for POST /friendships). Thus, it is I, the developer, who 
        is responsible to send the right data, as I send it from within the code. Hence, if I somehow mess up and did not give the righ data, 
        I would throw a plain error, not a custom error. Then, my error handler plugin/middleware would default it to status code 500, as it 
        is totally our mistake and not the user's. Needless to say, if the code is written properly, this validation error will never be hit 
        anyways. 
*/
