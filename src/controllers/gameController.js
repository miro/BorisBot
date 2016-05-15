const _         = require('lodash');
const Promise   = require('bluebird');

const botApi    = require('../botApi');
const replys    = require('../replys');
const logger    = require('../logger');

const cardsAgainstHumanity = require('./games/cardsAgainstHumanity');

const GAMES = {
    ['Cards Against Humanity']: cardsAgainstHumanity
};

var controller = {};

controller.showGameKeyboard = function(event) {
    var keyboard = [_.keys(GAMES)];
    replys.sendMessageAndListenForAnswer({
        chat_id: event.userId,
        text: 'Mitä haluaisit pelata?',
        reply_markup: JSON.stringify({
            keyboard: keyboard,
            resize_keyboard: true,
            one_time_keyboard: true
        })
    })
    .then(answer => {
        GAMES[answer].start(event);
    })
    .catch(() => {
        logger.debug('User didn´t answer for game question');
    })
}

module.exports = controller;
