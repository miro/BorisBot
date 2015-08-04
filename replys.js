var events = require('events');
var Promise = require('bluebird');

var botApi = require('./botApi');

var replys = {};

replys.eventEmitter = new events.EventEmitter();

replys.sendMessageAndListenForReply = function(targetId, msg) {
    return new Promise(function(resolve,reject) {
        botApi.sendMessage(targetId, msg, {force_reply: true})
        .then(function(response) {
            response = JSON.parse(response);
            replys.eventEmitter.on(response.result.message_id, function(reply) {
                replys.eventEmitter.removeAllListeners([response.result.message_id]);
                resolve(reply);
            });
        });
    });
}

module.exports = replys;