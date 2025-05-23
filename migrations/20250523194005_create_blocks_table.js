/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema.createTable("blocks", (table) => {
		table.increments("id").primary();
		table
			.integer("blocker_id")
			.notNullable()
			.references("id")
			.inTable("users")
			.onDelete("CASCADE");
		table
			.integer("blocked_id")
			.notNullable()
			.references("id")
			.inTable("users")
			.onDelete("CASCADE");
		table.timestamps(true, true);

		// Ensure a user can't block the same person twice
		table.unique(["blocker_id", "blocked_id"]);
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
	return knex.schema.dropTableIfExists("blocks");
};
