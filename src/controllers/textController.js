var _       = require('lodash');
var moment  = require('moment-timezone');

var log  = require('../logger');
var botApi = require('../botApi');


var controller = {};

// TODO: rename this to something more describing... logController?

controller.hoursToExpire = 24;
controller.history = {};

controller.addMessage = function(chatId, msg) {
    if (_.isNull(chatId) || msg === '') {
        log.debug('message was empty or didn´t come from group chat');
        return false;
    } else {
        if (_.isUndefined(controller.history[chatId])) {
            controller.history[chatId] = [];
        }
        var maxSize = 2000; // Max size of message list
        if (controller.history[chatId].length >= maxSize) {
            log.warn('maximum list size (%d) reached on chatId %s', maxSize, chatId);
            controller.history[chatId].pop();
        }
        controller.history[chatId].unshift([moment().unix(), msg]);
        return true;
    }
};

controller.getSummary = function(event) {
    return new Promise((resolve, reject) => {
        if (!event.isFromGroup) {
            botApi.sendMessage({ chat_id: event.userId, text: 'Tämä komento toimii vain ryhmästä!' });
            return resolve();
        }
        var history = controller.history[event.chatGroupId];
        if (_.isUndefined(history) || _.isEmpty(history)) {
            botApi.sendMessage({ chat_id: event.userId, text: 'Tiivistettävää ei löydy.'});
            return resolve();
        }

        var param = (_.isFinite(event.userCommandParams.split(' ')[0]))
        ? event.userCommandParams.split(' ')[0]
        : 1000;

        param = (param < history.length) ? param : history.length;

        // TODO: Create more complex algorithm
        var dice = _.floor(Math.random() * param);

        botApi.sendMessage({
            chat_id: event.chatGroupId,
            text: history[dice][1]
        });
        return resolve();
    })

};

controller.deleteExpired = function() {
    if (_.isEmpty(controller.history)) {
        return;
    } else {
        var expired = moment().unix() - (controller.hoursToExpire * 3600);
        _.forEach(controller.history, (groupMsgs) => {
            for (var i = groupMsgs.length - 1; i >= 0; i--) {
                if (groupMsgs[i][0] < expired) {
                    groupMsgs.pop();
                } else {
                    return;
                }
            }
        });
        return;
    }
};

module.exports = controller;
