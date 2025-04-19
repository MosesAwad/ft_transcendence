/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema.createTable("tokens", (table) => {
		table.increments("id").primary();
		table.string("refresh_token_id").notNullable();
		table.string("ip").notNullable();
		table.string("user_agent").notNullable();
		table.boolean("is_valid").defaultTo(true);
		table
			.integer("user_id")
			.references("id")
			.inTable("users")
			.notNullable()
			.onDelete("CASCADE");
		table.timestamps(true, true);
		// table.unique("user_id"); Why is this commented out? Check Note 1
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
	return knex.schema.dropTable("tokens");
};

/*
    NOTES

    Note 1

        If you set the user_id to unique, that means each user can only be issued one refresh token! That's not good because then, a user 
        would not be able to login from multiple devices and thus, have multiple "sessions".
*/
