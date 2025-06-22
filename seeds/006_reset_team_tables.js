/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
	// Delete all tokens
	await knex("teams").del();
	await knex("team_players").del();


	// Reset auto-increment ID for SQLite
	await knex.raw("DELETE FROM sqlite_sequence WHERE name='teams'");
    await knex.raw("DELETE FROM sqlite_sequence WHERE name='team_players'");
};
