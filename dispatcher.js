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
var replys      = require('./replys');
var logger      = cfg.logger;

var userController      = require('./controllers/userController');
var drinkController     = require('./controllers/drinkController');
var ethanolController   = require('./controllers/ethanolController');
var memeController      = require('./controllers/memeController');
var textController      = require('./controllers/textController');

// set default timezone to bot timezone
moment.tz.setDefault(cfg.botTimezone);


module.exports = function dispatchTelegramEvent(msg) {
    return new Promise(function (resolve, reject) {
        logger.log('debug', 'Webhook event from id: %s, message: %s', msg.from.id, msg.text);

        if (!msg.text) {
            logger.log('debug', 'No text on event, ignore');
            return resolve();
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
            logger.log('warn', 'Ignored user tried to use bot, username: %s', userCallName);
            return resolve();
        }
        
        // check if message was reply to bot's message
        if (msg.reply_to_message) {
            replys.eventEmitter.emit(msg.reply_to_message.message_id, msg.text);
            return resolve();
        }

        // Check if event was not command
        if (msg.text.charAt(0) !== '/') {
            textController.addMessage(chatGroupId, msg.text);
            return resolve();
        }
        
        // Parse command & possible parameters
        var userInput = msg.text.split(' ');
        var userCommand = userInput.shift().toLowerCase().split('@')[0];
        var userCommandParams = userInput.join(' ');


        // Dispatch!
        switch (userCommand) {
            
            case '/kahvutti':
            case '/sumppi':
            case '/kahvi':
            case emoji.get(':coffee:'):
                drinkController.addDrink(msg.message_id, userId, userCallName, 'coffee',  0, eventIsFromGroup)
                .then(resolve);
            break;
            
            case '/tee':
            case emoji.get(':tea:'):
                drinkController.addDrink(msg.message_id, userId, userCallName, 'tea', 0, eventIsFromGroup)
                .then(resolve);
            break;
            
            case '/kahvit':
                drinkController.sendHotBeverageStatusReportForUser(userId)
                .then(resolve);
            break;
            
            case '/kippis':
                drinkController.showDrinkKeyboard(userId, eventIsFromGroup)
                .then(resolve);
            break;

            case '/kalja':
            case '/juoma':
            case emoji.get(':beer:'):
            case emoji.get(':wine_glass:'):
            case emoji.get(':cocktail:'):

                if (eventIsFromGroup) {
                    drinkController.showDrinkKeyboard(userId, eventIsFromGroup)
                    .then(resolve);
                }
                else {
                    // Figure out drinkType
                    var drinkType;
                    if (userCommand === '/juoma') {
                        drinkType = userCommandParams;
                    }
                    else if (userCommand.charAt(0) === '/') {
                        // this was a user command
                        drinkType = 'kalja ' + userCommandParams;
                    }
                    else {
                        // This was an emoji + possible parameters
                        drinkType = userCommand + ' ' + userCommandParams;
                    }

                    var drinkValue = 12; // For now this is fixed for all drinks

                    drinkController.addDrink(msg.message_id, userId, userCallName, drinkType, drinkValue, eventIsFromGroup)
                    .then(resolve);
                }
            break;

            case '/kaljoja':
                drinkController.getDrinksAmount(userId, chatGroupId, chatGroupTitle, eventIsFromGroup, true)
                .then(resolve);
            break;
            
            case '/virvokkeita':
                drinkController.getDrinksAmount(userId, chatGroupId, chatGroupTitle, eventIsFromGroup, false)
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

            case '/kumpi':
                var targetId = (eventIsFromGroup) ? chatGroupId : userId;
                generic.whichOne(targetId, userCommandParams);
                resolve();
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
                    botApi.sendMessage(chatGroupId, 'Jutellaan lisää privassa ' + emoji.get(':smirk:'));
                    botApi.sendMessage(userId, 'Luo käyttäjätunnus komennolla /luotunnus <paino> <sukupuoli>');
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

            case '/jono':
                generic.commandCount(userId).then(resolve);
            break;

            case '/promillet':
            case '/promille':
                if (eventIsFromGroup) {
                    drinkController.getGroupAlcoholStatusReport(chatGroupId)
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

            case '/meemit':
                memeController.sendSupportedMemes(userId);
                resolve();
            break;
            
            case '/luomeemi':
                memeController.dispatch(userId);
                resolve();
            break;

            case '/tili':
                botApi.sendMessage(chatGroupId, 'FI78 1439 3500 0219 70');
                resolve();
            break;
            
            case '/tiivista':
                if (!eventIsFromGroup) {
                    botApi.sendMessage(userId, 'Tämä komento toimii vain ryhmästä!');
                    resolve();
                } else {
                    botApi.sendMessage(chatGroupId, textController.getSummary(chatGroupId));
                    resolve();
                }
            break;
            
            // Admin commands
            
            case '/bottalk':
                generic.talkAsBotToMainGroup(userId, userCommandParams);
                resolve();
            break;

            case '/botprivatetalk':
                generic.talkAsBotToUsersInMainGroup(userId, userCommandParams)
                .then(resolve);
            break;
            
            case '/logs':
                generic.sendLog(userId, userCommandParams)
                .then(resolve);
            break;

            default:
                logger.log('debug', 'Unknown command: ' + msg.text);
                resolve();
        }
    });
};
