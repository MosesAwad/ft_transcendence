/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema.createTable("friendships", (table) => {
		table.increments("id").primary();
		table
			.integer("user_id")
			.references("id")
			.inTable("users")
			.onDelete("CASCADE");
		table
			.integer("friend_id")
			.references("id")
			.inTable("users")
			.onDelete("CASCADE");

		// This status replaces friend_requests logic from an older, prototypal, deleted migration
		table
			.enum("status", ["pending", "accepted", "blocked"])
			.notNullable()
			.defaultTo("pending");

		table.timestamps(true, true);

		table.unique(["user_id", "friend_id"]); // Note 1
	});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
	return knex.schema.dropTableIfExists("friendships");
};

/*
    NOTES

    Note 1
    
        SQL UNIQUE does not prevent strictly prevent bidirectional duplicates, it only applies in one direction. Here is what 
        that means:

            * user_id = 1, friend_id = 2 ✅
            * user_id = 2, friend_id = 1 ❌ ← this is still allowed, because it's not the same tuple.

        So what does it do?

            SQL UNIQUE only applies to the exact combo in the given order.
            So (1, 2) ≠ (2, 1) in its eyes.

*/
