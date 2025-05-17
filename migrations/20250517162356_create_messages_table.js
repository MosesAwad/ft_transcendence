/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema.createTable("messages", (table) => {
		table.increments("id").primary();
		table
			.integer("chat_id")
			.notNullable()
			.references("id")
			.inTable("chats")
			.onDelete("CASCADE");
		table
			.integer("sender_id")
			.notNullable()
			.references("id")
			.inTable("users")
			.onDelete("CASCADE");

		table.text("content").notNullable(); // Message text
		table.boolean("is_read").defaultTo(false);

		table.timestamps(true, true); // created_at, updated_at
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTableIfExists("messages");
};

/*
    NOTES

        * Chats and messages have a one-to-many relationship [one chat can have many messages but a message can only belong to one chat]
        * Users and messages have a one-to-many relationship [one user can have many messages but a message can only belong to one user]
*/