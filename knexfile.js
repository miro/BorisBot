var cfg = require('./src/config');

module.exports = {

  development: {
    client: 'postgresql',
    connection: {
      database: 'borisbot',
      user:     'borisbot',
      password: 'borisbot'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  // TODO: test config?

  production: Object.assign({}, cfg.db, {
    migrations: {
      tableName: 'knex_migrations'
    }
  })
};
