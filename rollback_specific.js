const knex = require('./knexfile'); // or however you export your config
const db = require('knex')(knex.development); // or .production, .test etc.

(async () => {
  await db.migrate.down({ name: '20250420174745_create_friends_table.js' });
  console.log('Migration rolled back.');
  await db.destroy();
})();
