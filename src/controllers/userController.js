var cfg         = require('../config');
var db          = require('../database');
var botApi      = require('../botApi');

var Promise     = require('bluebird');
var moment      = require('moment-timezone');
var _           = require('lodash');

// set default timezone to bot timezone
moment.tz.setDefault(cfg.botTimezone);

var controller = {};


controller.newUserProcess = function(userId, userName, userFirstName, userLastName, userCommandParams) {
    return new Promise(function(resolve, reject) {
        db.getUserById(userId)
        .then(function(exists) {
            if (exists) {
                botApi.sendMessage(userId, 'Käyttäjä ' + userName + ' on jo rekisteröity!\n' +
                    'Jos haluat päivittää tietojasi, poista vanha käyttäjä komennolla\n/poistatunnus ja komenna /luotunnus uudelleen.');
                resolve();
            }
            else {

                var weight = parseInt(userCommandParams.split(' ')[0],10);
                var isMale = userCommandParams.split(' ')[1];

                if (userCommandParams.split(' ').length !== 2) {
                    botApi.sendMessage(userId, 'Rekisteröi käyttäjä komennolla /luotunnus <paino> <sukupuoli>');
                    resolve();

                } else if (_.isNaN(weight) || weight <= 0) {
                    botApi.sendMessage(userId, 'Paino ei ollut positiivinen kokonaisluku!');
                    resolve();

                } else if (isMale !== 'mies' && isMale !== 'nainen' ) {
                    botApi.sendMessage(userId, 'Parametri "' + isMale + '" ei ollut "mies" tai "nainen"!');
                    resolve();
                }
                else {
                    isMale = (isMale === 'mies') ? true : false;

                    db.registerUser(userId, userName, userFirstName, userLastName, weight, isMale)
                    .then(function registerOk() {
                        var msg = 'Käyttäjätunnuksesi luotiin onnistuneesti, olé!\n\n';
                        msg += 'Käy lisäämässä itsesi johonkin ryhmään huutamalla ryhmän kanavalla /moro. ';
                        msg += 'Muuten kippiksiäsi ei lasketa mukaan ryhmän tilastoihin.\n\n';

                        msg += 'HUOM: ilmoittamasi painon perusteella lasketut promilleluvut ovat täysiä arvioita, ';
                        msg += 'eikä niiden pohjalta voi tehdä mitään päätelmiä minkään suhteen. Stay safe!';

                        botApi.sendMessage(userId, msg);
                        resolve();
                    });
                };
            };
        });
    });
};

controller.getCurrentSettings = function(userId) {
    return new Promise(function(resolve, reject) {
        db.getUserById(userId).then(function(user) {
            if (!user) {
                var msg = 'Sinulla ei ole vielä käyttäjätunnusta minulle!\n';
                msg += 'Tee sellainen käyttämällä /luotunnus -komentoa.';

                botApi.sendMessage(userId, msg)
                return resolve();
            }
            else {
                var msg = 'Käyttäjätunnuksesi tiedot ovat seuraavat:\n\n';

                msg += 'Etunimi: ' + user.get('firstName') + '\n';
                msg += 'Sukunimi: ' + user.get('lastName') + '\n';
                msg += 'Group: ' + (user.get('primaryGroupName') ? (user.get('primaryGroupName') + '\n') : '-\n');
                msg += 'Paino: ' + user.get('weight') + 'kg\n';
                msg += 'Sukupuoli: ' + (user.get('isMale') ? 'mies' : 'nainen');

                botApi.sendMessage(userId, msg)
                return resolve();
            }
        });
    });
};

controller.removeUser = function(userId, userName) {
    return new Promise(function(resolve, reject) {
        db.getUserById(userId)
        .then(function(exists) {
            if (!exists) {
                botApi.sendMessage(userId, 'Käyttäjää ' + userName + ' ei löytynyt tietokannasta!');
                resolve();
            }
            else {
                db.removeUser(userId)
                .then(function deleteOk() {
                    botApi.sendMessage(userId, 'Käyttäjän ' + userName + ' poistaminen onnistui!');
                    resolve();
                });
            };
        });
    });
};


controller.setGroup = function(userId, chatGroupId, chatGroupTitle, messageIsFromGroup) {
    return new Promise(function (resolve, reject) {
        if (!messageIsFromGroup) {
            botApi.sendMessage(userId, 'Sinun täytyy lähettää tämä komento jostain ryhmästä määrittääksesi ensisijaisen ryhmäsi!');
            resolve();
        }
        else {
            db.getUserById(userId)
            .then(function(exists) {
                if (!exists) {
                    botApi.sendMessage(chatGroupId, 'Käyttäjääsi ei ole vielä luotu botille!\nLuo sellainen huutamalla minulle privassa /luotunnus');
                    resolve();
                }
                else {
                    db.updatePrimaryGroupIdToUser(userId, chatGroupId, chatGroupTitle)
                    .then(function updateOk() {
                        botApi.sendMessage(chatGroupId, '"Sielusi ratsastaa ikuisesti kera ' + chatGroupTitle + '-urhojen"');
                        resolve();
                    });
                }
            });
        }
    });
};

module.exports = controller;
