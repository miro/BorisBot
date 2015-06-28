// Imports
var schema      = require('./schema');

var Promise     = require('bluebird');

var db = {};


// # Drink related stuff
//

// Add new drink
db.registerDrink = function(chatGroupId, drinker, drinkType) {

    var drink = new schema.models.Drink({
        chatGroupId: chatGroupId,
        creatorId: drinker,
        drinkType: drinkType
    })
    .save();

    return drink;
};

db.getDrinksSinceTimestamp = function(timestampMoment) {
    return schema.collections.Drinks
    .query('where', 'timestamp', '>=', timestampMoment.toJSON())
    .fetch();
};


db.getDrinksSinceTimestampForUser = function(timestampMoment, userId) {
    return schema.collections.Drinks
    .query(function(qb) {
        qb.where({ creatorId: userId })
        .andWhere('timestamp', '>=', timestampMoment.toJSON());
    })
    .fetch()
};

db.getTotalDrinksAmount = function() {
    return schema.bookshelf.knex('drinks').count('id');
};


// proxy stuff from schema 
db.bookshelf = schema.bookshelf;
db.models = schema.models;
db.collections = schema.collections;


module.exports = db;
