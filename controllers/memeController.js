var _       = require('lodash');
var Promise = require('bluebird');
var request = require('request');
var moment  = require('moment-timezone');

var replys = require('../replys');
var cfg     = require('../config');
var utils   = require('../utils');
var botApi  = require('../botApi');

// set default timezone to bot timezone
moment.tz.setDefault(cfg.botTimezone);

var controller = {};

controller.dispatch = function(userId) {
    replys.sendMessageAndListenForReply(userId, 'Mitä meemiä haluat käyttää?')
    .then(function(memeType) {
        var memeObject = _getMemeObject(_.startCase(memeType));
        if (!_.isNull(memeObject)) {
            replys.sendMessageAndListenForReply(userId, 'Mitä laitetaan ylätekstiin?')
            .then(function(upperText) {
                replys.sendMessageAndListenForReply(userId, 'Entäs alas?')
                .then(function(bottomText) {
                    _generateMeme(memeObject.id, upperText, bottomText)
                    .then(function(imageUrl) {
                        var filename = cfg.memeDirectory + userId + '_' + moment().format('x') + '.jpg'
                        utils.downloadFile(imageUrl, filename)
                        .then(function() {
                            botApi.sendPhoto(userId, filename);
                        });
                    }).catch(function(err) {
                        botApi.sendMessage(userId, err);
                    });
                });
            });

        } else {
            botApi.sendMessage(userId, 'Meemiä ' + _.startCase(memeType) + ' ei löytynyt!');
        }
    });
    Promise.onPossiblyUnhandledRejection(function(error){
        console.log('Unhandled rejection on memeController, possibly user didn´t response');
    });
};

controller.sendSupportedMemes = function(userId) {
    var msg = 'Tuetut meemit:\n---------------------';
    _.each(controller.supportedMemes, function(meme) {
        msg += '\n';
        msg += meme.name;
    });
    botApi.sendMessage(userId, msg);
};

controller.getMemes = function() {
    request('https://api.imgflip.com/get_memes', function(error,res,body) {
        var response = JSON.parse(body);
        if (response['success']) {
            controller.supportedMemes = _.sortBy(response['data']['memes'], function(meme) {
                return meme.name;
            });
        } else {
            console.log('Error when using ImgFlip.com API');
        }
    });
};

var _getMemeObject = function(memeName) {
    var index = _.findIndex(controller.supportedMemes, function(meme) {
        return meme.name === memeName;
    });
    if (index >= 0) {
        return controller.supportedMemes[index];
    } else {
        return null;
    }
};

var _generateMeme = function(templateId, topText, bottomText) {
    return new Promise(function(resolve,reject) {
        var data = {};
        data.template_id = templateId;
        data.username = cfg.imgFlipUserName;
        data.password = cfg.imgFlipPassword;
        data.text0 = topText;
        data.text1 = bottomText;
        
        request.post('https://api.imgflip.com/caption_image', {form: data}, function(err, httpResponse, body) {
            if (err) {
                reject(err);
                return;
            }
            body = JSON.parse(body);
            if (!body.success) {
                reject(body.error_message);
            } else {
                resolve(body.data.url);
            }
        });
    });
};

module.exports = controller;