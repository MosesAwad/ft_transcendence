const knex = require("knex");

const connectDB = (dbName) => {
  const knexInstance = knex({
    client: "sqlite3",
    connection: {
      filename: `./db/${dbName}.sqlite3`,
    },
    useNullAsDefault: true, // Required for SQLite
    pool: {
      afterCreate: (conn, cb) => {
        conn.run("PRAGMA foreign_keys = ON", cb); // Ensables foreign key constraints
      },
    },
  });
  return knexInstance;
};

module.exports = connectDB;

/*

    const sqlite3 = require('sqlite3').verbose()    // verbose means display log messages to file/console
    const { open } = require('sqlite')  // the modern async api, without it callback hell

    const connectDB = async (dbName) => {
        const db = await open({
            filename: `./db/${dbName}.db`,
            driver: sqlite3.Database,
            mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE // Note 1
        });
        return db;
    }

*/
