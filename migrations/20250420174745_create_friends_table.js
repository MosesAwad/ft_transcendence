/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema.createTable("friendships", (table) => {
		table.increments("id").primary();
		table
			.integer("user_id")
			.notNullable()
			.references("id")
			.inTable("users")
			.onDelete("CASCADE");
		table
			.integer("friend_id")
			.notNullable()
			.references("id")
			.inTable("users")
			.onDelete("CASCADE");

		// This status replaces friend_requests logic from an older, prototypal, deleted migration
		table
			.enum("status", [
				"pending",
				"accepted",
				"declined",
				"blocked",
				"cancelled",
				"unfriended",
			])
			.notNullable()
			.defaultTo("pending");

		table.timestamps(true, true);
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
	return knex.schema.dropTableIfExists("friendships");
};
