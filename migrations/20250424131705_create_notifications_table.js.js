/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema.createTable("notifications", (table) => {
		table.increments("id").primary();
		table
			.integer("sender_id")
			.references("id")
			.inTable("users")
			.onDelete("CASCADE");
		// nullable on purpose (for system notifications)

		table
			.integer("receiver_id")
			.notNullable()
			.references("id")
			.inTable("users")
			.onDelete("CASCADE");

		table.string("type").notNullable();
		table.string("message").notNullable();
		table.boolean("is_read").defaultTo(false).notNullable();
		table.timestamps(true, true);
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {};
