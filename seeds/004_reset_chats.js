/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
	// Delete all tokens
	await knex("chats").del();
	await knex("chat_participants").del();
    await knex("messages").del();

	// Reset auto-increment ID for SQLite
	await knex.raw("DELETE FROM sqlite_sequence WHERE name='chats'");
    await knex.raw("DELETE FROM sqlite_sequence WHERE name='chat_participants'");
    await knex.raw("DELETE FROM sqlite_sequence WHERE name='messages'");
};
