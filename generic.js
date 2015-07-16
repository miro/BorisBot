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