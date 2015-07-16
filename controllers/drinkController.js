var cfg                 = require('../config');
var db                  = require('../database');
var botApi              = require('../botApi');
var utils               = require('../utils');
var graph               = require('../graph');
var userController      = require('./userController');
var ethanolController   = require('./ethanolController');


var Promise             = require('bluebird');
var moment              = require('moment-timezone');
var _                   = require('lodash');
var emoji               = require('node-emoji');

// set default timezone to bot timezone
moment.tz.setDefault(cfg.botTimezone);

var controller = {};


controller.showDrinkKeyboard = function(userId, eventIsFromGroup) {
    var keyboard = [[
        emoji.get(':beer:'),
        emoji.get(':wine_glass:'),
        emoji.get(':cocktail:')
    ]];

    var msg = eventIsFromGroup ? 'Kippistele tänne! Älä spämmää ryhmächättiä!' : 'Let\'s festival! Mitä juot?';

    return new Promise(function (resolve, reject) {
        botApi.sendMessage(
            userId,
            msg,
            {
                keyboard: keyboard,
                resize_keyboard: true,
                one_time_keyboard: true
            }
        );

        resolve();
    });
};


controller.addDrink = function(messageId, userId, userName, drinkType, drinkValue, eventIsFromGroup) {
    return new Promise(function(resolve, reject) {
        if (eventIsFromGroup) resolve(); // ignore

        db.getUserById(userId).then(function(user) {
            var primaryGroupId = (user && user.get('primaryGroupId')) ? user.get('primaryGroupId') : null;

            db.registerDrink(messageId, primaryGroupId, userId, drinkType, drinkValue)
            .then(function() {
                db.getDrinksSinceTimestamp(_getTresholdMoment(), primaryGroupId)
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
                        returnMessage += '\n(Jos haluat merkata tarkemmin juomiasi, anna käsin jokin näppäimistön';
                        returnMessage += ' emojeista ja kirjoita juoman nimi perään)\n';

                        // Does this user have an account?
                        if (_.isNull(user)) {
                            returnMessage += '\n(Tee tunnus /luotunnus-komennolla, niin voin laskea Sinulle arvion';
                            returnMessage += ' promilletasostasi!)\n';
                        }
                    }

                    // Is there a group title?
                    if (_.isNull(primaryGroupId) && drinksTodayForThisUser > 1) {
                        returnMessage += ' Se olikin jo ' + drinksTodayForThisUser + '. tälle päivälle.\n';
                    }
                    else {
                        returnMessage += ' Se olikin jo ryhmäsi ' + drinksToday +
                        '. tälle päivälle, ja ' + drinksTodayForThisUser + '. käyttäjälle ' + userName + '.\n';

                        // # Notify the group?
                        if (drinksToday === 1) {
                            // first drink for today!
                            var groupMsg = userName + ' avasi pelin! ' + drinkType + '!';
                            botApi.sendMessage(primaryGroupId, groupMsg);

                        }

                        if (drinksToday % 10 === 0) {
                            controller.getGroupStatusReport(primaryGroupId).then(function (statusReport) {
                                var groupMsg = userName + ' kellotti ryhmän ' + drinksToday + '. juoman tälle päivälle!\n';
                                groupMsg += statusReport;

                                botApi.sendMessage(primaryGroupId, groupMsg);
                            });
                        }
                    }

                    botApi.sendMessage(userId, returnMessage);
                    resolve(returnMessage);
                });
            });
        })
        .error(function(e) {
            botApi.sendMessage(userId, 'Kippistely epäonnistui, yritä myöhemmin uudelleen');
            resolve();
        });
    });
};


controller.getPersonalDrinkLog = function(userId) {
    return new Promise(function (resolve, reject) {

        db.getDrinksSinceTimestampForUser(moment().subtract(2, 'day'), userId)
        .then(function(collection) {
            var message = 'Juomasi viimeisen 48h ajalta:\n';

            var currentDay;
            _.each(collection.models, function(model) {
                modelTimestamp = moment(model.get('timestamp'));

                if (!currentDay || currentDay.isBefore(modelTimestamp, 'day')) {
                    message += '\n\n' + emoji.get(':calendar:');
                    message += modelTimestamp.format('DD.MM') + '\n';

                    currentDay = modelTimestamp.clone();
                }

                message += modelTimestamp.format('HH:mm');
                message += ' - ' + model.get('drinkType') + '\n';
            });

            message += '______________\n';
            message += 'Yhteensä ' + collection.models.length + ' kpl';

            botApi.sendMessage(userId, message);
            resolve();
        });
    });
};

controller.drawGraph = function(userId, chatGroupId, msgIsFromGroup, userCommandParams) {
    return new Promise(function(resolve, reject) {

        var dbFetchFunction = null;
        var targetId = null;

        if (msgIsFromGroup) {
            dbFetchTimestampFunction = db.getFirstTimestampForGroup;
            dbFetchDrinksFunction = db.getGroupDrinkTimesSince;
            targetId = chatGroupId;
        }
        else {
            dbFetchTimestampFunction = db.getFirstTimestampForUser;
            dbFetchDrinksFunction = db.getPersonalDrinkTimesSince;
            targetId = userId;
        }

        botApi.sendAction(targetId, 'upload_photo');

        dbFetchTimestampFunction(targetId)
        .then(function(result) {
            var startRangeMoment = moment(result[0]['min']);
            var dateRangeParameter = parseInt(userCommandParams.split(' ')[0], 10);

            if (!_.isNaN(dateRangeParameter) && dateRangeParameter > 0 && dateRangeParameter < moment().diff(startRangeMoment, 'days')) {
                startRangeMoment = moment().subtract(dateRangeParameter,'days')
            }

            dbFetchDrinksFunction(targetId, startRangeMoment)
            .then(function createHistogramFromData(drinkTimestamps) {
                graph.makeHistogram(drinkTimestamps, startRangeMoment)
                .then(function histogramCreatedHandler(plotly) {
                    var destinationFilePath = cfg.plotlyDirectory + 'latestGraph.png';
                    utils.downloadFile(plotly.url + '.png', destinationFilePath, function () {
                        botApi.sendPhoto(targetId, destinationFilePath);
                        resolve();
                    });
                });
            });
        });
    });
};


controller.getDrinksAmount = function(userId, chatGroupId, chatGroupTitle, targetIsGroup) {
    // TODO "joista x viimeisen tunnin aikana"?

    return new Promise(function (resolve, reject) {
         if (targetIsGroup) {
            db.getTotalDrinksAmountForGroup(chatGroupId)
            .then(function fetchOk(result) {
                var output = chatGroupTitle + ' on tuhonnut yhteensä ' + result[0].count + ' juomaa!';
                botApi.sendMessage(chatGroupId, output);
                resolve();
            });
        }
        else {
            db.getTotalDrinksAmount()
            .then(function fetchOk(result) {
                botApi.sendMessage(userId, 'Kaikenkaikkiaan juotu ' + result[0].count + ' juomaa');
                resolve();
            });
        }
    });
}

controller.getGroupStatusReport = function(chatGroupId) {
    return new Promise(function (resolve, reject) {

        db.getDrinksSinceTimestamp(moment().subtract(1,'days'), chatGroupId)
        .then(function fetchOk(collection) {

            if (collection.models.length === 0) {
                resolve('Ei humaltuneita käyttäjiä.');
            }

            var lastUsersId = [];
            var userId;

            _.each(collection.models, function(model) {
                userId = model.get('creatorId');
                if (_.indexOf(lastUsersId, userId) === -1) {
                    lastUsersId.push(userId);
                }
            });

            var userPromises = [];
            _.each(lastUsersId, function(userId) {
                userPromises.push(db.getUserById(userId))
            });

            Promise.all(userPromises)
            .then(function(userArr) {

                // Remove unregistered users
                userArr = _.compact(userArr);

                var alcoLevelPromises = [];
                _.each(userArr, function(user) {
                     alcoLevelPromises.push(ethanolController.getAlcoholLevel(user.get('telegramId')));
                });
                Promise.all(alcoLevelPromises)
                .then(function(alcoLevelArr) {
                    var logArr = [];
                    for (var i = 0; i < alcoLevelArr.length; ++i) {
                        logArr.push({'userName': userArr[i].get('userName'), 'alcoLevel': alcoLevelArr[i]});
                    }

                    // Filter users who have alcoLevel > 0
                    logArr = _.filter(logArr, function(object) {
                        return object.alcoLevel > 0.00;
                    });

                    if (logArr.length === 0) {
                        resolve('Ei humaltuneita käyttäjiä.');
                    }

                    // Sort list by alcoLevel
                    logArr = _.sortBy(logArr, function(object) {
                        return parseFloat(object.alcoLevel);
                    });

                    // Calculate needed padding
                    var paddingLength = _.max(logArr, function(object) {
                        return object.userName.length;
                    });
                    paddingLength = paddingLength.userName.length + 3;

                    // Generate string which goes to message
                    var log = '';
                    _.eachRight(logArr, function(userLog) {
                        log += _.padRight(userLog.userName, paddingLength, '.') + ' ' + userLog.alcoLevel + ' \u2030\n';
                    });
                    resolve(log);
                })
                .catch(function(err) {
                    resolve(err);
                });
            });
        });
    });
};

// ## Private functions
//

var _getTresholdMoment = function() {
    var treshold = moment().hour(9).minute(0);

    var tresholdIsInFuture = treshold.isAfter(moment());
    if (tresholdIsInFuture) {
        treshold.subtract(1, 'day');
    }

    return treshold;
};


module.exports = controller;

