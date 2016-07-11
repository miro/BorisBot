/* eslint-disable max-len */
'use strict'

const Promise     = require('bluebird');
const moment      = require('moment-timezone');
const _           = require('lodash');

const cfg         = require('../config');
const db          = require('../database');
const botApi      = require('../botApi');


// set default timezone to bot timezone
moment.tz.setDefault(cfg.botTimezone);

var controller = {};


controller.newUserProcess = function(event) {
    return new Promise(resolve => {
        if (event.isFromGroup) {
            botApi.sendMessage({
                chat_id: event.chatGroupId,
                text: 'Jutellaan lisää privassa ' + emoji.get(':smirk:')
            });
            botApi.sendMessage({
                chat_id: event.userId,
                text: 'Luo käyttäjätunnus komennolla /luotunnus <paino> <sukupuoli>'
            });
            return resolve();
        }

        db.getUserById(event.userId)
        .then(exists => {
            if (exists) {
                const text = 'Käyttäjä ' + event.userName + ' on jo rekisteröity!\n' +
                    'Jos haluat päivittää tietojasi, poista vanha käyttäjä komennolla\n' +
                    '/poistatunnus ja komenna /luotunnus uudelleen.';

                botApi.sendMessage({
                    chat_id: event.userId,
                    text
                });
                resolve();
            }
            else {

                var weight = parseInt(event.userCommandParams.split(' ')[0], 10);
                var isMale = event.userCommandParams.split(' ')[1];

                if (event.userCommandParams.split(' ').length !== 2) {
                    botApi.sendMessage({
                        chat_id: event.userId,
                        text: 'Rekisteröi käyttäjä komennolla /luotunnus <paino> <sukupuoli>'
                    });
                    resolve();

                } else if (_.isNaN(weight) || weight <= 0) {
                    botApi.sendMessage({
                        chat_id: event.userId,
                        text: 'Paino ei ollut positiivinen kokonaisluku!'
                    });
                    resolve();

                } else if (weight < 40) {
                    botApi.sendMessage({
                        chat_id: event.userId,
                        text: 'Laitathan oikean painosi, kiitos. ;)'
                    });
                    resolve();

                } else if (isMale !== 'mies' && isMale !== 'nainen') {
                    botApi.sendMessage({
                        chat_id: event.userId,
                        text: 'Parametri "' + isMale + '" ei ollut "mies" tai "nainen"!'
                    });
                    resolve();
                }
                else {
                    isMale = isMale === 'mies';

                    db.registerUser(event.userId, event.userName, event.userFirstName, event.userLastName, weight, isMale)
                    .then(function registerOk() {
                        var msg = [
                            'Käyttäjätunnuksesi luotiin onnistuneesti, olé!\n\n',
                            'Käy lisäämässä itsesi johonkin ryhmään',
                            ' huutamalla ryhmän kanavalla /moro. ',
                            'Muuten kippiksiäsi ei lasketa mukaan ryhmän tilastoihin.\n\n',

                            'HUOM: ilmoittamasi painon perusteella lasketut promilleluvut',
                            ' ovat täysiä arvioita, ',
                            'eikä niiden pohjalta voi tehdä mitään päätelmiä',
                            ' minkään suhteen. Stay safe!'
                        ].join('');

                        botApi.sendMessage({ chat_id: event.userId, text: msg });
                        resolve();
                    });
                }
            }
        });
    });
};

controller.getCurrentSettings = function(userId) {
    return new Promise(resolve => {
        db.getUserById(userId).then(user => {
            let msg = '';
            if (!user) {
                msg = 'Sinulla ei ole vielä käyttäjätunnusta minulle!\n';
                msg += 'Tee sellainen käyttämällä /luotunnus -komentoa.';

                botApi.sendMessage({ chat_id: userId, text: msg });
                return resolve();
            }
            else {
                let groupDisplayName = user.get('primaryGroupName')
                    ? (user.get('primaryGroupName') + '\n')
                    : '-\n';

                msg = 'Käyttäjätunnuksesi tiedot ovat seuraavat:\n\n';

                msg += 'Etunimi: ' + user.get('firstName') + '\n';
                msg += 'Sukunimi: ' + user.get('lastName') + '\n';
                msg += 'Group: ' + groupDisplayName;
                msg += 'Paino: ' + user.get('weight') + 'kg\n';
                msg += 'Sukupuoli: ' + (user.get('isMale') ? 'mies' : 'nainen');

                botApi.sendMessage({ chat_id: userId, text: msg });
                return resolve();
            }
        });
    });
};

controller.removeUser = function(userId, userName) {
    return new Promise(resolve => {
        db.getUserById(userId)
        .then(exists => {
            if (!exists) {
                botApi.sendMessage({
                    chat_id: userId,
                    text: 'Käyttäjää ' + userName + ' ei löytynyt tietokannasta!'
                });
                resolve();
            }
            else {
                db.removeUser(userId)
                .then(function deleteOk() {
                    botApi.sendMessage({
                        chat_id: userId,
                        text: 'Käyttäjän ' + userName + ' poistaminen onnistui!'
                    });
                    resolve();
                });
            }
        });
    });
};


controller.setGroup = function(userId, chatGroupId, chatGroupTitle, messageIsFromGroup) {
    return new Promise(resolve => {
        if (!messageIsFromGroup) {
            botApi.sendMessage({
                chat_id: userId,
                text: 'Sinun täytyy lähettää tämä komento jostain ryhmästä määrittääksesi ensisijaisen ryhmäsi!'
            });
            resolve();
        }
        else {
            db.getUserById(userId)
            .then(exists => {
                if (!exists) {
                    botApi.sendMessage({
                        chat_id: chatGroupId,
                        text: `Käyttäjääsi ei ole vielä luotu botille!\n Luo sellainen huutamalla minulle privassa /luotunnus`
                    });
                    resolve();
                }
                else {
                    db.updatePrimaryGroupIdToUser(userId, chatGroupId, chatGroupTitle)
                    .then(function updateOk() {
                        botApi.sendMessage({
                            chat_id: chatGroupId,
                            text: `_Sielusi ratsastaa ikuisesti kera ${chatGroupTitle}-urhojen_`,
                            parse_mode: 'Markdown'
                        });
                        resolve();
                    });
                }
            });
        }
    });
};

module.exports = controller;
