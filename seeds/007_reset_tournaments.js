/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
	// Delete all tokens
	await knex("tournaments").del();

	// Reset auto-increment ID for SQLite
	await knex.raw("DELETE FROM sqlite_sequence WHERE name='tournaments'");
};
