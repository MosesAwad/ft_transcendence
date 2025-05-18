const CustomError = require("../errors");
class Chat {
	constructor(db) {
		this.db = db;
	}

	async validateChatIdAndUserParticipation(user1Id, chatId) {
		const chat = await this.db("chat_participants")
			.where({ user_id: user1Id, chat_id: chatId })
			.first();

		return chat;
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

		// Add the message to the database
		const [message] = await this.db("messages")
			.insert({
				chat_id: chatId,
				sender_id: senderId,
				content: content,
			})
			.returning("*");

		// Update the updated_at timestamp of the chat in the "chats" table
		await this.db("chats")
			.where({ id: chatId })
			.update({
				updated_at: this.db.raw("CURRENT_TIMESTAMP"),
			});

		return message;
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
*/
