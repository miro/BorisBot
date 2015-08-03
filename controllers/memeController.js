var _       = require('lodash');
var Promise = require('bluebird');
var request = require('request');

var cfg     = require('../config');
var utils   = require('../utils');
var botApi  = require('../botApi');


var controller = {};

controller.dispatch = function(userId,userParams) {
    return new Promise(function(resolve,reject) {
        var memeObject = _getMemeObject(_.startCase(userParams));
        if (!_.isNull(memeObject)) {
            botApi.sendMessage(userId, 'Mit� meemi� haluat k�ytt��?')
            .then(function(msg) {
                _generateMeme(memeObject.id, 'Bottiin', 'meme-generaattori')
                .then(function(imageUrl) {
                    utils.downloadFile(imageUrl, cfg.memeDirectory + 'meme.jpg')
                    .then(function() {
                        botApi.sendPhoto(userId, cfg.memeDirectory + 'meme.jpg');
                        resolve();
                    });
                }).catch(function(err) {
                    botApi.sendMessage(userId, err);
                    resolve();
                });
            });
        } else {
            botApi.sendMessage(userId, 'Meemi� ' + _.startCase(userParams) + ' ei l�ytynyt!');
            resolve();
        }
    });
};

controller.sendSupportedMemes = function(userId) {
    var msg = 'Tuetut meemit:\n------------------';
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
            controller.supportedMemes = response['data']['memes'];
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