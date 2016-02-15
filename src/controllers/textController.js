var cfg     = require('../config');

var _       = require('lodash');
var moment  = require('moment-timezone');

var logger  = cfg.logger;

var controller = {};

// TODO: rename this to something more describing... logController?

controller.hoursToExpire = 24;
controller.history = {};

controller.addMessage = function(chatId, msg) {
    if (_.isNull(chatId) || msg === '') {
        logger.log('debug', 'textController: message was empty or didn´t come from group chat');
        return false;
    } else {
        if (_.isUndefined(controller.history[chatId])) {
            controller.history[chatId] = [];
        }
        var maxSize = 2000; // Max size of message list
        if (controller.history[chatId].length >= maxSize) {
            logger.log('warn', 'textController: maximum list size (%d) reached on chatId %s', maxSize, chatId)
            controller.history[chatId].pop();
        }
        controller.history[chatId].unshift([moment().unix(), msg]);
        return true;
    }
}

controller.getSummary = function(chatId, n) {
    if (_.isUndefined(controller.history[chatId]) || _.isEmpty(controller.history[chatId])) {
        return 'Tiivistettävää ei löydy.';
    } else {
        // TODO: Create more complex algorithm
        var dice = _.ceil(Math.random() * n);
        return controller.history[chatId][dice][1];
    }
}

controller.deleteExpired = function() {
    if (_.isEmpty(controller.history)) {
        return;
    } else {
        var expired = moment().unix() - (controller.hoursToExpire*3600);
        _.forEach(controller.history, function(groupMsgs) {
            for (var i = groupMsgs.length-1; i >= 0; i--) {
                if (groupMsgs[i][0] < expired) {
                    groupMsgs.pop();
                } else {
                    return;
                }
            }
        });
        return;
    }
}

module.exports = controller;
