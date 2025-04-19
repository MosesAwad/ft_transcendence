module.exports = {
    development: {
      client: 'sqlite3',
      connection: {
        filename: './db/application.sqlite3' // Your SQLite file path
      },
      migrations: {
        directory: './migrations'
      },
      useNullAsDefault: true, // ← This silences the warning
      seeds: {
        directory: './seeds'
      }
    }
  };
  