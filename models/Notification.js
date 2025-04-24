const CustomError = require("../errors");

class Notification {
	constructor(db) {
		this.db = db;
	}

    async storeNotification(senderId, receiverId, type, message) {
        await knex.db("notifications").insert({
            sender_id: senderId,
            receiver_id: receiverId,
            type,
            message,
        });
    }
}

module.exports = Notification;
