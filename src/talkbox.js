// # Talkbox
//
//      This module is reponsible for handling all the messages from users which are not commands.
//      Counterpart for this file is the commander.js, which handles all the command messages

var Promise     = require('bluebird');
var request     = require('request');
var moment      = require('moment-timezone');
var _           = require('lodash');
var emoji       = require('node-emoji');
var emojiRegex  = require('emoji-regex');

var textController      = require('./controllers/textController');
var linkController      = require('./controllers/linkController');



module.exports = function(event) {
    return new Promise(function (resolve, reject) {

        // Add this message to our "history"
        textController.addMessage(event.chatGroupId, event.rawInput);

        // Check for possible links
        linkController.process(event);


        resolve();
    });
}
