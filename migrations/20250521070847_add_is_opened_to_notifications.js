/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema.alterTable("notifications", (table) => {
		table.boolean("is_opened").notNullable().defaultTo(false);
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
	return knex.schema.alterTable("notifications", (table) => {
		table.dropColumn("is_opened");
	});
};
