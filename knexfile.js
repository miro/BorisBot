var _   = require('lodash');
var cfg = require('./src/config');

var knexCfg = {};

knexCfg.development = _.cloneDeep(cfg.db);
knexCfg.development.migrations = {
    tableName: 'knex_migrations'
};

// TODO: test config?

knexCfg.production = _.cloneDeep(cfg.db);
knexCfg.production.migrations = {
    tableName: 'knex_migrations'
};

module.exports = knexCfg;
