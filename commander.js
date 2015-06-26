// ### Handles all the bot commands


var Promise     = require('bluebird');
var request     = require('request');
var moment      = require('moment');

var cfg         = require('./config');
var db          = require('./database');


var commander = {};


commander.registerDrink = function(drinker, drinkType) {
    // fallback to 'kalja' if no drinkType is set
    drinkType = !drinkType ? 'kalja' : drinkType;

    return new Promise(function(resolve, reject) {
        var drink = new db.models.Drink({
            creatorId: drinker,
            drinkType: drinkType
        })
        .save()
        .then(function() {
            db.collections.Drinks
            .query('where', 'timestamp', '>=', moment().format('YYYY-MM-DD'))
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


module.exports = commander;
