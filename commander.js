// ### Handles all the bot commands


var Promise     = require('bluebird');
var request     = require('request');
var moment      = require('moment-timezone');
var _           = require('lodash');

var cfg         = require('./config');
var db          = require('./database');


var commander = {};

// "Public" functions
//

commander.registerDrink = function(drinker, drinkType) {
    // fallback to 'kalja' if no drinkType is set
    drinkType = !drinkType ? 'kalja' : drinkType;

    var tresholdMoment = _getTresholdMoment();

    return new Promise(function(resolve, reject) {
        var drink = new db.models.Drink({
            creatorId: drinker,
            drinkType: drinkType
        })
        .save()
        .then(function() {
            db.collections.Drinks
            .query('where', 'timestamp', '>=', tresholdMoment.toJSON())
            .fetch()
            .then(function(collection) {
                resolve(collection);
            })
            .error(function(e) {
                console.log('Error on drink collection fetch', e);
                reject(e);
            });
        });
    });
};

commander.getDrinksAmount = function() {
    return db.bookshelf.knex('drinks').count('id');
};

commander.sendMessage = function(chatId, text) {
    request.post(cfg.tgApiUrl + '/sendMessage', { form: {
        chat_id: chatId,
        text: text
    }});
};

commander.getPersonalDrinkLog = function(userId) {
    return new Promise(function (resolve, reject) {
        
        db.collections.Drinks
        .query(function(qb) {
            qb.where({ creatorId: userId })
            .andWhere('timestamp', '>=', moment().subtract(1, 'day').toJSON());
        })
        .fetch()
        .then(function(collection) {
            var message = 'Juomasi viimeisen 24h ajalta:\n-----------\n';

            _.each(collection.models, function(model) {
                message += model.get('drinkType') + ' - ';
                message += moment(model.get('timestamp')).tz('Europe/Helsinki').format('HH:mm') + '\n';
            });

            resolve(message);
        });
    });
};


// Helper functions
//
var _getTresholdMoment = function() {
    var treshold = moment().hour(9).minute(0);

    var tresholdIsInFuture = treshold.isAfter(moment());
    if (tresholdIsInFuture) {
        treshold.subtract(1, 'day');
    }

    return treshold;
};



module.exports = commander;
