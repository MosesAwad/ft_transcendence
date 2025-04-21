const knex = require('./knexfile'); // or however you export your config
const db = require('knex')(knex.development); // or .production, .test etc.

(async () => {
  await db.migrate.down({ name: '20250414173548_create_friends_tables.js' });
  console.log('Migration rolled back.');
  await db.destroy();
})();
