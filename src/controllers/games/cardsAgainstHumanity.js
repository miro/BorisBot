const cards     = require('./coh-cards/offical');

const logger    = require('../../logger');
const botApi    = require('../../botApi');

var game = {};

game.start = function(event) {
    botApi.sendMessage({chat_id: event.userId, text: 'Coming soon..'});
}

module.exports = game;
