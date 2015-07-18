var utils       = require('./utils');
var cfg         = require('./config');
var botApi      = require('./botApi');
var db          = require('./database');
var msgs        = require('./messageHistory');

var Promise     = require('bluebird');
var _           = require('lodash');
var getPixels   = require('get-pixels');

var generic = {};

generic.webcam = function(userId, chatGroupId, eventIsFromGroup) {
    return new Promise(function(resolve,reject) {
        if (_.isUndefined(cfg.webcamURL)) {
            botApi.sendMessage(userId, 'Botille ei ole määritetty webcamin osoitetta!');
            return resolve();
        }

        db.getUserById(userId)
        .then(function(user) {

            if (_.isNull(user)) {
                botApi.sendMessage(userId, 'Sinun täytyy /luotunnus ja käydä /moro ´ttamassa SpänniMobissa saadaksesi /webcam toimimaan!');
                return resolve();
            }

            var groupId = (eventIsFromGroup) ? chatGroupId : user.get('primaryGroupId');
            var targetId = (eventIsFromGroup) ? chatGroupId : userId;

            // check if the command came from an allowedId
            var msgFromAllowedId = false;
            for (var group in cfg.allowedGroups) {
                if (groupId === cfg.allowedGroups[group]) {
                    msgFromAllowedId = true;
                }
            }

            if (!msgFromAllowedId) {
                botApi.sendMessage(targetId, 'Sinun täytyy käydä /moro ´ttamassa SpänniMobissa saadaksesi /webcam-komennon toimimaan priva-chatissa!');
                resolve();
            }
            else {
                // -> If we get here, we are good to go!
                botApi.sendAction(targetId, 'upload_photo');
                utils.downloadFile(cfg.webcamURL, cfg.webcamDirectory + 'webcam.jpg', function() {
                    botApi.sendPhoto(targetId, cfg.webcamDirectory + 'webcam.jpg');
                    resolve();
                });
            }
        });
    });
};

generic.checkWebcamLightness = function() {
    return new Promise(function(resolve,reject) {
        utils.downloadFile(cfg.webcamURL, cfg.webcamDirectory + 'webcam.jpg', function() {
            getPixels(cfg.webcamDirectory + 'webcam.jpg', function(err,pixels) {
                if (err) {
                    console.log('Error when getting pixels!');
                    resolve();
                    return;
                }
                
                // Notice only every n pixel
                var n = 4;
                
                // Calculate sum of averages
                var sum = 0;
                var x = 0;
                for(var i=0; i<pixels.shape[0]; i+=n) {
                    for(var j=0; j<pixels.shape[1]; ++j) {
                        var colorValue = 0;
                        for(var k=0; k<3; ++k) {
                            colorValue += parseInt(pixels.get(i,j,k));
                        };
                        sum += Math.round(colorValue / 3);
                        ++x;
                    };
                };
                
                // Calculate whole average
                var threshold = Math.round(sum / x);
                
                if (threshold > 80) {   // TODO: Explore more specific thresholds
                
                    // Lights on, check if they were already on
                    if (!generic.webcamLightsOn) {
                        botApi.sendMessage(cfg.allowedGroups.mainChatId, 'Kerholla räpsähti valot päälle!');
                        generic.webcamLightsOn = true;
                    }
                    resolve();
                } else {
                        
                    // Lights off, reset status
                    generic.webcamLightsOn = false;
                    resolve();
                }   
            });
        });
    });
}

generic.webcamLightsOn = false;

// Admin only!
generic.talkAsBotToMainGroup = function(userId, msg) {
    // lazy version which talks to "main group" as a bot
    // TODO: convert this with a more generic one after we have info about groups
    // on the database
    if (utils.userIsAdmin(userId)) {
        botApi.sendMessage(cfg.allowedGroups.mainChatId, msg);
    }
    else {
        console.log('Non-admin tried to talk as Boris!');
    }
};

generic.talkAsBotToUsersInMainGroup = function(userId, msg) {
	return new Promise(function(resolve,reject) {
        if (!utils.userIsAdmin(userId)) {
			console.log('Non-admin tried to talk as Boris!');
			resolve();
		} else {
			db.getUsersByPrimaryGroupId(cfg.allowedGroups.mainChatId)
			.then(function(collection) {
				_.each(collection.models, function(user) {
					botApi.sendMessage(user.get('telegramId'), msg);
				});
				resolve();
			});
		}
	});
};

generic.commandCount = function(userId) {
    return new Promise(function(resolve, reject) {
        botApi.sendMessage(userId, 'Viestejä hanskattu ' + msgs.getEventCount());
        resolve();
    });
};

generic.help = function(userId) {

    var msg = '\
    Moro! Olen Spinnin oma Telegram-botti, näin kavereiden kesken BorisBot.\
    Pääset alkuun kirjoittamalla minulle /luotunnus ja käy sen jälkeen /moro ´ttamassa\
    Spinnin kanavalla!\
    \n\
    \nMinulta voit myös kysyä seuraavia toimintoja:\
    \n\
    \n/graafi - Tutkin alkoholinkäyttöäsi ja luon niistä kauniin kuvaajan.\
    Jos annat komennon perään positiivisen numeron, rajaan kuvaajan\
    leveyden olemaan kyseisen numeron verran päiviä.\
    \n\
    \n/kippis - Kirjaan kilistelemäsi juoman ylös ja käytän sitä\
    myöhemmin erilaisiin toimintoihini.\
    \n\
    \n/luotunnus - Kirjoitan tietosi muistiin, jotta voin käyttää niitä\
    myöhemmin. Tarvitsen komennon perään myös painosi ja sukupuolesi\
    (lupaan että tietoja ei käytetä kaupallisiin tarkoituksiin).\
    \n\
    \n/moro - Yhdistän käyttäjäsi ryhmään, mistä tämä komento lähetettiin. \
    Tämän avulla voin yhdistää tekemäsi kippikset ryhmän tilastoihin.\
    \n\
    \n/otinko - Muistutan sinua juomista, jotka olet ottanut viimeisen \
    48 tunnin aikana.\
    \n\
    \n/poistatunnus - Unohdan tunnuksesi tietokannastani.\
    \n\
    \n/promille - Tulostan sinun henkilökohtaisen promilletasosi. \
    HUOM: lasken promillesi korkeammassa ulottuvuudessa, joten älä \
    luota tulosten olevan täysin realistisia.\
    \n\
    \n/promillet - Tulostan ryhmän tämänhetkiset promilletasot.\
    \n\
    \n/webcam - Lähetän tuoreen kuvan Spinnin kerhohuoneelta.\
    ';
    botApi.sendMessage(userId, msg);
};

module.exports = generic;
