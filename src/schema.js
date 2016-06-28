var config      = require('./config');

var Promise     = require('bluebird');
var knex        = require('knex')(config.db);
var bookshelf   = require('bookshelf')(knex);


var models = {};

models.Group = bookshelf.Model.extend({
    tableName: 'groups'
});
models.User = bookshelf.Model.extend({
    tableName: 'users'
});
models.Drink = bookshelf.Model.extend({
    tableName: 'drinks',
    drinker: function() {
        return this.belongsTo(models.User, 'drinker_id');
    }
});
models.Expl = bookshelf.Model.extend({
    tableName: 'expls'
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
