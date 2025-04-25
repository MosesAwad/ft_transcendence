const CustomError = require("../errors");

class Notification {
	constructor(db) {
		this.db = db;
	}

	async createNotification(senderId, receiverId, type, message) {
		if (!senderId || !receiverId || !type || !message) {
			throw new Error(
				"Missing required notification data, unable to create notification"
			); // Note 1
		}
		await this.db("notifications").insert({
			sender_id: senderId,
			receiver_id: receiverId,
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
                type
			}).del();
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
