/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema.table("users", function (table) {
		// Drop the unused camelCase 2FA columns
		table.dropColumn("twoFactorSecret");
		table.dropColumn("twoFactorEnabled");
		table.dropColumn("twoFactorVerified");
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
	return knex.schema.table("users", function (table) {
		// Add the columns back if we need to rollback
		table.string("twoFactorSecret").nullable();
		table.boolean("twoFactorEnabled").defaultTo(false);
		table.boolean("twoFactorVerified").defaultTo(false);
	});
};
