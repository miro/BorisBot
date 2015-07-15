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
        .andWhere('timestamp', '>=', timestampMoment.toJSON())
        .orderBy('timestamp');
    })
    .fetch()
};

db.getDrinkOnTimestampForUser = function(userId, timestampMoment) {
    return schema.collections.Drinks
    .query(function(qb) {
        qb.where('timestamp', '=', timestampMoment.toJSON())
        .andWhere( {creatorId: userId} );
    })
    .fetchOne()
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

// TODO: unite this and getFristTimestampForGroup by parametrizing isGroup info
db.getFirstTimestampForUser = function(userId) {
    return schema.bookshelf
    .knex('drinks')
    .where( {creatorId: userId} )
    .min('timestamp')
};

db.getFirstTimestampForGroup = function(groupId) {
    return schema.bookshelf
    .knex('drinks')
    .where( {chatGroupId: groupId} )
    .min('timestamp')
};

db.getLastDrinkBeforeTimestamp = function(userId, timestampMoment) {
    return schema.collections.Drinks
    .query(function(qb) {
        qb.where({ creatorId: userId })
        .andWhere('timestamp', '<', timestampMoment.toJSON());
    })
    .fetchOne();
};

db.getNextDrinkAfterTimestamp = function(userId, timestampMoment) {
    return schema.collections.Drinks
    .query(function(qb) {
        qb.where({ creatorId: userId })
        .andWhere('timestamp', '>', timestampMoment.toJSON());
    })
    .fetchOne();
};

db.getDrinksSinceTimestampSortedForUser = function(userId, timestampMoment) {
    return schema.bookshelf
    .knex('drinks')
    .where( {creatorId: userId} )
    .andWhere('timestamp','>', timestampMoment.toJSON())
    .orderBy('timestamp', 'asc');
};




// ## Users related stuff
//

// Register new user without primaryGroupId
db.registerUser = function(id, userName, firstName, lastName, weight, isMale) {
    var user = new schema.models.User({
        telegramId: id,
        userName: userName,
        firstName: firstName,
        lastName: lastName,
        weight: weight,
        isMale: isMale
    })
    .save();

    return user;
};

db.removeUser = function(id) {
    return schema.bookshelf
    .knex('users')
    .where({ telegramId: id })
    .del();
};

// Update primaryGroupId for existing user
db.updatePrimaryGroupIdToUser = function(userId, groupId, groupName) {
    return schema.bookshelf
    .knex('users')
    .where({ telegramId: userId })
    .update({
        primaryGroupId: groupId,
        primaryGroupName: groupName
    });
};

// TODO: remove this function, use getUserById instead (and check if result is null)
db.checkIfIdInUsers = function(id) {
    return new Promise(function (resolve, reject) {
        schema.bookshelf.knex('users').where({ telegramId: id }).count('id')
        .then( function fetchOk(result) {
            if (result[0].count > 0) {
                resolve(true);
            } else {
                resolve(false);
            };
        });
    });
};

db.getUserById = function(userId) {

    return schema.collections.Users
    .query(function(qb) {
        qb.where({ telegramId: userId })
    })
    .fetchOne();
};


module.exports = db;
