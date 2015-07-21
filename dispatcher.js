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
var generic     = require('./generic');

var userController      = require('./controllers/userController');
var drinkController     = require('./controllers/drinkController');
var ethanolController   = require('./controllers/ethanolController');
var mapController       = require('./controllers/mapController');

// set default timezone to bot timezone
moment.tz.setDefault(cfg.botTimezone);


module.exports = function dispatchTelegramEvent(msg) {
    return new Promise(function (resolve, reject) {
        console.log('webhook event!', msg);

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

        // Event is text
        if (msg.text) {

            // Parse command & possible parameters
            var userInput = msg.text.split(' ');
            var userCommand = userInput.shift().toLowerCase().split('@')[0];
            var userCommandParams = userInput.join(' ');


            // Text commands
            switch (userCommand) {
                
                case '/kippis':
                    drinkController.showDrinkKeyboard(userId, eventIsFromGroup)
                    .then(resolve);
                break;

                // Drink logging commands - works only on private
                case '/kalja':
                case emoji.get(':beer:'):
                case emoji.get(':wine_glass:'):
                case emoji.get(':cocktail:'):
                    var drinkType = (userCommand !== '/kalja') ? userCommand + ' ' + userCommandParams : emoji.get(':beer:') + ' ' + userCommandParams;
                    var drinkValue = 12; // Can be modified later.
                    drinkController.addDrink(msg.message_id, userId, userCallName, drinkType, drinkValue, eventIsFromGroup)
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

                case '/help':
                    generic.help(userId);
                    resolve();
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
                case '/kerho':
                case '/cam':
                case '/webcam':
                    generic.webcam(userId, chatGroupId, eventIsFromGroup)
                    .then(resolve);
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

                case '/bottalk':
                    generic.talkAsBotToMainGroup(userId, userCommandParams);
                    resolve();
                break;
                
                case '/botprivatetalk':
                    generic.talkAsBotToUsersInMainGroup(userId, userCommandParams)
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

                case '/sijainnit':
                    mapController.getLocationsForUser(userId,12)
                    .then(resolve);
                break;
                
                default:
                    console.log('! Unknown command', msg.text);
                    resolve();
            }
        
        // Event is location
        } else if (msg.location) {
            
            mapController.addLocation(userId, msg.location.longitude, msg.location.latitude)
            .then(resolve);
            
        } else {
            console.log('Unknown event!');
            resolve();
        }
    });
};
