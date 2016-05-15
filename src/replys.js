var events  = require('events');
var Promise = require('bluebird');

var botApi  = require('./botApi');

var replys  = {};

replys.eventEmitter = new events.EventEmitter();

// Creates event listener, which reacts to the user's reply
replys.sendMessageAndListenForReply = function(options) {
    return new Promise(function(resolve,reject) {
        if (!options.reply_markup) {
            options.reply_markup = JSON.stringify({force_reply: true});
        }
        botApi.sendMessage(options)
        .then(function(response) {
            response = JSON.parse(response);
            createListeners(response.result.message_id)
            .then(reply => {
                resolve(reply);
            })
            .catch(reject);
        });
    });
}

replys.sendMessageAndListenForAnswer = function(options) {
    return new Promise(function(resolve,reject) {
        botApi.sendMessage(options)
        .then(function(response) {
            response = JSON.parse(response);
            createListeners(response.result.chat.id)
            .then(reply => {
                resolve(reply);
            })
            .catch(reject);
        });
    });
}

function createListeners(eventId) {
    return new Promise(function(resolve,reject) {
        // Create event listener
        replys.eventEmitter.on(eventId, function(reply) {
            replys.eventEmitter.removeAllListeners([eventId]);
            resolve(reply);
        });

        // Delete event listener if no event in 15min
        setTimeout(function() {
            replys.eventEmitter.removeAllListeners([eventId]);
            reject();
        }, 900000);
    });
}

module.exports = replys;
