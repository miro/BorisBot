var cfg     = require('../config');

var _       = require('lodash');
var moment  = require('moment-timezone');

var logger  = cfg.logger;

var controller = {};

controller.hoursToExpire = 24;
controller.history = [];

controller.addMessage = function(msg) {
    if (msg === '') {
        logger.log('debug', 'textController: message is empty');
        return false;
    } else {
        controller.history.unshift([moment().unix(), msg]);
        return true;
    }
}

controller.getSummary = function() {
    if (_.isEmpty(controller.history)) {
        return 'Tiivistettävää ei löydy.'
    } else {
        // TODO: Create more complex algorithm
        var dice = Math.floor(Math.random() * controller.history.length)
        return controller.history[dice][1];
    }
}

controller.deleteExpired = function() {
    if (_.isEmpty(controller.history)) {
        return;
    } else {
        var expired = moment().unix() - (controller.hoursToExpire*3600);
        for (i=controller.history.length-1; i>=0; i--) {
            if (controller.history[i][0] < expired) {
                controller.history.pop();
            } else {
                return;
            }
        }
        return;
    }
}

module.exports = controller;