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
var emoji       = require('node-emoji');

var generic = {};

generic.webcam = function(userId, chatGroupId, eventIsFromGroup) {
    return new Promise(function(resolve,reject) {
        if (_.isUndefined(cfg.webcamURL)) {
            botApi.sendMessage({chat_id: userId, text: 'Botille ei ole määritetty webcamin osoitetta!'});
            return resolve();
        }

        db.getUserById(userId)
        .then(function(user) {

            if (_.isNull(user)) {
                botApi.sendMessage({chat_id: userId, text: 'Sinun täytyy /luotunnus ja käydä /moro ´ttamassa SpänniMobissa saadaksesi /webcam toimimaan!'});
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
                botApi.sendMessage({chat_id: targetId, text: 'Sinun täytyy käydä /moro ´ttamassa SpänniMobissa saadaksesi /webcam-komennon toimimaan priva-chatissa!'});
                resolve();
            }
            else {
                // -> If we get here, we are good to go!
                botApi.sendAction(targetId, 'upload_photo');
                utils.downloadFile(cfg.webcamURL, cfg.webcamDirectory + 'webcam.jpg')
                .then(function() {
                    if (!eventIsFromGroup) {
                        botApi.sendPhoto(targetId, cfg.webcamDirectory + 'webcam.jpg');
                        resolve();
                    } else {
                        calculateWebcamLightness_()
                        .then(threshold => {
                            if (threshold < 40) {
                                botApi.sendMessage({chat_id: targetId, text: '_"I only see a vast emptiness."_', parse_mode: 'Markdown'});
                            } else {
                                botApi.sendPhoto(targetId, cfg.webcamDirectory + 'webcam.jpg');
                            }
                            resolve();
                        })
                        .catch(err=> {
                            logger.log('error', 'Error on threshold checking, sending photo anyway');
                            botApi.sendPhoto(targetId, cfg.webcamDirectory + 'webcam.jpg');
                            resolve();
                        })
                    }  
                });
            }
        });
    });
};

generic.checkWebcamLightness = function() {
    return new Promise(function(resolve,reject) {
        if (_.isUndefined(cfg.webcamURL)) {
            logger.log('warn', 'Unable to calculate clubroom lightness, webcamURL is undefined');
            return resolve();
        }
        utils.downloadFile(cfg.webcamURL, cfg.webcamDirectory + 'webcam.jpg')
        .then(function() {
            calculateWebcamLightness_()
            .then(threshold => {
                
                if (threshold > 80) {   // TODO: Explore more specific thresholds
                
                    // Lights on, check if they were already on
                    if (!generic.webcamLightsOn) {
                        logger.log('info', 'Webcam detected lights at clubroom, threshold: ' + threshold);
                        var bulb = emoji.get(':bulb:');
                        botApi.sendMessage({chat_id: cfg.allowedGroups.mainChatId, text: bulb+bulb+bulb});
                        generic.webcamLightsOn = true;
                    }
                    resolve();
                } else {
                        
                    // Lights off, reset status
                    generic.webcamLightsOn = false;
                    resolve();
                }   
            })
            .catch(err => logger.log('error', 'Error when calculating webcam pixels: %s', err));
        });
    });
}

// Assume that lights are on, this prevents chat spamming if app shuts down
generic.webcamLightsOn = true;

generic.commandCount = function(userId) {
    return new Promise(function(resolve, reject) {
        botApi.sendMessage({chat_id: userId, text: 'Viestejä hanskattu ' + msgs.getEventCount()});
        resolve();
    });
};

generic.help = function(userId) {

    botApi.sendMessage({
        chat_id: userId,
        text: 'Moro! Olen Spinnin oma Telegram-botti, näin kavereiden kesken BorisBot. ' +
        'Pääset alkuun kirjoittamalla minulle /luotunnus ja käy sen jälkeen /moro ´ttamassa' +
        'Spinnin kanavalla!\n' +
        'Minulta voit myös kysyä seuraavia toimintoja:\n' +
        '\n/graafi - Tutkin alkoholinkäyttöäsi ja luon niistä kauniin kuvaajan. ' +
        'Jos annat komennon perään positiivisen numeron, rajaan kuvaajan ' +
        'leveyden olemaan kyseisen numeron verran päiviä.\n' + 
        '\n/kahvi - Kirjaan nauttimasi kupillisen tietokantaani.\n' +
        '\n/kalja - Kirjaan nauttimasi ohrapirtelön tietokantaani.\n' +
        '\n/kippis - Kirjaan kilistelemäsi juoman ylös ja käytän sitä myöhemmin erilaisiin toimintoihini.\n' +
        '\n/kahvit - Printaan sinulle ryhmäsi tämänhetkisen kahvitilanteen.\n' +
        '\n/kaljoja - Näytän kaikki nautitut alkoholilliset juomat.\n' + 
        '\n/kumpi `<vaihtoehto 1>` `<vaihtoehto 2>` - Päätän tärkeät valinnat puolestasi.\n' +
        '\n/luomeemi - Luon haluamasi meemin haluamillasi teksteillä. ' + 
        'Tuetut meemit saat tietoosi /meemit komennolla.\n' +
        '\n/luotunnus - Kirjoitan tietosi muistiin, jotta voin käyttää niitä\n' +
        'myöhemmin. Tarvitsen komennon perään myös painosi ja sukupuolesi' +
        'lupaan että tietoja ei käytetä kaupallisiin tarkoituksiin).\n' +
        '\n/meemit - Listaan meemi-generaattorissa tuetut meemit.\n' +
        '\n/moro - Yhdistän käyttäjäsi ryhmään, mistä tämä komento lähetettiin. ' +
        'Tämän avulla voin yhdistää tekemäsi kippikset ryhmän tilastoihin.\n' +
        '\n/otinko - Muistutan sinua juomista, jotka olet ottanut viimeisen 48 tunnin aikana.\n' +
        '\n/poistatunnus - Unohdan tunnuksesi tietokannastani.\n' +
        '\n/promille - Tulostan sinun henkilökohtaisen promilletasosi. \n' +
        'HUOM: lasken promillesi korkeammassa ulottuvuudessa, joten älä ' +
        'luota tulosten olevan täysin realistisia.\n' +
        '\n/promillet - Tulostan ryhmän tämänhetkiset promilletasot.\n' +
        '\n/puhelin - Tulostan Spinnin puhelinnumeron.\n' +
        '\n/raflat - Tulostan kampuksen ravintoloiden ruokalistat.\n' +
        '\n/tee - Kirjaan nauttimasi kupillisen tietokantaani.\n' +
        '\n/tili - Lähetän sinulle Spinnin tilinumeron.\n' +
        '\n/virvokkeita - Näytän kaikki nautitut alkoholittomat juomat.\n' +
        '\n/webcam - Lähetän tuoreen kuvan Spinnin kerhohuoneelta.\n' +
        '\n!expl <avain> - Annan sanallesi selityksen, jos löydän sellaisen.\n' +
        '\n!add `<avain>` `<selite>` - Annan sanalle uuden selityksen.\n' +
        '\n!remove `<avain>` - Poistan selitteen, jos se on sinun hallussasi.\n' +
        '\n!list - Listaan kaikki saatavilla olevat selitettävät sanat',
        parse_mode: 'Markdown'});
};

generic.whichOne = function(targetId, userParams) {
    var options = userParams.split(' ');
    if (options.length != 2) {
        botApi.sendMessage({chat_id: targetId, text: 'Anna kaksi parametria!'});
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
        botApi.sendMessage({chat_id: targetId, text: text});
        return;
    }
};

// Admin commands
// 

generic.adminhelp = function(userId) {
    if (utils.userIsAdmin(userId)) {
        botApi.sendMessage({
            chat_id: userId,
            text:   '/botgrouptalk `[text]` - Talk as bot to main chat \
                    \n/botgroupprivatetalk `[text]` - Talk as bot in private to every registered user in main chat \
                    \n/botprivatetalk `[id or username]` `[text]` - Talk as bot to user in private  \
                    \n/logs - Print logs',
            parse_mode: 'Markdown'
        })
    } else {
        botApi.sendMessage({chat_id: userId, text: 'Käyttö evätty.'});
    }
}

generic.sendLog= function(userId, userParams) {
    return new Promise(function(resolve, reject) {
        if (utils.userIsAdmin(userId)) {
            fs.readFile(cfg.logLocation, function (err,data) {
                if (err) {
                    botApi.sendMessage({chat_id: userId, text: 'Lokia ei voitu avata! ' + err});
                    resolve();
                } else {
                    var linesToRead = parseInt(userParams) || 50;
                    var lines = data.toString('utf-8').split('\n');
                    var lastLine = (lines.length - linesToRead > 0) ? lines.length - linesToRead : 0;
                    var message = '';
                    for(var i=lastLine; i<lines.length; i+=1) {
                        message += lines[i];
                        message += '\n';
                    }
                    botApi.sendMessage({chat_id: userId, text: message, disable_web_page_preview: true });
                    resolve();
                }
            });
        } else {
            botApi.sendMessage({chat_id: userId, text: 'Käyttö evätty.'});
            resolve();
        }
    });
};

generic.talkAsBotToUser = function(userId, userParams) {
    return new Promise(function(resolve,reject) {
        if (utils.userIsAdmin(userId)) {
            var msg = _.drop(userParams.split(' ')).join(' ');
            var targetUser = (userParams.split(' ')).shift();
            parseId_(targetUser)
            .then(id => {
                if (_.isNull(id)) {
                    botApi.sendMessage({chat_id: userId, text: 'Henkilöä ' + targetUser + ' ei löytynt'});
                    resolve();
                } else {
                    botApi.sendMessage({chat_id: id, text: msg});
                    resolve();
                }
            });
        } else {
            botApi.sendMessage({chat_id: userId, text: 'Käyttö evätty.'});
            resolve();
        }
    });
};

generic.talkAsBotToMainGroup = function(userId, msg) {
    // lazy version which talks to "main group" as a bot
    // TODO: convert this with a more generic one after we have info about groups
    // on the database
    if (utils.userIsAdmin(userId)) {
        botApi.sendMessage({chat_id: cfg.allowedGroups.mainChatId, text: msg});
    }
    else {
        botApi.sendMessage({chat_id: userId, text: 'Käyttö evätty.'});
    }
};

generic.talkAsBotToUsersInMainGroup = function(userId, msg) {
    return new Promise(function(resolve,reject) {
        if (utils.userIsAdmin(userId)) {
            db.getUsersByPrimaryGroupId(cfg.allowedGroups.mainChatId)
            .then(function(collection) {
                _.each(collection.models, function(user) {
                    botApi.sendMessage({chat_id: user.get('telegramId'), text: msg});
                });
                resolve();
            });
        } else {
            botApi.sendMessage({chat_id: userId, text: 'Käyttö evätty.'});
            resolve();
        }
    });
};

generic.banUser = function(userId, userParams) {
    return new Promise(function(resolve,reject) {
        if (utils.userIsAdmin(userId)) {
            var splitParams = userParams.split(' ');
            parseId_(splitParams[0])
            .then(id => {
                if (_.isNull(id)) {
                    botApi.sendMessage({chat_id: userId, text: 'Henkilöä "' + splitParams[0] + '" ei löytynyt.'});
                    resolve();
                } else {
                    if (!_.includes(cfg.ignoredUsers, id)) {
                        cfg.ignoredUsers.push(id);
                        botApi.sendMessage({chat_id: userId, text: 'Banned id: ' + id})
                        resolve();
                    } else {
                        botapi.sendMessage({chat_id: userId, text: 'Id ' + id + ' on jo bannittu.'});
                        resolve();
                    }
                }
            });
        } else {
            botApi.sendMessage({chat_id: userId, text: 'Käyttö evätty.'});
            resolve();
        }
    });
}

generic.unbanUser = function(userId, userParams) {
    return new Promise(function(resolve,reject) {
        if (utils.userIsAdmin(userId)) {
            var splitParams = userParams.split(' ');
            parseId_(splitParams[0])
            .then(id => {
                if (_.isNull(id)) {
                    botApi.sendMessage({chat_id: userId, text: 'Henkilöä "' + splitParams[0] + '"" ei löytynyt.'});
                    resolve();
                } else {
                    if (_.includes(cfg.ignoredUsers, id)) {
                        _.pull(cfg.ignoredUsers, id);
                        botApi.sendMessage({chat_id: userId, text: 'Unbanned id: ' + id})
                        resolve();
                    } else {
                        botapi.sendMessage({chat_id: userId, text: 'Henkilöä ' + id + ' ei ole bannittu.'});
                        resolve();
                    }
                }
            });
        } else {
            botApi.sendMessage({chat_id: userId, text: 'Käyttö evätty.'});
            resolve();
        }
    });
}

var calculateWebcamLightness_ = function() {
    return new Promise(function(resolve, reject) {
        getPixels(cfg.webcamDirectory + 'webcam.jpg', function(err,pixels) {
            if (err) {
                return reject(err);
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
            
            // Return whole average
            var threshold = Math.round(sum / x);
            logger.log('debug', 'Webcam lightness value: %d', threshold);
            return resolve(threshold);
        });
    });
}

var parseId_ = function(targetUser) {
    return new Promise(function(resolve,reject) {
        if (!_.isNaN(_.parseInt(targetUser))) {
            resolve(targetUser);
        } else {
             db.getUserByName(targetUser)
            .then(model => {
                if (_.isNull(model)) {
                    resolve(null);
                } else {
                    resolve(model.get('telegramId'));
                }
            });
        }
    });
}

module.exports = generic;
