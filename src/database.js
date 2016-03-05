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
db.registerDrink = function(messageId, chatGroupId, drinker, drinkType, drinkValue, userModel) {

    var drinkVal = (!_.isNull(drinkValue)) ? drinkValue : 10;
    const userId = userModel ? userModel.get('id') : null;

    var drink = new schema.models.Drink({
        messageId: messageId,
        chatGroupId: chatGroupId,
        drinker_telegram_id: drinker,
        drinker_id: userId,
        drinkType: drinkType,
        drinkValue: drinkVal
    })
    .save();

    return drink;
};

db.getDrinksSinceTimestamp = function(minTimestamp, whereObject) {

    return schema.collections.Drinks
    .query(function(qb) {
        qb.where('timestamp', '>=', minTimestamp.toJSON());

        if (whereObject) {
            qb.andWhere(whereObject);
        }
    })
    .fetch({ withRelated: ['drinker'] });
};


db.getCount = function(tableName, whereObject, minTimestamp, alcoholic) {
    return new Promise(function(resolve, reject) {
        whereObject = whereObject || {};

        var query = schema.bookshelf
        .knex(tableName)
        .where(whereObject);

        if (minTimestamp) {
            query.where('timestamp', '>=', minTimestamp);
        }
        if (alcoholic) {
            query.where('drinkValue', '>', 0);
        } else {
            query.where('drinkValue', '=', 0);
        }
        // execute
        query.count('id')
        .then(function(result) {
            resolve(result[0].count);
        })
        .catch(reject);
    });
};


db.getOldest = function(tableName, whereObject) {
    return schema.bookshelf
    .knex(tableName)
    .where(whereObject)
    .min('timestamp')
};


db.getLastDrinkBeforeTimestamp = function(userId, timestampMoment) {
    return schema.collections.Drinks
    .query(function(qb) {
        qb.where({ drinker_telegram_id: userId })
        .andWhere('timestamp', '<', timestampMoment.toJSON());
    })
    .fetchOne();
};

db.getNextDrinkAfterTimestamp = function(userId, timestampMoment) {
    return schema.collections.Drinks
    .query(function(qb) {
        qb.where({ drinker_telegram_id: userId })
        .andWhere('timestamp', '>', timestampMoment.toJSON());
    })
    .fetchOne();
};

// TODO remove this function?
db.getDrinksSinceTimestampSortedForUser = function(userId, timestampMoment) {
    return schema.bookshelf
    .knex('drinks')
    .where( {drinker_telegram_id: userId} )
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

db.getUsersByPrimaryGroupId = function(chatGroupId) {

    return schema.collections.Users
    .query(function(qb) {
        qb.where({ primaryGroupId: chatGroupId })
    })
    .fetch();
};

db.getUserById = function(userId) {
    return schema.collections.Users
    .query(qb => qb.where({ telegramId: userId }))
    .fetchOne();
};

db.getUserByName = function(userName) {
    return schema.collections.Users
    .query(qb => qb.where({ userName: userName }))
    .fetchOne();
}

// ## Expl related stuff
//

db.fetchExpl = function(key) {
    return schema.collections.Expls
    .query(qb => qb.where({ key: key}))
    .fetch();
}

db.fetchAllExpl = function() {
    return schema.bookshelf
    .knex('expls')
    .orderBy('key', 'asc');
}

db.fetchExplMadeByUser = function(userId, key) {
    return schema.collections.Expls
    .query(qb => qb.where({ creatorId: userId, key: key }))
    .fetchOne();
}

db.deleteExpl = function(userId, key) {
    return schema.bookshelf
    .knex('expls')
    .where({ creatorId: userId, key: key })
    .del();
}

module.exports = db;
