// # Talkbox
//
//      This module is reponsible for handling all the messages from users which are not commands.
//      Counterpart for this file is the commander.js, which handles all the command messages

var Promise     = require('bluebird');
var _           = require('lodash');
var crypto      = require('crypto');
var fs          = require('fs');

var textController  = require('./controllers/textController');
var linkController  = require('./controllers/linkController');
var brain           = require('./brain');
var logger          = require('./logger');
var cfg             = require('./config');


module.exports = function(event) {
    return new Promise((resolve) => {

        logger.log('debug', 'Talkbox "%s" event from user %s', event.rawInput, event.userCallName);

        // Add this message to our "history"
        textController.addMessage(event.chatGroupId, event.rawInput);

        // Check for possible links
        linkController.process(event);

        // The mainchat conversation is stored because it will be used
        // as neural network teaching material for bot
        // TODO: move this to separate module
        if (event.chatGroupId === cfg.allowedGroups.mainChatId) {
            if (!fs.existsSync(cfg.mainChatLog)) {
                fs.writeFileSync(cfg.mainChatLog,
                    'hashed_username;message;timestamp\n',
                    'utf8'
                );
            }

            // Create hash from username
            var hash = crypto.createHash('md5');
            hash.update(event.userCallName);

            fs.appendFile(cfg.mainChatLog,
                _.truncate(hash.digest('hex'), { length: 10, omission: '' }) + ';' +
                event.rawInput + ';' +
                Date.now() + '\n',
                'utf8',
                (err) => {
                    if (err) {
                        logger.error(err);
                    }
                }
            );
        }

        // Did someone say ILTAA?
        //
        // TODO: it might be useful if we would create a "declarative"
        // system in which you can input key words which then trigger
        // event calls to the brain.js
        if (event.rawInput.toLowerCase().indexOf('iltaa') >= 0) {
            console.log('lol');
            brain.answerIltaa(event);
        }

        // Always resolve
        resolve();
    });
};
