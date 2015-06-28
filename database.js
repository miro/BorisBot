// Imports
var schema      = require('./schema');

var Promise     = require('bluebird');
var _           = require('lodash');

var db = {};


// # Drink related stuff
//

// Add new drink
db.registerDrink = function(messageId, chatGroupId, drinker, drinkType) {

    var drink = new schema.models.Drink({
        messageId: messageId,
        chatGroupId: chatGroupId,
        creatorId: drinker,
        drinkType: drinkType
    })
    .save();

    return drink;
};

db.getDrinksSinceTimestamp = function(timestampMoment, chatGroupId) {

    return schema.collections.Drinks
    .query(function(qb) {
        qb.where('timestamp', '>=', timestampMoment.toJSON());

        if (!_.isNull(chatGroupId)) {
            qb.andWhere({ chatGroupId: chatGroupId });
        }
    })
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

db.getTotalDrinksAmountForGroup = function(groupId) {
    return schema.bookshelf
    .knex('drinks')
    .where({ chatGroupId: groupId })
    .count('id');
};


// proxy stuff from schema 
db.bookshelf = schema.bookshelf;
db.models = schema.models;
db.collections = schema.collections;


module.exports = db;
