// ### Parses messages coming from Telegram webhook, dispatches them to bot commands

var Promise     = require('bluebird');
var request     = require('request');
var moment      = require('moment-timezone');
var _           = require('lodash');
var emoji       = require('node-emoji');

var cfg         = require('./config');
var db          = require('./database');
var botApi      = require('./botApi');
var utils       = require('./utils');

var userController      = require('./controllers/userController');
var drinkController     = require('./controllers/drinkController');
var ethanolController   = require('./controllers/ethanolController');

// set default timezone to bot timezone
moment.tz.setDefault(cfg.botTimezone);


module.exports = function dispatchTelegramEvent(msg) {
    return new Promise(function (resolve, reject) {
        console.log('webhook event!', msg);

        if (!msg.text) {
            console.log('no text on event, ignore');
            resolve();
            return;
        }

        // Parse metadata from the message
        var userId = msg.from.id;
        var userName = msg.from.username;
        var userFirstName = msg.from.first_name;
        var userLastName = msg.from.last_name;
        var userCallName = _.isUndefined(userName) ? userFirstName : ('@' + userName); // this can be used on messages

        var eventIsFromGroup = !_.isUndefined(msg.chat.title);
        var chatGroupId = eventIsFromGroup ? msg.chat.id : null;
        var chatGroupTitle = eventIsFromGroup ? msg.chat.title : null;

        // check if user is ignored
        var userIsIgnored = cfg.ignoredUsers.indexOf(userId) >= 0;
        if (userIsIgnored) {
            // do nothing
            console.log('! Ignored user tried to trigger command');
            resolve();
            return;
        }


        // Parse command & possible parameters
        var userInput = msg.text.split(' ');
        var userCommand = userInput.shift().toLowerCase();
        var userCommandParams = userInput.join(' ');


        // Dispatch!
        switch (userCommand) {
            case '/kalja':
            case '/kippis':
                drinkController.showDrinkKeyboard(userId, eventIsFromGroup)
                .then(resolve);
            break;

            // Drink logging commands - works only on private
            case emoji.get(':beer:'):
            case emoji.get(':wine_glass:'):
            case emoji.get(':cocktail:'):
                var drinkType = userCommand + ' ' + userCommandParams
                drinkController.addDrink(msg.message_id, userId, userCallName, drinkType, eventIsFromGroup)
                .then(resolve);
            break;

            case '/kaljoja':
                drinkController.getDrinksAmount(userId, chatGroupId, chatGroupTitle, eventIsFromGroup)
                .then(resolve);
            break;

            case '/log':
            case '/otinko':
                drinkController.getPersonalDrinkLog(userId)
                .then(function() {
                    if (eventIsFromGroup) {
                        botApi.sendMessage(userId, 'PS: anna "' +
                            userCommand + '"-komento suoraan minulle, älä spämmää turhaan ryhmächättiä!');
                    }
                    resolve();
                });
            break;

            // # "Histogram" - returns visualization from drink log data.
            // If triggered from a group, returns a graph from that group's data
            // If triggered from a 1on1 chat, returns a graph from the requester's data
            // Takes one parameter, which changes the length of the graph
            case '/graafi':
            case '/histogrammi':
                drinkController.drawGraph(userId, chatGroupId, eventIsFromGroup, userCommandParams)
                .then(resolve);
            break;

            // Sends image of current state of Spänni's webcam
            // Triggering of this is only possible from the spännimobi group
            // TODO: allow calling this from a 1on1 chat if user has account & that account
            // is set to one of the allowed groups
            case '/kerho':
            case '/cam':
            case '/webcam':

                if (_.isUndefined(cfg.webcamURL)) {
                    botApi.sendMessage(userId, 'Botille ei ole määritetty webcamin osoitetta!');
                    resolve();
                }
                else {

                    if (!eventIsFromGroup) {
                        // this command can only be triggered from a group, since this command is
                        // limited to a certain users only, and for now we have no means of finding
                        // out if the person belongs to one of those groups -> calling this personally from
                        // the bot must be denied
                        botApi.sendMessage(userId, 'Webcam-kuva näytetään vain tietyissä ryhmäkeskusteluissa :(');
                        resolve();
                        return;
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
                        return;
                    }

                    // -> If we get here, we are good to go!
                    botApi.sendAction(chatGroupId, 'upload_photo');

                    utils.downloadFile(cfg.webcamURL, cfg.webcamDirectory + 'webcam.jpg', function() {
                        botApi.sendPhoto(chatGroupId, cfg.webcamDirectory + 'webcam.jpg');
                        resolve();
                    });
                }
            break;

            // Add new user to 'user'-table
            // This function doesn't assign primaryGroupId for user, this can be done from /setgroup- function
            // Takes two parameters, weight of the person and gender
            case '/addme':
            case '/luotunnus':
            case '/start':
                if (eventIsFromGroup) {
                    botApi.sendMessage(chatGroupId, 'Keskustellaan aiheesta lisää kahden kesken..');
                    botApi.sendMessage(userId, 'Rekisteröi käyttäjä komennolla /luotunnus <paino> <sukupuoli>');
                    resolve();
                }
                else {
                    userController.newUserProcess(userId, userName, userFirstName, userLastName, userCommandParams)
                    .then(resolve);
                }
            break;

            // Echo the current user settings
            case '/settings':
                userController.getCurrentSettings(userId)
                .then(resolve);
            break;

            // Removes existing user from the database
            case '/removeme':
            case '/poistatunnus':
                userController.removeUser(userId, userName)
                .then(resolve);
            break;

            // Set primaryGroupId for user
            // Can be called from any group which have this bot in it
            case '/setgroup':
            case '/asetaryhmä':
            case '/moro':
            case '/ryhmä':
                userController.setGroup(userId, chatGroupId, chatGroupTitle, eventIsFromGroup)
                .then(resolve);
            break;

            case '/promillet':
            case '/promille':
                if (eventIsFromGroup) {
                    drinkController.getGroupStatusReport(chatGroupId)
                    .then(function(msg) {
                        botApi.sendMessage(chatGroupId, msg);
                        resolve();
                    });
                }
                else {
                    ethanolController.getAlcoholLevel(userId)
                    .then(function(msg) {
                        botApi.sendMessage(userId, msg + ' \u2030');
                        resolve();
                    });
                }
            break;

            default:
                console.log('! Unknown command', msg.text);
                resolve();
        }
    });
};
