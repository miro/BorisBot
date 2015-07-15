var utils   = require('./utils');
var cfg     = require('./config');
var botApi  = require('./botApi');

var Promise = require('bluebird');
var _       = require('lodash');

var generic = {};

generic.webcam = function(chatGroupId, eventIsFromGroup) {
    
    return new Promise(function(resolve,reject) {
        if (_.isUndefined(cfg.webcamURL)) {
            botApi.sendMessage(userId, 'Botille ei ole määritetty webcamin osoitetta!');
            resolve();
        } else {

            if (!eventIsFromGroup) {
                // this command can only be triggered from a group, since this command is
                // limited to a certain users only, and for now we have no means of finding
                // out if the person belongs to one of those groups -> calling this personally from
                // the bot must be denied
                botApi.sendMessage(userId, 'Komento /webcam on käytössä vain valtuutetuissa ryhmäkeskusteluissa!');
                resolve();
            }

            // check if the command came from an allowedGroup
            var msgFromAllowedGroup = false;
            for (var group in cfg.allowedGroups) {
                if (chatGroupId === cfg.allowedGroups[group]) {
                    msgFromAllowedGroup = true;
                }
            }

            if (!msgFromAllowedGroup) {
                // unauthorized
                resolve();
            }

            // -> If we get here, we are good to go!
            utils.downloadFile(cfg.webcamURL, cfg.webcamDirectory + 'webcam.jpg', function() {
                botApi.sendPhoto(chatGroupId, cfg.webcamDirectory + 'webcam.jpg');
                resolve();
            });
        }
    });
};

generic.help = function(userId) {
    
    var msg = '\
    /asetaryhma\n\
    /graafi\n\
    /kalja\n\
    /kippis\n\
    /luotunnus\n\
    /otinko\n\
    /poistatunnus\n\
    /promille\n\
    /promillet\n\
    /webcam\n\
    ';
    botApi.sendMessage(userId, msg);
};

module.exports = generic;