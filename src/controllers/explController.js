var Promise = require('bluebird');
var _       = require('lodash');

var botApi  = require('../botApi');
var db      = require('../database');
var logger  = require('../config').logger;

var controller = {};

controller.addExpl = function(userId, targetId, params) {
    return new Promise(function(resolve,reject) {
        if (_.isEmpty(params)) {
            botApi.sendMessage({ chat_id: targetId, text: '!add [avain] [selite]'});
            resolve();
        } else {
            var splitParams = params.split(' ');
            if (splitParams.length >= 2) {
                const key = splitParams.shift();
                const value = splitParams.join(' ');
                if (key.length > 50) {
                    botApi.sendMessage({chat_id: targetId, text: 'Avain max. 50 merkkiä.'})
                    resolve();
                } else if (value.length > 250) {
                    botApi.sendMessage({chat_id: targetId, text: 'Selite max. 250 merkkiä.'})
                    resolve();
                } else {
                    db.addExpl(userId, key, value)
                    .then( () => {
                        botApi.sendMessage({ chat_id: targetId, text: 'Expl "' + key + '" added.'});
                        resolve();
                    });
                }
            } else {
                botApi.sendMessage({chat_id: targetId, text: '!add [avain] [selite]'});
                resolve();
            }
        }
    });
}

controller.getExpl = function(targetId, params) {
    return new Promise(function(resolve, reject) {
        if (_.isEmpty(params)) {
            botApi.sendMessage({chat_id: targetId, text: '!expl [avain]'});
            resolve();
        } else {
            var splitParams = params.split(' ');
            if ( splitParams.length != 1 ) {
                botApi.sendMessage({chat_id: targetId, text: '!expl [avain]'});
                resolve();
            } else if ( splitParams[0].length > 50 ) {
                botApi.sendMessage({chat_id: targetId, text: 'Avaimet ovat alle 50 merkkisiä.'})
                resolve();
            } else {
                db.fetchExpl(splitParams[0])
                .then(expl => {
                    var msg = (_.isNull(expl)) ? 
                    'Avaimella ' + splitParams[0] + ' ei löytynyt selitystä.' :
                    expl.get('value');
                    botApi.sendMessage({chat_id: targetId, text: msg});
                    resolve();
                })
                .catch(e => {
                    logger.log('error', 'Error when fetching expl: ' + e)
                    resolve();
                }); 
            }
        }
    });
}

controller.listExpls = function(userId) {
    return new Promise(function(resolve,reject) {
        db.fetchAllExpl()
        .then(entrys => {
            var msg = "Expls: ";
            msg += _.map(entrys, 'key').join(', ');
            botApi.sendMessage({chat_id: userId, text: msg})
            resolve();
        });
    });
}

module.exports = controller;