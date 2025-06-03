/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema.table("users", function (table) {
		table.string("twoFactorSecret").nullable();
		table.boolean("twoFactorEnabled").defaultTo(false);
		table.boolean("twoFactorVerified").defaultTo(false);
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
	return knex.schema.table("users", function (table) {
		table.dropColumn("twoFactorSecret");
		table.dropColumn("twoFactorEnabled");
		table.dropColumn("twoFactorVerified");
	});
};
