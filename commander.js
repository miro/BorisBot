// ### Handles all the bot commands

var fs          = require('fs');
var Promise     = require('bluebird');
var request     = require('request');
var moment      = require('moment-timezone');
var _           = require('lodash');

var cfg         = require('./config');
var db          = require('./database');
var graph       = require('./graph');
var botApi      = require('./botApi');

var userController      = require('./controllers/userController');

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
        var userCommandParams = userInput.join(' ').substring(0,140); // TODO this limit should be done only for /kippis commands


        switch (userCommand.toLowerCase()) {
            case '/kalja':
            case '/kippis':
                commander.registerDrink(msg.message_id, chatGroupId, chatGroupTitle, userId, userName, userCommandParams)
                .then(function(returnMessage) {
                    commander.sendMessage(msg.chat.id, returnMessage);
                    resolve();
                })
                .error(function(e) {
                    commander.sendMessage(msg.chat.id, 'Kippistely epäonnistui, yritä myöhemmin uudelleen');
                    resolve();
                });
            break;

            case '/kaljoja':
                // TODO "joista x viimeisen tunnin aikana"?

                if (_eventIsFromGroup(msg)) {
                    db.getTotalDrinksAmountForGroup(msg.chat.id)
                    .then(function fetchOk(result) {
                        var output = msg.chat.title + ' on tuhonnut yhteensä ' + result[0].count + ' juomaa!';
                        botApi.sendMessage(msg.chat.id, output);
                        resolve();
                    });
                }
                else {
                    db.getTotalDrinksAmount()
                    .then(function fetchOk(result) {
                        botApi.sendMessage(msg.chat.id, 'Kaikenkaikkiaan juotu ' + result[0].count + ' juomaa');
                        resolve();
                    });
                }
            break;

            case '/otinko':
                commander.getPersonalDrinkLog(userId)
                .then(function(logString) {
                    botApi.sendMessage(userId, logString);

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

                // If no valid number is given as a parameter, fallback to 5
                var dateRangeParameter = parseInt(userCommandParams.split(' ')[0], 10);
                var rangeInDays = _.isNaN(dateRangeParameter) ? 5 : dateRangeParameter;

                var dbFetchFunction = null;
                var targetId = null;

                if (_eventIsFromGroup(msg)) {
                    dbFetchFunction = db.getGroupDrinkTimesSince;
                    targetId = chatGroupId;
                }
                else {
                    dbFetchFunction = db.getPersonalDrinkTimesSince;
                    targetId = userId;
                }

                dbFetchFunction(targetId, moment().subtract(rangeInDays, 'day'))
                .then(function createHistogramFromData(drinkTimestamps) {
                    graph.makeHistogram(drinkTimestamps, rangeInDays)
                    .then(function histogramCreatedHandler(plotly) {
                        var destinationFilePath = cfg.plotlyDirectory + 'latestGraph.png';
                        _downloadFile(plotly.url + '.png', destinationFilePath, function fileDownloadCallback() {
                            botApi.sendPhoto(targetId, destinationFilePath);
                            resolve();
                        });
                    });
                });
            break;

            // Sends image of current state of Spänni's webcam
            // Triggering of this is only possible from the spännimobi group
            case '/webcam':
                if (!_eventIsFromGroup(msg)) {
                    // this command can only be triggered from a group, since this command is
                    // limited to a certain users only, and for now we have no means of finding
                    // out if the person belongs to one of those groups -> calling this personally from
                    // the bot must be denied
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
                _downloadFile(cfg.webcamURL, cfg.webcamDirectory + 'webcam.jpg', function() {
                    botApi.sendPhoto(chatGroupId, cfg.webcamDirectory + 'webcam.jpg');
                    resolve();
                });
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

commander.registerDrink = function(messageId, chatGroupId, chatGroupTitle, userId, userName, drinkType) {
    // TODO create drinkController,move this to there

    // fallback to 'kalja' if no drinkType is set
    drinkType = !drinkType ? 'kalja' : drinkType;

    return new Promise(function(resolve, reject) {
        db.registerDrink(messageId, chatGroupId, userId, drinkType)
        .then(function() {
            db.getDrinksSinceTimestamp(_getTresholdMoment(), chatGroupId)
            .then(function createReturnMessageFromCollection(drinksCollection) {

                var drinksToday = drinksCollection.models.length;
                var drinksTodayForThisUser = _.filter(drinksCollection.models, function(model) {
                    return model.attributes.creatorId === userId;
                }).length;

                // # Form the message
                var returnMessage = 'Kippis!!';

                // was this todays first for the user?
                if (drinksTodayForThisUser === 1) {
                    returnMessage += ' Päivä käyntiin!';
                }

                // Is there a group title?
                if (_.isNull(chatGroupTitle)) {
                    returnMessage += ' Se olikin jo ' + drinksTodayForThisUser + '. tälle päivälle.\n';
                }
                else {
                    returnMessage += ' Se olikin jo ryhmän ' + chatGroupTitle + ' ' + drinksToday +
                    '. tälle päivälle, ja ' + drinksTodayForThisUser + '. käyttäjälle ' + userName + '.\n';
                }

                resolve(returnMessage);
            });
        });
    });
};


commander.getPersonalDrinkLog = function(userId) {
    // TODO sort by timestamp, better
    return new Promise(function (resolve, reject) {

        db.getDrinksSinceTimestampForUser(moment().subtract(2, 'day'), userId)
        .then(function(collection) {
            var message = 'Juomasi viimeisen 48h ajalta:\n\n';

            _.each(collection.models, function(model) {
                message += moment(model.get('timestamp')).format('HH:mm');
                message += ' - ' + model.get('drinkType') + '\n';
            });

            message += '______________\n';
            message += 'Yhteensä ' + collection.models.length + ' kpl';

            resolve(message);
        });
    });
};


// Helper functions
//
var _getTresholdMoment = function() {
    var treshold = moment().hour(9).minute(0);

    var tresholdIsInFuture = treshold.isAfter(moment());
    if (tresholdIsInFuture) {
        treshold.subtract(1, 'day');
    }

    return treshold;
};

// Returns true, if this event is triggered from group
var _eventIsFromGroup = function(msg) {
    return !_.isUndefined(msg.chat.title);
};



var _downloadFile = function(uri, filename, callback) {
    request.head(uri, function(err, res, body) {
        if (err) {
            console.log('Error on file download!', err);
        }
        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};

module.exports = commander;
