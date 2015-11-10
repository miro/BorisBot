var utils       = require('./utils');
var cfg         = require('./config');
var botApi      = require('./botApi');
var db          = require('./database');
var msgs        = require('./messageHistory');
var logger      = cfg.logger;

var Promise     = require('bluebird');
var _           = require('lodash');
var getPixels   = require('get-pixels');
var fs          = require('fs');

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
                utils.downloadFile(cfg.webcamURL, cfg.webcamDirectory + 'webcam.jpg')
                .then(function() {
                    botApi.sendPhoto(targetId, cfg.webcamDirectory + 'webcam.jpg');
                    resolve();
                });
            }
        });
    });
};

generic.checkWebcamLightness = function() {
    return new Promise(function(resolve,reject) {
        utils.downloadFile(cfg.webcamURL, cfg.webcamDirectory + 'webcam.jpg')
        .then(function() {
            getPixels(cfg.webcamDirectory + 'webcam.jpg', function(err,pixels) {
                if (err) {
                    logger.log('error', 'Error when getting pixels!');
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
                logger.log('debug', 'Clubroom lightness value: %d', threshold);
                
                if (threshold > 80) {   // TODO: Explore more specific thresholds
                
                    // Lights on, check if they were already on
                    if (!generic.webcamLightsOn) {
                        logger.log('info', 'Webcam detected lights at clubroom, threshold: ' + threshold);
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

// Assume that lights are on, this prevents chat spamming if app shuts down
generic.webcamLightsOn = true;

generic.talkAsBotToMainGroup = function(userId, msg) {
    // lazy version which talks to "main group" as a bot
    // TODO: convert this with a more generic one after we have info about groups
    // on the database
    if (_userHaveBotTalkRights(userId)) {
        botApi.sendMessage(cfg.allowedGroups.mainChatId, msg);
    }
    else {
        logger.log('info', 'Non-allowed user tried to talk as Boris!');
    }
};

generic.talkAsBotToUsersInMainGroup = function(userId, msg) {
	return new Promise(function(resolve,reject) {
        if (!_userHaveBotTalkRights(userId)) {
			logger.log('info', 'Non-allowed user tried to talk as Boris!');
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
    \n/kahvi - Kirjaan nauttimasi kupillisen tietokantaani.\
    \n\
    \n/kalja - Kirjaan nauttimasi ohrapirtelön tietokantaani.\
    \n\
    \n/kippis - Kirjaan kilistelemäsi juoman ylös ja käytän sitä\
    myöhemmin erilaisiin toimintoihini.\
    \n\
    \n/kahvit - Printaan sinulle ryhmäsi tämänhetkisen kahvitilanteen.\
    \n\
    \n/kaljoja - Näytän kaikki nautitut alkoholilliset juomat.\
    \n\
    \n/kumpi - Päätän tärkeät valinnat puolestasi.\
    \n\
    \n/luomeemi - Luon haluamasi meemin haluamillasi teksteillä.\
    Tuetut meemit saat tietoosi /meemit komennolla.\
    \n\
    \n/luotunnus - Kirjoitan tietosi muistiin, jotta voin käyttää niitä\
    myöhemmin. Tarvitsen komennon perään myös painosi ja sukupuolesi\
    (lupaan että tietoja ei käytetä kaupallisiin tarkoituksiin).\
    \n\
    \n/meemit - Listaan meemi-generaattorissa tuetut meemit.\
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
    \n/tee - Kirjaan nauttimasi kupillisen tietokantaani.\
    \n\
    \n/virvokkeita - Näytän kaikki nautitut alkoholittomat juomat.\
    \n\
    \n/webcam - Lähetän tuoreen kuvan Spinnin kerhohuoneelta.\
    ';
    botApi.sendMessage(userId, msg);
};

generic.whichOne = function(targetId, userParams) {
    var options = userParams.split(' ');
    if (options.length != 2) {
        botApi.sendMessage(targetId, 'Anna kaksi parametria!');
        return;
    } else {
        var text;
        var dice = Math.floor(Math.random() * 100);
        if (dice === 99) {
            text = 'Molemmat!';
        } else if (dice === 98) {
            text = 'Ei kumpikaan!';
        } else if (dice < 48) {
            text = options[0];
        } else {
            text = options[1];
        }
        botApi.sendMessage(targetId, text);
        return;
    }
};

generic.sendLog= function(targetId, userParams) {
    return new Promise(function(resolve, reject) {
        if (utils.userIsAdmin(targetId)) {
            fs.readFile(cfg.logLocation, function (err,data) {
                if (err) {
                    botApi.sendMessage(targetId, 'Lokia ei voitu avata!' + err);
                    resolve();
                } else {
                    var message = '```';
                    var linesToRead = parseInt(userParams) || 50;
                    var lines = data.toString('utf-8').split('\n');
                    var lastLine = (lines.length - linesToRead > 0) ? lines.length - linesToRead : 0;
                    for(var i=lastLine; i<lines.length; i+=1) {
                        message += lines[i];
                        message += '\n';
                    }
                    message += '```';
                    botApi.sendMessage(targetId, message);
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
};

var _userHaveBotTalkRights = function(userId) {
    return cfg.botTalkUsers.indexOf(parseInt(userId, 10)) >= 0;
};

module.exports = generic;
