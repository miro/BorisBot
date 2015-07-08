// ### Handles all the bot commands

var Promise     = require('bluebird');
var request     = require('request');
var moment      = require('moment-timezone');
var _           = require('lodash');

var cfg         = require('./config');
var db          = require('./database');
var botApi      = require('./botApi');
var utils       = require('./utils');

var userController      = require('./controllers/userController');
var drinkController     = require('./controllers/drinkController');

// set default timezone to bot timezone
moment.tz.setDefault(cfg.botTimezone);


var commander = {};

// "Public" functions
//

// This function handle
commander.handleWebhookEvent = function runUserCommand(msg) {
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

        var chatGroupId = _eventIsFromGroup(msg) ? msg.chat.id : null;
        var chatGroupTitle = _eventIsFromGroup(msg) ? msg.chat.title : null;

        // check if user is ignored
        var userIsIgnored = cfg.ignoredUsers.indexOf(userId) >= 0;
        if (userIsIgnored) {
            // do nothing
            console.log('! Ignored user tried to trigger command');
            resolve();
            return;
        }


        // parse command & possible parameters
        var userInput = msg.text.split(' ');
        var userCommand = userInput.shift();
        var userCommandParams = userInput.join(' ');


        switch (userCommand.toLowerCase()) {
            case '/kalja':
            case '/kippis':
                drinkController.addDrink(msg.message_id, chatGroupId, chatGroupTitle, userId, userCallName, userCommandParams)
                .then(resolve);
            break;

            case '/kaljoja':
                drinkController.getDrinksAmount(userId, chatGroupId, chatGroupTitle, _eventIsFromGroup(msg))
                .then(resolve);
            break;

            case '/otinko':
                drinkController.getPersonalDrinkLog(userId)
                .then(function() {
                    if (_eventIsFromGroup(msg)) {
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
                drinkController.drawGraph(userId, chatGroupId, _eventIsFromGroup(msg), userCommandParams)
                .then(resolve);
            break;

            // Sends image of current state of Spänni's webcam
            // Triggering of this is only possible from the spännimobi group
            case '/webcam':

                if (_.isUndefined(cfg.webcamURL)) {
                    botApi.sendMessage(userId, 'Botille ei ole määritetty webcamin osoitetta!');
                    resolve();
                } else {

                    if (!_eventIsFromGroup(msg)) {
                        // this command can only be triggered from a group, since this command is
                        // limited to a certain users only, and for now we have no means of finding
                        // out if the person belongs to one of those groups -> calling this personally from
                        // the bot must be denied
                        botApi.sendMessage(userId, 'Komento /webcam on käytössä vain valtuutetuissa ryhmäkeskusteluissa!');
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
                if (_eventIsFromGroup(msg)) {
                    botApi.sendMessage(msg.chat.id, 'Keskustellaan aiheesta lisää kahden kesken..');
                    botApi.sendMessage(userId, 'Rekisteröi käyttäjä komennolla /addme <paino> <sukupuoli>');
                    resolve();
                }
                else {
                    userController.newUserProcess(userId, userName, userFirstName, userLastName, userCommandParams)
                    .then(resolve);
                }
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
                if (!_eventIsFromGroup(msg)) {
                    botApi.sendMessage(userId, 'Sinun täytyy lähettää tämä komento jostain ryhmästä määrittääksesi ensisijaisen ryhmäsi!');
                    resolve();
                }
                else {
                    db.checkIfIdInUsers(userId)
                    .then(function checkOk(exists) {
                        if (!exists) {
                            botApi.sendMessage(chatGroupId, 'Käyttäjääsi ei ole vielä luotu botille!\nLuo sellainen komennolla /addme');
                            resolve();
                        }
                        else {
                            db.updatePrimaryGroupIdToUser(userId, chatGroupId)
                            .then(function updateOk() {
                                botApi.sendMessage(chatGroupId, 'Käyttäjätunnuksesi on asetettu kuulumaan tähän ryhmään!');
                                resolve();
                            });
                        }
                    });
                }
            break;

            default:
                console.log('! Unknown command', msg.text);
                resolve();
        }
    });
};



// Helper functions
//

// Returns true, if this event is triggered from group
var _eventIsFromGroup = function(msg) {
    return !_.isUndefined(msg.chat.title);
};


module.exports = commander;
