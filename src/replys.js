var events  = require('events');
var Promise = require('bluebird');

var botApi  = require('./botApi');

var replys  = {};

replys.eventEmitter = new events.EventEmitter();

// Creates event listener, which reacts to the user's reply
replys.sendMessageAndListenForReply = function(targetId, msg) {
    return new Promise(function(resolve,reject) {
        botApi.sendMessage({ chat_id: targetId, text: msg, reply_markup: JSON.stringify({force_reply: true})})
        .then(function(response) {
            response = JSON.parse(response);

            // Create event listener
            replys.eventEmitter.on(response.result.message_id, function(reply) {
                replys.eventEmitter.removeAllListeners([response.result.message_id]);
                resolve(reply);
            });

            // Delete event listener if no event in 15min
            setTimeout(function() {
                replys.eventEmitter.removeAllListeners([response.result.message_id]);
                reject();
            }, 900000);
        });
    });
}

module.exports = replys;
