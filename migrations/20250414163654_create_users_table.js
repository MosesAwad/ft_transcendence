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
        table.string("email").notNullable().unique();
        table.string("password").notNullable().checkLength(">=", 6);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable('users');
};
