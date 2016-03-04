// # Commander
//
//      This module is reponsible for handling all the commands (messages starting with "/")
//      what the users sends.
//
//      Counterpart for this file is the talkbox.js, which handles all the non-command messages from events
//      (in case the bot is configured to see all the messages)

var Promise     = require('bluebird');
var request     = require('request');

var _           = require('lodash');
var emoji       = require('node-emoji');
var emojiRegex  = require('emoji-regex');

var cfg         = require('./config');
var botApi      = require('./botApi');
var generic     = require('./generic');
var logger      = cfg.logger;

var userController          = require('./controllers/userController');
var drinkController         = require('./controllers/drinkController');
var ethanolController       = require('./controllers/ethanolController');
var memeController          = require('./controllers/memeController');
var textController          = require('./controllers/textController');
var restaurantController    = require('./controllers/restaurant/restaurantController');
var explController          = require('./controllers/explController');

module.exports = function (event) {
    return new Promise(function (resolve, reject) {

        logger.log('debug', 'Command %s from user %s', event.userCommand, event.userCallName);

        // Dispatch command!
        switch (event.userCommand) {

            // !-commands
            //
            case '!add':
                explController.addExpl(event)
                .then(resolve);
            break;

            case '??':
            case '!expl':
                explController.getExpl(event)
                .then(resolve);
            break;

            case '!rexpl':
                explController.getRandomExpl(event.targetId)
                .then(resolve);
            break;

            case '!ls':
            case '!list':
                explController.listExpls(event.targetId)
                .then(resolve);
            break;

            case '!rm':
                explController.removeExpl(event.userId, event.targetId, event.userCommandParams)
                .then(resolve);
            break;


            // /-commands
            //
            case '/kahvutti':
            case '/sumppi':
            case '/kahvi':
            case emoji.get(':coffee:'):
                drinkController.addDrink(event.eventId, event.userId, event.userCallName, 'coffee',  0, event.isFromGroup)
                .then(resolve);
            break;

            case '/tee':
            case emoji.get(':tea:'):
                drinkController.addDrink(event.eventId, event.userId, event.userCallName, 'tea', 0, event.isFromGroup)
                .then(resolve);
            break;

            case '/kahvit':
                drinkController.sendHotBeverageStatusReportForUser(event.userId)
                .then(resolve);
            break;

            case '/kippis':
                drinkController.showDrinkKeyboard(event.userId, event.isFromGroup)
                .then(resolve);
            break;

            case '/kalja':
            case '/juoma':
            case emoji.get(':beer:'):
            case emoji.get(':wine_glass:'):
            case emoji.get(':cocktail:'):

                if (event.isFromGroup) {
                    drinkController.showDrinkKeyboard(event.userId, event.isFromGroup)
                    .then(resolve);
                }
                else {
                    // TODO: move this logic into drinkController!!

                    // Figure out drinkType
                    var drinkType;
                    if (event.userCommand === '/juoma') {
                        drinkType = event.userCommandParams;
                    }
                    else if (event.userCommand.charAt(0) === '/') {
                        // this was a user command
                        drinkType = 'kalja ' + event.userCommandParams;
                    }
                    else {
                        // This was an emoji + possible parameters
                        drinkType = event.userCommand + ' ' + event.userCommandParams;
                    }

                    var drinkValue = 12; // For now this is fixed for all drinks

                    drinkController.addDrink(event.eventId, event.userId, event.userCallName, drinkType, drinkValue, event.isFromGroup)
                    .then(resolve);
                }
            break;

            case '/kaljoja':
                drinkController.getDrinksAmount(event.userId, event.chatGroupId, event.chatGroupTitle, event.isFromGroup, true)
                .then(resolve);
            break;

            case '/virvokkeita':
                drinkController.getDrinksAmount(event.userId, event.chatGroupId, event.chatGroupTitle, event.isFromGroup, false)
                .then(resolve);
            break;

            case '/log':
            case '/otinko':
                drinkController.getPersonalDrinkLog(event.userId)
                .then(function() {
                    if (event.isFromGroup) {
                        botApi.sendMessage({chat_id: event.userId, text: 'PS: anna "' +
                            userCommand + '"-komento suoraan minulle, älä spämmää turhaan ryhmächättiä!'});
                    }
                    resolve();
                });
            break;

            case '/kumpi':
            case '/valitse':
                generic.whichOne(event.targetId, event.userCommandParams);
                resolve();
            break;

            case '/start':
            case '/help':
                generic.help(event.userId);
                resolve();
            break;

            // # "Histogram" - returns visualization from drink log data.
            // If triggered from a group, returns a graph from that group's data
            // If triggered from a 1on1 chat, returns a graph from the requester's data
            // Takes one parameter, which changes the length of the graph
            case '/graafi':
            case '/histogrammi':
                drinkController.drawGraph(event.userId, event.chatGroupId, event.isFromGroup, event.userCommandParams)
                .then(resolve);
            break;

            // Sends image of current state of Spänni's webcam
            // Triggering of this is only possible from the spännimobi group
            case '/kerho':
            case '/cam':
            case '/webcam':
                generic.webcam(event.userId, event.chatGroupId, event.isFromGroup)
                .then(resolve);
            break;

            // Add new user to 'user'-table
            // This function doesn't assign primaryGroupId for user, this can be done from /setgroup- function
            // Takes two parameters, weight of the person and gender
            case '/addme':
            case '/luotunnus':
                if (event.isFromGroup) {
                    botApi.sendMessage({chat_id: event.chatGroupId, text: 'Jutellaan lisää privassa ' + emoji.get(':smirk:')});
                    botApi.sendMessage({chat_id: event.userId, text: 'Luo käyttäjätunnus komennolla /luotunnus <paino> <sukupuoli>'});
                    resolve();
                }
                else {
                    userController.newUserProcess(event.userId, event.userName, event.userFirstName, event.userLastName, event.userCommandParams)
                    .then(resolve);
                }
            break;

            // Echo the current user settings
            case '/settings':
                userController.getCurrentSettings(event.userId)
                .then(resolve);
            break;

            // Removes existing user from the database
            case '/removeme':
            case '/poistatunnus':
                userController.removeUser(event.userId, event.userName)
                .then(resolve);
            break;

            // Set primaryGroupId for user
            // Can be called from any group which have this bot in it
            case '/setgroup':
            case '/asetaryhmä':
            case '/moro':
            case '/ryhmä':
                userController.setGroup(event.userId, event.chatGroupId, event.chatGroupTitle, event.isFromGroup)
                .then(resolve);
            break;

            case '/jono':
            case '/viive':
                generic.commandCount(event.userId).then(resolve);
            break;

            case '/promillet':
            case '/promille':
                if (event.isFromGroup) {
                    drinkController.getGroupAlcoholStatusReport(event.chatGroupId)
                    .then(function(msg) {
                        botApi.sendMessage({chat_id: event.chatGroupId, text: msg});
                        resolve();
                    });
                }
                else {
                    ethanolController.getAlcoholLevel(event.userId)
                    .then(function(msg) {
                        botApi.sendMessage({chat_id: event.userId, text: msg + ' \u2030'});
                        resolve();
                    })
                    .catch(function(e) {
                        botApi.sendMessage({chat_id: event.userId, text: e});
                        resolve();
                    });
                }
            break;

            case '/meemit':
                memeController.sendSupportedMemes(event.userId);
                resolve();
            break;

            case '/luomeemi':
                memeController.dispatch(event.userId);
                resolve();
            break;

            case '/pankkitili':
            case '/tilinumero':
            case '/tili':
                botApi.sendMessage({chat_id: event.targetId, text: 'FI78 1439 3500 0219 70'});
                resolve();
            break;

            case '/puhelin':
            case '/puh':
                botApi.sendMessage({chat_id: event.targetId, text: '041 369 2262'});
                resolve();
            break;

            case '/iltaa':
                botApi.sendMessage({chat_id: event.targetId, text: 'iltaa'});
                resolve();
            break;

            case '/tiivista':
                if (!event.isFromGroup) {
                    botApi.sendMessage({ chat_id: event.userId, text: 'Tämä komento toimii vain ryhmästä!'});
                    resolve();
                } else {
                    var param = (_.isFinite(event.userCommandParams.split(' ')[0])) ? event.userCommandParams.split(' ')[0] : 1000;
                    botApi.sendMessage({chat_id: event.chatGroupId, text: textController.getSummary(event.chatGroupId, param)});
                    resolve();
                }
            break;

            case '/ravintolat':
            case '/raflat':
            case '/ruoka':
            case '/safka':
            case '/safkat':
            case '/menu':
                restaurantController.getAllMenusForToday(event.isFromGroup)
                .then(function(msg) {
                    botApi.sendMessage({chat_id: event.targetId, text: msg, parse_mode: 'Markdown', disable_web_page_preview: true});
                    resolve();
                })
                .catch( e => {
                    logger.log('error', 'Error on getAllMenusForToday: %s', e);
                    resolve();
                });
            break;


            // # Admin commands
            //
            case '/adminhelp':
                generic.adminhelp(event.userId);
                resolve();
            break;

            case '/botgrouptalk':
                generic.talkAsBotToMainGroup(event.userId, event.userCommandParams);
                resolve();
            break;

            case '/botgroupprivatetalk':
                generic.talkAsBotToUsersInMainGroup(event.userId, event.userCommandParams)
                .then(resolve);
            break;

            case '/botprivatetalk':
                generic.talkAsBotToUser(event.userId, event.userCommandParams)
                .then(resolve);
            break;

            case '/logs':
                generic.sendLog(event.userId, event.userCommandParams)
                .then(resolve);
            break;

            case '/ban':
                generic.banUser(event.userId, event.userCommandParams)
                .then(resolve);
            break;

            case '/unban':
                generic.unbanUser(event.userId, event.userCommandParams)
                .then(resolve);
            break;

            default:
                logger.log('debug', 'Unknown command: ' + event.rawInput);
                resolve();
        }
    });
}
