const request   = require('request');
const _         = require('lodash');
const Promise   = require('bluebird');
const emoji     = require('node-emoji');

const cfg       = require('../config');
const logger    = require('../logger');
const botApi    = require('../botApi');

var controller = {};

controller.fetchImage = function(event) {
    return new Promise(function(resolve, reject) {
        if (!cfg.bingApiKey) {
            botApi.sendMessage({ chat_id: event.targetId, text: 'Ei tällähetkellä käytössä.' });
            return resolve();
        }

        var query = event.userCommandParams;

        if (!query) {
            botApi.sendMessage({ chat_id: event.targetId, text: '!g <hakusanat>' });
            return resolve();
        }

        request.get({
            url: 'https://bingapis.azure-api.net/api/v5/images/search',
            headers: {
                'Ocp-Apim-Subscription-Key': cfg.bingApiKey
            },
            qs: {
                q: query,
                count: 10,
                offset: Math.round(Math.random() * 30),
                mkt: 'fi-FI',
                safeSearch: 'Off'
            }
        },
        function(err, resp, body) {
            if (!err) {
                var info = JSON.parse(body);
                if (_.isEmpty(info.value)) {
                    botApi.sendMessage({ chat_id: event.targetId, text: 'En löytänyt yhtään kuvaa ' + emoji.get(':frowning:') });
                    resolve();
                } else {
                    var img = _.sample(info.value);
                    botApi.sendMessage({ chat_id: event.targetId, text: '<b>' + img.name + '</b>\n\n' + img.contentUrl, parse_mode: 'HTML' });
                    resolve();
                }
            } else {
                logger.error(err);
                reject(err);
            }
        });
    });
};

module.exports = controller;
