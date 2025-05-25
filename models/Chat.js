const CustomError = require("../errors");
class Chat {
	constructor(db) {
		this.db = db;
	}

	async getChatBetweenUsers(user1Id, user2Id) {
		// Control path where the user tries to fetch a chat with themselves (not allowed since we do not support self-chat)
		if (user1Id.toString() === user2Id) {
			throw new CustomError.NotFoundError(`No such chat was found`);
		}
		// This technique is called a self-join (see Note 1)
		const chatWithUser2 = await this.db("chat_participants as cp1")
			.join("chat_participants as cp2", "cp1.chat_id", "cp2.chat_id")
			.where("cp1.user_id", user1Id)
			.andWhere("cp2.user_id", user2Id)
			.first();
		// Control path where the user has never chatted with user2 before, must create a chat instead
		if (!chatWithUser2) {
			throw new CustomError.NotFoundError(`No such chat was found`);
		}

		return chatWithUser2.chat_id;
	}

	// async getAllUserChats(user1Id) {
	// 	const chatsData = await this.db("chat_participants as cp1")
	// 		.join("chat_participants as cp2", "cp1.chat_id", "cp2.chat_id")
	// 		.join("chats", "cp1.chat_id", "chats.id")
	// 		.select(
	// 			"cp1.chat_id",
	// 			"cp2.user_id as participantId",
	// 			"chats.updated_at"
	// 		)
	// 		.where("cp1.user_id", user1Id)
	// 		.andWhereNot("cp2.user_id", user1Id)
	// 		.orderBy("chats.updated_at", "desc");

	// 	return chatsData;
	// }

	async getAllUserChats(user1Id) {
		const chatsData = await this.db("chat_participants as cp1")
			.join("chat_participants as cp2", "cp1.chat_id", "cp2.chat_id")
			.join("chats", "cp1.chat_id", "chats.id")
			.select(
				"cp1.chat_id",
				"cp2.user_id as participantId",
				"chats.updated_at"
			)
			.where("cp1.user_id", user1Id)
			.andWhereNot("cp2.user_id", user1Id)
			// Note 2
			.whereExists(function () {
				this.select("*")
					.from("messages")
					.whereRaw("messages.chat_id = cp1.chat_id")
					.andWhere(function () {
						this.where(function () {
							this.whereRaw(
								"messages.sender_id = cp2.user_id"
							).andWhere("messages.blocks_active", false);
						}).orWhereRaw("messages.sender_id = cp1.user_id");
					});
			})
			.orderBy("chats.updated_at", "desc");

		return chatsData;
	}

	async createChatBetweenUsers(user1Id, user2Id) {
		// Self-join technique to check if chat already exists (see Note 1)
		const chatWithUser2 = await this.db("chat_participants as cp1")
			.join("chat_participants as cp2", "cp1.chat_id", "cp2.chat_id")
			.where("cp1.user_id", user1Id)
			.andWhere("cp2.user_id", user2Id)
			.first();
		const user2 = await this.db("users").where({ id: user2Id }).first();
		const chatWithSelf = user1Id === user2Id;
		// Control path where user is attempting to start a chat with themselves
		if (chatWithSelf) {
			throw new CustomError.BadRequestError(
				"Unable to create chat: cannot initiatie chat with oneself!"
			);
		}
		// Control path where the user has already has a chat with user2, must get the chat instead
		if (chatWithUser2) {
			throw new CustomError.BadRequestError(
				`Unable to create chat: chat with user '${user2.username}' already exists!`
			);
		}
		// Control path where user2 is not in the database
		if (!user2) {
			throw new CustomError.BadRequestError(
				`Unable to create chat: user with id ${user2Id} not found!`
			);
		}

		// Insert a chat into the "chats" table, then fill the "chat_participants" table
		const [chatId] = await this.db("chats").insert({}).returning("id");
		// Insert the chat details into the "chat_participants" join table
		await this.db("chat_participants").insert([
			{ chat_id: chatId, user_id: user1Id },
			{ chat_id: chatId, user_id: user2Id },
		]);

		return chatId;
	}

	async createMessage(senderId, chatId, content) {
		const chatRows = await this.db("chat_participants").where({
			chat_id: chatId,
		});
		const chatParticipantIds = chatRows.map((row) => row.user_id);
		// Control path where the user tries to send a message in a chatroom he does not belong to
		if (!chatParticipantIds.includes(senderId)) {
			throw new CustomError.UnauthorizedError(
				"Access Denied! Unable to send message"
			);
		}

		const receiverIsBlocked = await this.db("blocks")
			.where({
				blocker_id: senderId,
				blocked_id: chatParticipantIds.find((id) => id !== senderId),
			})
			.first();
		if (receiverIsBlocked) {
			throw new CustomError.UnauthorizedError(
				"Access Denied! You have blocked this user"
			);
		}
		const isSenderBlocked = await this.db("blocks")
			.where({
				blocker_id: chatParticipantIds.find((id) => id !== senderId),
				blocked_id: senderId,
			})
			.first();

		// Add the message to the database
		const [message] = await this.db("messages")
			.insert({
				chat_id: chatId,
				sender_id: senderId,
				content: content,
				blocks_active: isSenderBlocked ? true : false,
			})
			.returning("*");

		// Update the updated_at timestamp of the chat in the "chats" table
		await this.db("chats")
			.where({ id: chatId })
			.update({
				updated_at: this.db.raw("CURRENT_TIMESTAMP"),
			});

		// Obtain the receiver's id for the chat notification service to use
		const receiverUserId = chatParticipantIds.find((id) => id !== senderId);

		return { message, receiverUserId, isSenderBlocked };
	}

	async getMessages(userId, chatId) {
		const chatRows = await this.db("chat_participants").where({
			chat_id: chatId,
		});
		const chatParticipantIds = chatRows.map((row) => row.user_id);
		// Control path where the user tries to obtain the messages in a chatroom he does not belong to
		if (!chatParticipantIds.includes(userId)) {
			throw new CustomError.UnauthorizedError(
				"Access denied! Unable to retrieve messages"
			);
		}
		const messages = await this.db("messages")
			.where({ chat_id: chatId })
			.andWhere(function () {
				this.where("blocks_active", false).orWhere(function () {
					this.where("blocks_active", true).andWhere(
						"sender_id",
						userId
					);
				});
			})
			.orderBy("created_at", "asc");
		return messages;
	}
}

module.exports = Chat;

/*
    NOTES

    Note 1

        Without a self-join, this is how our controller would look like:

            async getChatBetweenUsers(user1Id, user2Id) {
                const allUserChatIdsObjectArray = await this.db("chat_participants")
                    .select("chat_id")
                    .where({
                        user_id: user1Id,
                    });
                const allUserChatIds = allUserChatIdsObjectArray.map(
                    (rowObject) => rowObject.chat_id
                );
                // This means the user has no chats to begin with, must create a chat instead
                if (!allUserChatIds.length) {
                    return null;
                }

                const chatWithUser2 = await this.db("chat_participants")
                    .select("chat_id")
                    .whereIn("chat_id", allUserChatIds)
                    .andWhere("user_id", user2Id)
                    .first();
                // This means the user has never chatted with user2 before, must create a chat instead
                if (!chatWithUser2) {
                    return null;
                }

                return chatWithUser2.chat_id;
            }
        
        It's nice and linear in fashion, in other words more intuitive, but less-efficient. Self-joining is the optimal way to go. 

	Note 2

		To base explain why we use the `whereExists` clause, consider a scenario where user A has blocked user B without any of them 
		having ever messaged one another. In this case, if user B tries to message user A, the chat will exist in the database, but 
		the messages will all have a `blocks_active` status of `true`. We do not want user B to know that they have been blocked by 
		user A, so we will fetch the chat for user B. That explains the following line
			.orWhereRaw("messages.sender_id = cp1.user_id");

		But for user A, on the other hand, we do not want to show the chat with user B in their chat list, because they have blocked 
		user B and they have never had any messages with one another before. Since the chat does exist in the database with user A as 
		the recipient (albeit all messages have a 'blocks_active' status of true), we can't just rely on fetching any chat where user 
		A is a particpant. As a result, we need to use the following line:
			this.whereRaw(
					"messages.sender_id = cp2.user_id"
				).andWhere("messages.blocks_active", false);
	
		this says fetch any chat where user A is a participant and there is a message sent by user B (cp2.user_id) that is not blocked. 
		Since our only condition is having just one message sent by user B that is not blocked, that is why we use the `whereExists` clause.
		This is more efficient than using a join on the messages table. It doesn't perform a join on all the messages that belong to the chat 
		between user A and user B and then filters them out and then counts to see if there are any messages where 'blocks_active' is set to 
		false. Instead, a 'whereExists' checks for the existence of at least one message that matches the criteria and it's done, which is 
		more efficient.	

*/
