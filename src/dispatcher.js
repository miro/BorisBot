// ### Parses messages coming from Telegram webhook, dispatches them to bot commands

var Promise     = require('bluebird');
var _           = require('lodash');
var emojiRegex  = require('emoji-regex');

var cfg         = require('./config');
var replys      = require('./replys');
var logger      = cfg.logger;

var commander   = require('./commander');
var talkbox     = require('./talkbox');


module.exports = function parseTelegramEvent(msg) {
    logger.log('debug', 'Webhook event from id %s, message: %s', msg.from.id, msg.text);

    // # Parse the message into "event"-object which is passed forward to commander or talkbox
    var event = {};

    if (!msg.text) {
        logger.log('debug', 'No text on event, ignore');
        return Promise.resolve();
    }

    event.rawInput = msg.text;
    event.eventId = msg.message_id;
    event.isCommand = (event.rawInput.charAt(0) !== '/' && !emojiRegex().test(event.rawInput.split(' ')[0]) && event.rawInput.charAt(0) !== '!');

    // Parse metadata from the message
    event.userId = msg.from.id;
    event.userName = msg.from.username;
    event.userFirstName = msg.from.first_name;
    event.userLastName = msg.from.last_name;
    event.userCallName = _.isUndefined(event.userName) ? userFirstName : ('@' + event.userName); // this can be used on messages

    event.isFromGroup = !_.isUndefined(msg.chat.title);
    event.chatGroupId = event.isFromGroup ? msg.chat.id : null;
    event.chatGroupTitle = event.isFromGroup ? msg.chat.title : null;

    // Check if user is ignored
    var userIsIgnored = cfg.ignoredUsers.indexOf(event.userId) >= 0;
    if (userIsIgnored) {
        // do nothing
        logger.log('warn', 'Ignored user tried to use bot, username: %s', event.userCallName);
        return Promise.resolve();
    }


    // Parse command & possible parameters
    event.userInput = msg.text.split(' ');
    event.userCommand = event.userInput.shift().toLowerCase().split('@')[0];
    event.userCommandParams = event.userInput.join(' ');

    event.targetId = (event.isFromGroup) ? event.chatGroupId : event.userId;

    // # -> Dispatch the event based on its type
    // TODO: do we really want to handle replies in this way?
    if (msg.reply_to_message) {
        logger.log('debug', 'Got reply to previous message, passing handling to replys-module');
        replys.eventEmitter.emit(msg.reply_to_message.message_id, event.rawInput);
        return Promise.resolve();
    } else if (event.isCommand) {
        return talkbox(event);
    } else {
        return commander(event);
    }
};
