// ### Handles all the bot commands


var Promise     = require('bluebird');
var request     = require('request');
var moment      = require('moment');

var cfg         = require('./config');
var db          = require('./database');


var commander = {};


commander.registerDrink = function(drinker, drinkType) {

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
                console.log('ole!', collection);
                resolve(collection);
            })
        });
    });
};

commander.getDrinksAmount = function() {
    return db.bookshelf.knex('drinks').count('id');
};

commander.sendMessage = function sendMessageToGroup(chatId, text) {
    request.post(cfg.tgApiUrl + '/sendMessage', { form: {
        chat_id: chatId,
        text: text
    }});
};


module.exports = commander;
