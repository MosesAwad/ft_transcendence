const CustomError = require("../errors");
class Friend {
	constructor(db) {
		this.db = db;
	}

	async sendRequest(senderId, receiverId) {
		const user = await this.db("users").where({ id: receiverId }).first();
		if (!user) {
			throw new CustomError.NotFoundError(
				"Invalid reciever id, unable to send request"
			);
		}
		const friendshipExists = await this.db("friendships")
			.where(function () {
				// Note 1
				this.where({
					user_id: senderId,
					friend_id: receiverId,
				}).orWhere({
					user_id: receiverId,
					friend_id: senderId,
				});
			})
			.first();
		if (friendshipExists) {
			if (friendshipExists.status === "accepted") {
				throw new CustomError.BadRequestError(
					"You are already friends with this user"
				);
			} else if (friendshipExists.status === "pending") {
				if (friendshipExists.user_id === senderId) {
					throw new CustomError.BadRequestError(
						"Friend request has already been sent"
					);
				} else {
					throw new CustomError.BadRequestError(
						"Already recieved a pending request from this user"
					);
				}
			}
		}
		await this.db("friendships").insert({
			user_id: senderId,
			friend_id: receiverId,
		});
	}

	// Accept or reject a request
	async handleRequest(friendshipId, receiverId, action) {
		// Find the friendship
		const friendship = await this.db("friendships")
			.where({ id: friendshipId })
			.first();
		if (!friendship) {
			throw new CustomError.NotFoundError("No such request was found");
		}
		if (friendship.friend_id !== receiverId) {
			throw new CustomError.UnauthorizedError(
				"You're not authorized to respond to this request"
			);
		}
		if (friendship.status === "accepted") {
			throw new CustomError.BadRequestError(
				"You are already friends with this user"
			);
		}

		// Update the friendship status
		const status = action === "accept" ? "accepted" : "declined";
		await this.db("friendships").where({ id: friendship.id }).update({
			status,
			updated_at: this.db.fn.now(),
		});

		return {
			requestSenderId: friendship.user_id,
			status,
		};
	}

	// Cancel a pending request that you sent or delete a friendship
	async abortFriendship(friendshipId, userId) {
		const friendship = await this.db("friendships")
			.where({ id: friendshipId })
			.first();
		if (!friendship) {
			throw new CustomError.NotFoundError("No such request was found");
		}
		if (friendship.user_id !== userId && friendship.friend_id !== userId) {
			throw new CustomError.UnauthorizedError(
				"You're not authorized to respond to this request"
			);
		}
		// Only the user can cancel a request that they sent, the receiver can abort by rejecting the request instead (in the handleRequest model method)
		if (friendship.status === "pending" && friendship.user_id !== userId) {
			throw new CustomError.UnauthorizedError(
				"You're not authorized to delete this request"
			);
		}
		// Note 2
		const notificationDataCapture = {
			senderId:
				friendship.status === "pending"
					? friendship.user_id
					: friendship.friend_id,
			receiverId:
				friendship.status === "pending"
					? friendship.friend_id
					: friendship.user_id,
		};
		await this.db("friendships").where({ id: friendshipId }).del();

		return notificationDataCapture;
	}

	async listFriends(userId) {
		// Note 2
		const baseQuery = this.db("friendships").where("status", "accepted");

		const q1 = baseQuery
			.clone()
			.where("friendships.user_id", userId)
			.join("users", "friendships.friend_id", "users.id")
			.select(
				"users.id as userId",
				"users.username",
				"friendships.id as friendshipId"
			);

		const q2 = baseQuery
			.clone()
			.where("friendships.friend_id", userId)
			.join("users", "friendships.user_id", "users.id")
			.select(
				"users.id as userId",
				"users.username",
				"friendships.id as friendshipId"
			);

		return q1.union(q2); // Note 3
	}

	async listRequests(userId, status, direction) {
		const baseQuery = this.db("friendships").where("status", status);
		if (direction === "sent") {
			return baseQuery
				.clone()
				.where("friendships.user_id", userId)
				.join("users", "friendships.friend_id", "users.id")
				.select(
					"friendships.id as friendshipId",
					"users.id as recipientId",
					"users.username as senderUsername"
				);
		} else {
			return baseQuery
				.clone()
				.where("friendships.friend_id", userId)
				.join("users", "friendships.user_id", "users.id")
				.select(
					"friendships.id as friendshipId",
					"users.id as senderId",
					"users.username as senderUsername"
				);
		}
	}
}

module.exports = Friend;

/*
	NOTES

	Note 1
 		We used a function in .where() to group the where and orWhere conditions — which is exactly the right move when we 
		need parentheses around the OR clause in SQL.

		With parenthesis (what we want) -- achieved by using a function to wrap where & orWhere clause:

			SELECT * FROM friendships 
			WHERE (user_id = senderId AND friend_id = receiverId)
			OR (user_id = receiverId AND friend_id = senderId);


		Without parenthesis:

			SELECT * FROM friendships 
			WHERE user_id = senderId 
			AND friend_id = receiverId 
			OR user_id = receiverId 
			AND friend_id = senderId;

			which in this case due to SQL operator precedence resolves to 

			SELECT * FROM friendships 
			WHERE (user_id = senderId AND friend_id = receiverId) 
			OR (user_id = receiverId AND friend_id = senderId);

			which is what we want yeah, BUT in this case it worked out. Though it might not always work out 
			like this, so it's best to be more explicit and to be aware of this capability.

	Note 2

		Notification A:
			"User X (you) has sent you a friend request"
		
		Notification B:
			"User Y has accepted YOUR friend request"

		If status is 'pending', then I, the user using this controller was the sender of the notification (notification type A). 
		However, if status is 'accepted', then I, the user using this controller sent the friend request BUT I am the actually the 
		receiver of the notification, notification type B.

	Note 3

		The query we built with Knex in listFriends resolves to one single query which looks like this in plain SQL:

			SELECT users.id, users.username
			FROM friendships
			JOIN users ON friendships.friend_id = users.id
			WHERE friendships.user_id = ? AND status = 'accepted'

			UNION

			SELECT users.id, users.username
			FROM friendships
			JOIN users ON friendships.user_id = users.id
			WHERE friendships.friend_id = ? AND status = 'accepted';

		The idea is that the current logged-in user could be listed either under the friend_id column (if he received the 
		request) or the user_id column (if he sent the request). That's why we make two joins to reflect both scenarios and 
		join the results in a union.
*/
