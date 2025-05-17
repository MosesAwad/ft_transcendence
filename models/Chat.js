class Chat {
	constructor(db) {
		this.db = db;
	}

	async getChatBetweenUsers(user1Id, user2Id) {
		// This technique is called a self-join (see Note 1)
		const chatWithUser2 = await this.db("chat_participants as cp1")
			.join("chat_participants as cp2", "cp1.chat_id", "cp2.chat_id")
			.where({ "cp1.user_id": user1Id })
			.andWhere("cp2.user_id", user2Id)
			.first();
		// Control path where the user has never chatted with user2 before, must create a chat instead
		if (!chatWithUser2) {
			return null;
		}

		return chatWithUser2.chat_id;
	}

	async createChatBetweenUsers(user1Id, user2Id) {
		// Self-join technique to check if chat already exists (also see Note 1)
		const chatWithUser2 = await this.db("chat_participants as cp1")
			.join("chat_participants as cp2", "cp1.chat_id", "cp2.chat_id")
			.where("cp1.user_id", user1Id)
			.andWhere("cp2.user_id", user2Id)
			.first();
		const user2Found = await this.db("users")
			.where({ id: user2Id })
			.first();
		const chatWithSelf = user1Id === user2Id;
		// Control path where the user has already has a chat with user2, must get the chat instead
		// Control path where user2 is not in the database
		if (chatWithUser2 || !user2Found || chatWithSelf) {
			return null;
		}

		// Inser a chat into the "chats" table, then fill the "chat_participants" table
		const [chatId] = await this.db("chats").insert({}).returning("id");

		await this.db("chat_participants").insert([
			{ chat_id: chatId, user_id: user1Id },
			{ chat_id: chatId, user_id: user2Id },
		]);

		return chatId;
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
