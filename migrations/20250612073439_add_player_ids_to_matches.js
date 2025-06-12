/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema.alterTable("matches", (table) => {
		table
			.integer("player1_id")
			.nullable()
			.references("id")
			.inTable("users")
			.onDelete("SET NULL");
		table
			.integer("player2_id")
			.nullable()
			.references("id")
			.inTable("users")
			.onDelete("SET NULL");
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
	return knex.schema.alterTable("matches", (table) => {
		table.dropColumn("player2_id");
		table.dropColumn("player1_id");
	});
};
