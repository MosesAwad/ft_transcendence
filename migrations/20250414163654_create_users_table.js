/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable("users", (table) => {
        table.increments("id").primary();
        table
            .string("username", 50)
            .notNullable()
            .checkLength(">=", 3)
            .checkLength("<=", 50);
        table.string("email").notNullable();
        table.string("password").checkLength(">=", 6);
        table.string("google_id").unique();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable('users');
};
