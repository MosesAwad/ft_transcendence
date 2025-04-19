const axios = require("axios");

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
	// Delete all users
	await knex("users").del();

	// Reset auto-increment ID for SQLite
	await knex.raw("DELETE FROM sqlite_sequence WHERE name='users'");

	//   // Define the users you want to seed
	//   const users = [
	//     { username: 'alice', email: 'alice@example.com', password: 'test123' },
	//     { username: 'bob', email: 'bob@example.com', password: 'test123' },
	//     { username: 'charlie', email: 'charlie@example.com', password: 'test123' },
	//   ];

	//   // Loop through each user and register them via the API
	//   for (let user of users) {
	//     try {
	//       // Assuming your registration endpoint is POST /register
	//       await axios.post('http://localhost:3000/register', user); // Adjust URL to your server's registration endpoint
	//         console.log('successfuly registered user: ', user.username)
	//     } catch (error) {
	//       console.error('Error registering user:', user.username, error);
	//     }
	//   }
};
