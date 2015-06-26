// ### Handles all the bot commands


var Promise     = require('bluebird');
var request     = require('request');

var cfg         = require('./config');
var db          = require('./database');


var commander = {};


commander.registerDrink = function(drinker, drinkType) {
    var drink = new db.models.Drink({
        creatorId: msg.from.id,
        drinkType: 'kalja'
    });

    return drink.save();  
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
