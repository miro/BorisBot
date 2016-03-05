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

module.exports = brain;
