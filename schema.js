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

bookshelf.knex.schema.hasTable('locations').then(function(exists) {
    if (!exists) {
        return bookshelf.knex.schema.createTable('locations', function(t) {
            t.increments('id').primary();
            t.timestamp('timestamp').defaultTo(knex.raw('now()'));

            t.integer('creatorId');
            t.float('longitude');
            t.float('latitude');
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
models.User = bookshelf.Model.extend({
    tableName: 'users'
});
models.Location = bookshelf.Model.extend({
    tableName: 'locations'
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
collections.Locations = bookshelf.Collection.extend({
    model: models.Location
});

module.exports = {
    bookshelf: bookshelf,
    models: models,
    collections: collections
};
