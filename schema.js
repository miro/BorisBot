var config = require('./config');

var Promise = require('bluebird');
var knex = require('knex')(config.db);
var bookshelf = require('bookshelf')(knex);


// Database definitions
bookshelf.knex.schema.hasTable('drinks').then(function(exists) {
    if (!exists) {
        return bookshelf.knex.schema.createTable('drinks', function(t) {
            t.increments('id').primary();
            t.timestamp('timestamp').defaultTo(knex.raw('now()'));
            t.integer('creatorId'); // later: reference to user-table?
            t.integer('chatGroupId');

            t.integer('messageId');

            t.string('drinkType', 50);
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


// Model definitions
var models = {};
models.Drink = bookshelf.Model.extend({
    tableName: 'drinks'
});
models.Expl = bookshelf.Model.extend({
    tableName: 'expls'
});


var collections = {};
collections.Drinks = bookshelf.Collection.extend({
    model: models.Drink
});
collections.Expls = bookshelf.Collection.extend({
    model: models.Expl
});

module.exports = {
    bookshelf: bookshelf,
    models: models,
    collections: collections
};
