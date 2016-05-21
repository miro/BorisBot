// # Brain
//
//      This module is reponsible for all the "natural" responses the bot has.
//      There isn't much yet, but in future we would like to move all the "talk logic" from controllers into
//      this module.
//
//      Controllers should only be responsible for fetching & modifying data in DB, and brain should
//      output that data to the users.
//
//      Not to be mixed with talkbox.js; it is responsible for parsing "natural language" coming from users,
//      this module is for creating "natural language" from the bot data.
var Promise         = require('bluebird');
var _               = require('lodash');

var botApi          = require('./botApi');
var explController  = require('./controllers/explController');


var brain = {};

brain.announceDrinkLogsToGroups = function announceDrinkLogsToGroups(groupLogs) {
    _.each(groupLogs, function(log, groupId) {
        var msgParts = [
            '*HUOMENTA, ja vielä kerran HUOO MEN TA! Uusi päivä!*',
            'Eilisen tykittelijät:',
            ''
        ];

        for (var user in log) {
            msgParts.push(user + ': ' + log[user] + 'kpl');
        }

        var msg = msgParts.join('\n');
        botApi.sendMessage({
            chat_id: groupId,
            text: msg,
            parse_mode: 'Markdown'
        });
    });

    return Promise.resolve();
};

brain.answerIltaa = function(event) {

    if (Math.random()*100 < 10) {
        explController.getRandomExpl(event);
    } else {
        var illat = ['iltaa','iltes','iltua','NÄYTÄ SITÄ ILTUA!','ILTAA',
            'Hyvää iltaa.', 'NÄYTÄ HERRAN TÄHDEN SITÄ ILTUA!',
            'Olisko tänään iltua?', '/iltaa <iltua>', '!expl iltua',
            'Sinun kannattaa ensiksi täyttää profiilisi, että muut voivat tutustua sinuun.',
            'velu: homo', '#spännimobi: kannattaa tulla kanavalle, niin saat tietoa tulevista tapahtumista',
            'spinni: huono, mutta köyhä kerho', 'millan "panoilta"', 'AI KAUHEE'];

        botApi.sendMessage({chat_id: event.targetId, text: _.sample(illat)});
    }
}

module.exports = brain;
