/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema.createTable("chat_participants", (table) => {
		table.increments("id").primary();
		table
			.integer("chat_id")
			.notNullable()
			.references("id")
			.inTable("chats")
			.onDelete("CASCADE");
		table
			.integer("user_id")
			.notNullable()
			.references("id")
			.inTable("users")
			.onDelete("CASCADE");
		table.unique(["chat_id", "user_id"]); // Prevent duplicate entries
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
	return knex.schema.dropTableIfExists("chat_participants");
};

/*
    NOTES

        * Tables "chats" and "users" have a many-to-many relationship [one user can be in many chats and a chat has two 
          (so many) users]. This many-to-many relationship is represented by this chat_participants table. This is similar 
          in nature to the "friendships" join table representing the many-to-many relationship between users where one user 
          can have many friends and the user can be a friend of many other users as well.
        
        * For scalability, I decided to not have two columns per row representing each user in the chat. Meaning if user1 and 
          user 2 are in chat 3, then I would not have one row saying chat 3, user1, user2; instead I would have two rows with 
          chat 3, user1 and chat 3, user2. This would make it easier to implement group chats in the future. Additionally, this 
          would help me expand on the metadata unique to each user per single chat. For example, if I want to implement muting, and 
          one user decided to mute this chat, then I can add an additional column called "is_muted" here in the "chat_participants" 
          table and set it true only for that user.
*/
