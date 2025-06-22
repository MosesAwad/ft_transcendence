/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	// For SQLite, we need to recreate the table to modify the check constraint
	return knex.schema.alterTable("matches", (table) => {
		// Add a check on the match_type column for valid values
		table
			.enu("match_type", ["1v1", "1vAi", "tournament", "multiplayer"])
			.alter();
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
	return knex.schema.alterTable("matches", (table) => {
		// Revert to original allowed values
		table.enu("match_type", ["1v1", "1vAi", "tournament"]).alter();
	});
};
