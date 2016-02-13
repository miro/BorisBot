var config      = require('./config');

var Promise     = require('bluebird');
var knex        = require('knex')(config.db);
var bookshelf   = require('bookshelf')(knex);

// TODO:
// - it would be more postgres-y if all the column names would be snake_case (or wth it is).
//   For now I am creating new columns with that style, it will mix up the codebase but...


// Database definitions
bookshelf.knex.schema.hasTable('drinks').then(function(exists) {
    if (!exists) {
        return bookshelf.knex.schema.createTable('drinks', function(t) {
            t.increments('id').primary();
            t.timestamp('timestamp').defaultTo(knex.raw('now()'));
            t.integer('creatorId'); // later: reference to user-table?
            t.integer('chatGroupId');

            t.integer('messageId');

            t.string('drinkType', 140);
            t.integer('drinkValue').defaultTo(10);
        });
    }
});

bookshelf.knex.schema.hasTable('expls').then(function(exists) {
    if (!exists) {
        return bookshelf.knex.schema.createTable('expls', function(t) {
            t.increments('id').primary();
            t.timestamp('timestamp').defaultTo(knex.raw('now()'));
            t.integer('creatorId'); // later: reference to user-table?

            t.string('key', 50);
            t.string('value', 250);
        });
    }
});



bookshelf.knex.schema.hasTable('users').then(function(exists) {
    if (!exists) {
        return bookshelf.knex.schema.createTable('users', function(t) {
            t.increments('id').primary();

            t.integer('telegramId');
            t.string('userName', 100).unique();
            t.string('firstName', 100);
            t.string('lastName', 100);

            t.integer('primaryGroupId');
            t.string('primaryGroupName', 100);

            t.integer('weight').defaultTo(65);
            t.boolean('isMale').defaultTo(true);
        });
    }
});

bookshelf.knex.schema.hasTable('groups').then(function(exists) {
    if (!exists) {
        return bookshelf.knex.schema.createTable('groups', function(t) {
            t.increments('id').primary();
            t.timestamp('found_at').defaultTo(knex.raw('now()'));

            t.string('name', 400);
            t.integer('telegram_group_id').unique();
        });
    }
});

bookshelf.knex.schema.hasTable('links').then(function(exists) {
    if (!exists) {
        return bookshelf.knex.schema.createTable('links', function(t) {
            t.increments('id').primary();
            t.timestamp('timestamp').defaultTo(knex.raw('now()'));

            t.string('url', 400);
            t.integer('original_link_message_id');

            t.integer('times_linked').defaultTo(1); // NOTE: group-based

            t.integer('group_id')
                .unsigned()
                .references('id')
                .inTable('groups')
                .onDelete('SET NULL');

            t.integer('telegram_group_id');

            t.unique(['url', 'group_id']);

            t.integer('linker_telegram_id');
        });
    }
});



// Model definitions
var models = {};

models.Group = bookshelf.Model.extend({
    tableName: 'groups'
});
models.Drink = bookshelf.Model.extend({
    tableName: 'drinks'
});
models.Expl = bookshelf.Model.extend({
    tableName: 'expls'
});
models.User = bookshelf.Model.extend({
    tableName: 'users'
});
models.Link = bookshelf.Model.extend({
    tableName: 'links',
    group: function() {
        return this.belongsTo(models.Group, 'group_id');
    },
    linker: function() {
        return this.belongsTo(models.User, 'linker_id');
    }
});


var collections = {};
collections.Drinks = bookshelf.Collection.extend({
    model: models.Drink
});
collections.Expls = bookshelf.Collection.extend({
    model: models.Expl
});
collections.Users = bookshelf.Collection.extend({
    model: models.User
});


module.exports = {
    bookshelf: bookshelf,
    models: models,
    collections: collections
};
