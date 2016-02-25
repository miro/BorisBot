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
                const key = _.toLower(splitParams.shift());
                const value = splitParams.join(' ');
                if (key.length > 50) {
                    botApi.sendMessage({chat_id: targetId, text: 'Avain max. 50 merkkiä.'})
                    resolve();
                } else if (value.length > 250) {
                    botApi.sendMessage({chat_id: targetId, text: 'Selite max. 250 merkkiä.'})
                    resolve();
                } else {
                    db.fetchExplMadeByUser(userId, key)
                    .then(expl => {
                        if (_.isNull(expl)) {
                            db.addExpl(userId, key, value)
                            .then( () => {
                                botApi.sendMessage({ chat_id: userId, text: 'Expl "' + key + '" lisätty.'});
                                resolve();
                            });
                        } else {
                            botApi.sendMessage({ chat_id: userId, text: 'Olet jo tehnyt expl "' + key + '".'});
                            resolve();
                        }
                    })
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
            const key = _.toLower(splitParams[0]);
            if ( splitParams.length != 1 ) {
                botApi.sendMessage({chat_id: targetId, text: '!expl [avain]'});
                resolve();
            } else if ( key.length > 50 ) {
                botApi.sendMessage({chat_id: targetId, text: 'Avaimet ovat alle 50 merkkisiä.'})
                resolve();
            } else {
                db.fetchExpl(key)
                .then(expls => {
                    logger.debug(expls);
                    var msg = (expls.length === 0) ? 
                    'Expl ' + key + ' ei löytynyt.' :
                    _.sample(_.map(expls.models, n => n.get('value')));
                    botApi.sendMessage({chat_id: targetId, text: key + ': ' + msg});
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

controller.getRandomExpl = function(targetId) {
    return new Promise(function(resolve,reject) {
        db.fetchAllExpl()
        .then(entrys => {
            var key = _.sample(_.uniq(_.map(entrys, 'key')));
            db.fetchExpl(key)
            .then(expls => {
                botApi.sendMessage({ chat_id: targetId, text: key + ': ' + _.sample(_.map(expls.models, n => n.get('value'))) });
                resolve();
            })
        })
    });
}

controller.removeExpl = function(userId, targetId, params) {
    return new Promise(function(resolve,reject) {
        if (params === '') {
            botApi.sendMessage({chat_id: targetId, text: '!rm [avain]'});
            return resolve();
        }
        var splitParams = params.split(' ');
        const key = _.toLower(splitParams[0]);
        db.fetchExplMadeByUser(userId, key)
        .then( expl => {
            if (!_.isNull(expl)) {
                db.deleteExpl(userId, key)
                .then( () => {
                    botApi.sendMessage({chat_id: targetId, text: 'Expl ' + key + ' poistettu.'});
                    resolve();
                });
            } else {
                botApi.sendMessage({chat_id: targetId, text: 'Expl ' + key + ' ei löytynyt tai se ei ole sinun tekemäsi.'});
                resolve();
            }
        });
    });
}

controller.listExpls = function(targetId) {
    return new Promise(function(resolve,reject) {
        db.fetchAllExpl()
        .then(entrys => {
            var msg = _.uniq(_.map(entrys, 'key')).join(', ');
            if (msg !== '') {
                botApi.sendMessage({chat_id: targetId, text: 'Expls: ' + msg})
                resolve();
            } else {
                botApi.sendMessage( {chat_id: targetId, text: 'En löytänyt yhtään selitystä!'})
            }
        });
    });
}

module.exports = controller;