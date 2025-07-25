/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema.table("tournaments", (table) => {
		table.integer("creator_id").references("id").inTable("users");
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
	return knex.schema.table("tournaments", (table) => {
		table.dropColumn("creator_id");
	});
};
