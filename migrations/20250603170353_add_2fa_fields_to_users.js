/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema.table("users", function (table) {
		table.string("two_factor_secret").nullable();
		table.boolean("two_factor_enabled").defaultTo(false);
		table.boolean("two_factor_verified").defaultTo(false);
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
	return knex.schema.table("users", function (table) {
		table.dropColumn("two_factor_secret");
		table.dropColumn("two_factor_enabled");
		table.dropColumn("two_factor_verified");
	});
};
