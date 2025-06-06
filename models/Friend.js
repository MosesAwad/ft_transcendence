const CustomError = require("../errors");
class Friend {
	constructor(db) {
		this.db = db;
	}

	/*
		==================== Purpose ====================
					Check block status between users
		==================================================
	*/
	async getBlockStatus(user1Id, user2Id) {
		const blocks = await this.db("blocks")
			.where(function () {
				this.where({
					blocker_id: user1Id,
					blocked_id: user2Id,
				}).orWhere({ blocker_id: user2Id, blocked_id: user1Id });
			})
			.select("blocker_id", "blocked_id");

		return {
			user1BlockedUser2: blocks.some(
				(block) =>
					block.blocker_id === user1Id && block.blocked_id === user2Id
			),
			user2BlockedUser1: blocks.some(
				(block) =>
					block.blocker_id === user2Id && block.blocked_id === user1Id
			),
			isMutualBlock: blocks.length === 2,
		};
	}

	/*
		==================== Purpose ====================
						Send a friend request
		==================================================
	*/
	async sendRequest(senderId, receiverId) {
		let notify = true;
		// Validation
		const user = await this.db("users").where({ id: receiverId }).first();
		if (!user) {
			throw new CustomError.NotFoundError(
				"Invalid reciever id, unable to send request"
			);
		}

		if (senderId === receiverId) {
			throw new CustomError.BadRequestError(
				"Cannot send friend request to yourself"
			);
		}

		// If the sender has blocked the receiver, always send this error (regardless of whether they were already friends pre-block or not)
		const blockStatus = await this.getBlockStatus(senderId, receiverId);
		if (blockStatus.user1BlockedUser2) {
			throw new CustomError.UnauthorizedError(
				"Please unblock the user before attempting to send a friend request"
			);
		}
		// If the receiver has blocked the sender, do not notify the receiver about the request but still make the sender believe that the request was sent
		if (blockStatus.user2BlockedUser1) {
			notify = false;
		}

		const friendshipExists = await this.db("friendships")
			.where(function () {
				// Note 1
				this.where({
					user_id: senderId,
					friend_id: receiverId,
				})
					.whereIn("status", ["accepted", "pending"])
					.orWhere({
						user_id: receiverId,
						friend_id: senderId,
					})
					.whereIn("status", ["accepted", "pending"]);
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

		// Create friendship if validation succeeds
		await this.db("friendships").insert({
			user_id: senderId,
			friend_id: receiverId,
		});

		return notify;
	}

	/*
		==================== Purpose ====================
					Accept or reject a request
		==================================================
	*/
	async handleRequest(friendshipId, receiverId, action) {
		const friendship = await this.db("friendships")
			.where({ id: friendshipId })
			.first();

		// Validation
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
		if (friendship.status === "cancelled") {
			throw new CustomError.BadRequestError(
				"This friend request is no longer available"
			);
		}

		// Update the friendship status
		const status = action === "accept" ? "accepted" : "declined";
		await this.db("friendships").where({ id: friendship.id }).update({
			status,
			updated_at: this.db.fn.now(),
		});

		// Get the sender's username
		const { username } = await this.db("users")
			.where({ id: friendship.user_id })
			.select("username")
			.first();

		// Store sender details in an object
		const senderUser = {
			id: friendship.user_id,
			username,
		};

		return {
			senderUser,
			status,
		};
	}

	/*
		==================== Purpose ====================
				* Cancel a pending request that you sent
				* Delete a friendship
		==================================================
	*/
	async abortFriendship(friendshipId, userId) {
		const friendship = await this.db("friendships")
			.where({ id: friendshipId })
			.first();

		// Validation
		if (!friendship) {
			throw new CustomError.NotFoundError("No such request was found");
		}
		if (friendship.user_id !== userId && friendship.friend_id !== userId) {
			throw new CustomError.UnauthorizedError(
				"You're not authorized to respond to this request"
			);
		}
		let exFriendIdCapture = null;
		let newStatus = null;
		// Validation: If status is pending, only sender can cancel the request (to unfriend an existing friend, use handleRequest instead)
		if (friendship.status === "pending") {
			if (friendship.user_id !== userId) {
				throw new CustomError.UnauthorizedError(
					"You're not authorized to perform this action!"
				);
			}
			exFriendIdCapture = friendship.friend_id;
			newStatus = "cancelled";
		}
		// Validation: Prevent any user from deleting a declined request
		else if (friendship.status === "declined") {
			throw new CustomError.BadRequestError(
				"This friend request has already been declined and cannot be modified!"
			);
		}
		else if (friendship.status === "unfriended") {
			throw new CustomError.BadRequestError(
				"Cannot unfriend a user you are no longer friends with"
			);
		}
		// Validation: obtain the ex-friend's user id
		else {
			exFriendIdCapture =
				userId === friendship.user_id
					? friendship.friend_id
					: friendship.user_id;
			newStatus = "unfriended";
		}

		// Delete the pending request or unfriend the user
		await this.db("friendships")
			.where({ id: friendshipId })
			.update({ status: newStatus });

		return exFriendIdCapture;
	}

	/*
		==================== Purpose ====================
						List all your friends
		==================================================
	*/
	async listFriends(userId) {
		// Get base friends list without block filtering
		const baseQuery = this.db("friendships").where("status", "accepted");

		// Query when user is the sender of friend request
		const q1 = baseQuery
			.clone()
			.where("friendships.user_id", userId)
			// Note 4
			.leftJoin("blocks as b", function () {
				this.on("b.blocker_id", "=", userId) // blocker is the current user
					.andOn("b.blocked_id", "=", "friendships.friend_id"); // blocked person is the friend (we need this because we are only concerned with blocked FRIENDS of the user, not just anyone who the user has blocked)
			})
			.join("users", "friendships.friend_id", "users.id")
			.whereNull("b.id") // only include rows were the block id is null, meaning the user has not blocked the friend
			.select(
				"users.id as userId",
				"users.username",
				"friendships.id as friendshipId"
			);

		// Query when user is the receiver of friend request
		const q2 = baseQuery
			.clone()
			.where("friendships.friend_id", userId)
			// Note 4
			.leftJoin("blocks as b", function () {
				this.on("b.blocker_id", "=", userId) // blocker is the current user
					.andOn("b.blocked_id", "=", "friendships.user_id"); // blocked person is the friend (we need this because we are only concerned with blocked FRIENDS of the user, not just anyone who the user has blocked)
			})
			.join("users", "friendships.user_id", "users.id")
			.whereNull("b.id") // only include rows were the block id is null, meaning the user has not blocked the friend
			.select(
				"users.id as userId",
				"users.username",
				"friendships.id as friendshipId"
			);

		const allFriends = await q1.union(q2);
		return allFriends;
	}

	/*
		==================== Purpose ====================
				* List pending outgoing requests (direction: sent)
				* List pending incoming requests (direction: received)
		==================================================
	*/
	async listRequests(userId, status, direction) {
		// First get all requests without block filtering
		const baseQuery = this.db("friendships").where("status", status); // status is always 'pending' at this endpoint
		let requests;

		if (direction === "sent") {
			requests = await baseQuery
				.clone()
				.where("friendships.user_id", userId)
				.join("users", "friendships.friend_id", "users.id")
				.select(
					"friendships.id as friendshipId",
					"users.id as recipientId",
					"users.username as senderUsername"
				);
		} else {
			requests = await baseQuery
				.clone()
				.where("friendships.friend_id", userId)
				// Note 5
				.leftJoin("blocks as b", function () {
					this.on("b.blocker_id", "=", userId) // blocker is the current user
						.andOn("b.blocked_id", "=", "friendships.user_id"); // blocked person is the sender (we need this because we are only concerned with blocked SENDERS of the user, not just anyone who the user has blocked)
				})
				.join("users", "friendships.user_id", "users.id")
				.whereNull("b.id") // only include rows were the block id is null, meaning the user has not blocked the sender
				.select(
					"friendships.id as friendshipId",
					"users.id as senderId",
					"users.username as senderUsername"
				);
		}

		return requests;
	}

	/*
		==================== Purpose ====================
 			* Helper for the blockService
			* Find friendship between two users
		==================================================
	*/
	async findFriendshipBetweenUsers(user1Id, user2Id) {
		return await this.db("friendships")
			.where(function () {
				this.where({
					user_id: user1Id,
					friend_id: user2Id,
				}).orWhere({
					user_id: user2Id,
					friend_id: user1Id,
				});
			})
			.whereIn("status", ["accepted", "pending"])
			.first();
	}

	/*
		==================== Purpose ====================
			* Helper for the blockService
			* Update friendship status
		==================================================
	*/
	async updateFriendshipStatus(friendshipId, newStatus) {
		await this.db("friendships").where({ id: friendshipId }).update({
			status: newStatus,
			updated_at: this.db.fn.now(),
		});
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

		Notification A [scenario where we aren't friends yet, and won't be because I'm cancelling the request in this controller]:
			Status: "pending"
			"User X (you) has sent you a friend request"

			If status is 'pending', then I, the user using this controller was the sender of the notification (notification type A).

		Notification B [scenario where we are already friends but one of us decides to unfriend the other]:
			Status: "accepted"
			You get: "User Y has accepted YOUR friend request" [sender: User Y (him), receiver User X (you)]
			He gets: "You are now friends with User X (you)" [sender: User X (him), receiver User Y (him)]
 
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
	
	Note 4

		This is an alternative implementation of listFriends. This filters out requests based on block status without using a leftJoin. 
		It seems easier to understand, but it is way less efficient due to the multiple database calls (in the for-of loop) for each request.

		async listFriends(userId) {
			// Get base friends list without block filtering
			const baseQuery = this.db("friendships").where("status", "accepted");

			// Query when user is the sender of friend request
			const q1 = baseQuery
				.clone()
				.where("friendships.user_id", userId)
				.join("users", "friendships.friend_id", "users.id")
				.select(
					"users.id as userId",
					"users.username",
					"friendships.id as friendshipId"
				);

			// Query when user is the receiver of friend request
			const q2 = baseQuery
				.clone()
				.where("friendships.friend_id", userId)
				.join("users", "friendships.user_id", "users.id")
				.select(
					"users.id as userId",
					"users.username",
					"friendships.id as friendshipId"
				);

			const allFriends = await q1.union(q2);

			// Filter friends based on block status
			const filteredFriends = [];
			for (const friend of allFriends) {
				const blockStatus = await this.getBlockStatus(
					userId,
					friend.userId
				);
				// Only hide friend if the logged-in user blocked them
				if (!blockStatus.user1BlockedUser2) {
					filteredFriends.push(friend);
				}
			}

			return filteredFriends;
		}

	Note 5

		This is an alternative implementation of listRequests. This filters out requests based on block status without using a leftJoin. 
		It seems easier to understand, but it is way less efficient due to the multiple database calls (in the for-of loop) for each request.

		async listRequests(userId, status, direction) {
			// First get all requests without block filtering
			const baseQuery = this.db("friendships").where("status", status); // status is always 'pending' at this endpoint
			let requests;

			if (direction === "sent") {
				requests = await baseQuery
					.clone()
					.where("friendships.user_id", userId)
					.join("users", "friendships.friend_id", "users.id")
					.select(
						"friendships.id as friendshipId",
						"users.id as recipientId",
						"users.username as senderUsername"
					);
			} else {
				requests = await baseQuery
					.clone()
					.where("friendships.friend_id", userId)
					.join("users", "friendships.user_id", "users.id")
					.select(
						"friendships.id as friendshipId",
						"users.id as senderId",
						"users.username as senderUsername"
					);
			}

			// Filter requests based on block status
			const filteredRequests = [];
			for (const request of requests) {
				const otherUserId =
					direction === "sent" ? request.recipientId : request.senderId;
				const blockStatus = await this.getBlockStatus(userId, otherUserId);

				if (direction === "sent") {
					// For outgoing requests, show even if receiver blocked me
					filteredRequests.push(request);
				} else {
					// For incoming requests, hide if I blocked the sender
					if (!blockStatus.user1BlockedUser2) {
						filteredRequests.push(request);
					}
				}
			}

			return filteredRequests;
		}
*/
