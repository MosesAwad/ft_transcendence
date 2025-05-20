/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema.alterTable("notifications", (table) => {
		table.integer("chat_id").unsigned().nullable(); // only relevant for message-type notifications
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
	return knex.schema.alterTable("notifications", (table) => {
		table.dropColumn("chat_id");
	});
};
