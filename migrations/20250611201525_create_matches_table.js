/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema.createTable("matches", (table) => {
		table.increments("id").primary();
		table.string("player1_name").notNullable();
		table.string("player2_name").notNullable();
		table.enum("match_type", ["1v1", "1vAi", "tournament", "multiplayer"]).notNullable();
		table.integer("player1_score").defaultTo(0);
		table.integer("player2_score").defaultTo(0);
		table.enum("status", ["cancelled", "finished"]).defaultTo("cancelled");
		table
			.integer("tournament_id")
			.nullable()
			.references("id")
			.inTable("tournaments")
			.onDelete("SET NULL");
		table.timestamps(true, true);
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
	return knex.schema.dropTableIfExists("matches");
};
