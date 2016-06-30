var Promise                 = require('bluebird');
var _                       = require('lodash');

var botApi                  = require('../botApi');
var ExplModel               = require('../schema').models.Expl;
var db                      = require('../database');
var logger                  = require('../logger');

var controller = {};

const EXPL_VALUE_MAX_LENGTH = 250;
const EXPL_KEY_MAX_LENGTH = 50;
const MAXIMUM_MESSAGE_SIZE = 4096;

// When getting random expl, choose one key from this array
var EXPL_KEYS = [];

controller.updateRexplKeys = function() {
    db.fetchAllExpl()
    .then((entrys) => {
        EXPL_KEYS = _.map(entrys, 'key');
    });
};

controller.addExpl = function(event) {
    const chat_id = event.targetId;

    var paramParts = event.userCommandParams ? event.userCommandParams.split(' ') : [];
    const eventCanBeNewExpl = event.replyToMessage || paramParts.length > 1;
    if (!eventCanBeNewExpl) {
        // -> advise the user and abort
        botApi.sendMessage({ chat_id, text: '!add [avain] [selite]' });
        return Promise.resolve();
    }

    const key = _.toLower(paramParts.shift());
    if (key.length > 50) {
        botApi.sendMessage({ chat_id, text: 'Avain max. 50 merkkiä.' });
        return Promise.resolve();
    }

    var explanation = {
        creatorId: event.userId,
        key
    };

    // -> Figure out the explanation value for this key
    if (event.replyToMessage) {
        explanation.messageId = event.replyToMessage.message_id;
        explanation.chatId = event.replyToMessage.chat.id;
    } else {
        explanation.value = paramParts.join(' ');
        if (explanation.value.length > EXPL_VALUE_MAX_LENGTH) {
            botApi.sendMessage({
                chat_id,
                text: 'Selite max. ' + EXPL_VALUE_MAX_LENGTH + ' merkkiä.'
            });
            return Promise.resolve();
        }
    }

    return ExplModel.forge({ creatorId: event.userId, key })
    .fetch()
    .then(existingModel => {
        if (existingModel) {
            botApi.sendMessage({
                chat_id: event.userId,
                text: 'Olet jo tehnyt "' + key + '"-explin.'
            });
            return Promise.resolve();
        } else {
            return new ExplModel(explanation)
            .save()
            .then(newModel => {
                EXPL_KEYS.push(key);
                botApi.sendMessage({
                    chat_id: event.userId,
                    text: 'Expl "' + newModel.get('key') + '" lisätty.'
                });
            });
        }
    });
};

controller.getExpl = function(event) {
    // event.targetId, event.userCommandParams
    const chat_id = event.targetId;
    var paramParts = event.userCommandParams ? event.userCommandParams.split(' ') : [];

    if (paramParts.length === 0) {
        botApi.sendMessage({ chat_id, text: '!expl [avain]' });
        return Promise.resolve();
    }

    const key = _.toLower(paramParts[0]);

    if (key.length > EXPL_KEY_MAX_LENGTH) {
        botApi.sendMessage({ chat_id, text: 'Avaimet ovat alle 50 merkkisiä.' });
        return Promise.resolve();
    }

    return db.fetchExpl(key)
    .then(explanations => {
        if (explanations.length === 0) {
            return botApi.sendMessage({ chat_id, text: 'Expl ' + key + ' ei löytynyt.' });
        } else {
            var index = _.toInteger(paramParts[1]);
            var explModelToEcho = (index > 0 && index <= explanations.models.length) ?
                explanations.models[index - 1] :
                _.sample(explanations.models);
            return echoExplanation(explModelToEcho, event);
        }
    })
    .catch(e => {
        logger.log('error', 'Error when fetching expl: ' + e);
        return Promise.resolve();
    });
};

controller.getRandomExpl = function(event) {
    return new Promise((resolve) => {

        db.fetchAllExpl() // TODO this is completely useless call(??)
        .then(() => {
            db.fetchExpl(_.sample(_.uniq(EXPL_KEYS)))
            .then(expls => {
                echoExplanation(_.sample(expls.models), event)
                .then(resolve);
            });
        });
    });
};

controller.removeExpl = function(userId, targetId, params) {
    return new Promise((resolve) => {

        if (params === '') {
            botApi.sendMessage({ chat_id: targetId, text: '!rm [avain]' });
            return resolve();
        }
        var splitParams = params.split(' ');
        const key = _.toLower(splitParams[0]);
        db.fetchExplMadeByUser(userId, key)
        .then(expl => {
            if (!_.isNull(expl)) {
                return db.deleteExpl(userId, key).then(() => {
                    _.pullAt(EXPL_KEYS, _.indexOf(EXPL_KEYS, key));
                    botApi.sendMessage({ chat_id: targetId, text: 'Expl ' + key + ' poistettu.' });
                    return resolve();
                });
            } else {
                botApi.sendMessage({
                    chat_id: targetId,
                    text: 'Expl ' + key + ' ei löytynyt tai se ei ole sinun tekemäsi.'
                });
                return resolve();
            }
        });
    });
};

controller.listExpls = function(event) {
    return new Promise((resolve) => {

        var paramParts = event.userCommandParams ? event.userCommandParams.split(' ') : [];

        if (paramParts.length === 0) {
            botApi.sendMessage({ chat_id: event.targetId, text: '!ls <avaimen alku>' });
            return Promise.resolve();
        }

        const keyLike = _.toLower(paramParts[0]);

        return db.fetchExplsLike(keyLike).then(entrys => {

            // Count how many keys with same name found
            var keys = _.countBy(_.map(entrys.models, (model) => model.get('key')));

            // If there is more than one of the same key, show it on the message
            keys = _.map(keys, (value, key) => {
                if (value > 1) {
                    return key + ' <code>[' + value + ']</code>';
                } else {
                    return key;
                }
            });

            keys = _.join(keys, ', ');

            if (keys.length > MAXIMUM_MESSAGE_SIZE) {
                botApi.sendMessage({
                    chat_id: event.targetId,
                    text: 'Avaimia löytyi liikaa, rajaa hakua tarkemmin.'
                });
            } else if (keys === '') {
                botApi.sendMessage({
                    chat_id: event.targetId,
                    text: 'En löytänyt yhtään selitystä!'
                });
            } else {
                botApi.sendMessage({
                    chat_id: event.targetId,
                    text: keys,
                    parse_mode: 'HTML'
                });
            }
            resolve();
        });
    });
};

function echoExplanation(explModel, requestingEvent) {
    // this expl is echoed - increase the "fetch count"
    db.increaseExplEchoCount(explModel.get('id'));

    if (explModel.get('messageId')) {

        // this expl is a reference to older message
        botApi.forwardMessage({
            chat_id: requestingEvent.targetId,
            from_chat_id: explModel.get('chatId'),
            message_id: explModel.get('messageId'),
            disable_notification: true
        });
    } else {
        botApi.sendMessage({
            chat_id: requestingEvent.targetId,
            text: explModel.get('key') + ': ' + explModel.get('value')
        });
    }

    return Promise.resolve();
}

module.exports = controller;
