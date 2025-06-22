/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema.createTable("teams", (table) => {
		table.increments("id").primary();
		table.string("name").notNullable();
		table.integer("score").defaultTo(0);
		table
			.integer("match_id")
			.notNullable()
			.references("id")
			.inTable("matches")
			.onDelete("CASCADE");
		table.timestamps(true, true);
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
	return knex.schema.dropTableIfExists("teams");
};
