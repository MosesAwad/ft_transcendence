/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema.createTable("team_players", (table) => {
		table.increments("id").primary();
		table
			.integer("team_id")
			.notNullable()
			.references("id")
			.inTable("teams")
			.onDelete("CASCADE");
		table
			.integer("user_id")
			.nullable()
			.references("id")
			.inTable("users")
			.onDelete("SET NULL");
		table.string("player_name").notNullable();
		table.timestamps(true, true);
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
	return knex.schema.dropTableIfExists("team_players");
};
