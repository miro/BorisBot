// Imports
var cfg         = require('./config');
var schema      = require('./schema');

var Promise     = require('bluebird');
var moment      = require('moment-timezone');
var _           = require('lodash');

// set default timezone to bot timezone
moment.tz.setDefault(cfg.botTimezone);

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

db.getPersonalDrinkTimesSince = function(userId, timestamp) {
    return new Promise(function (resolve, reject) {

        db.getDrinksSinceTimestampForUser(timestamp, userId)
        .then(function(collection) {
            var timestamp_arr = [];
            _.each(collection.models, function(model) {
                timestamp_arr.push(moment(model.get('timestamp')))
            });
            resolve(timestamp_arr);
        });
    });
};

db.getGroupDrinkTimesSince = function(chatGroupId, timestamp) {
    return new Promise(function (resolve, reject) {

        db.getDrinksSinceTimestamp(timestamp, chatGroupId)
        .then(function(collection) {
            var timestamp_arr = [];
            _.each(collection.models, function(model) {
                timestamp_arr.push(moment(model.get('timestamp')))
            });
            resolve(timestamp_arr);
        });
    });
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

module.exports = db;
