/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema.alterTable("notifications", (table) => {
		table.integer("message_count").unsigned().notNullable().defaultTo(1);
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
	return knex.schema.alterTable("notifications", (table) => {
		table.dropColumn("message_count");
	});
};
