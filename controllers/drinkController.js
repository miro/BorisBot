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

// TODO: announce when % 100 breaks in group


controller.showDrinkKeyboard = function(userId, eventIsFromGroup) {
    var keyboard = [[
        emoji.get(':beer:'),
        emoji.get(':wine_glass:'),
        emoji.get(':cocktail:')
    ]];

    var msg = eventIsFromGroup ? 'Kippistele tänne! Älä spämmää ryhmächättiä!' : 'Let\'s festival! Mitä juot?\n';
    msg += 'Käytä allaolevaa näppäimistöä merkataksesi juoman, tai anna /kippis <juoman nimi>\n';
    msg += '(Tämä komento ei lisännyt vielä yhtään juomaa juoduksi.)';

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
    // TODO: don't save chatGroup as part drink
    return new Promise(function(resolve, reject) {
        if (eventIsFromGroup) resolve(); // ignore

        drinkType = drinkType.substr(0, 140); // shorten to fit DB field

        db.getUserById(userId).then(function(user) {
            var primaryGroupId = (user && user.get('primaryGroupId')) ? user.get('primaryGroupId') : null;

            db.registerDrink(messageId, primaryGroupId, userId, drinkType, drinkValue)
            .then(function() {
                db.getDrinksSinceTimestamp(_getTresholdMoment(), { chatGroupId: primaryGroupId })
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
                        returnMessage += '\n\n(Jos haluat merkata tarkemmin juomiasi, anna käsin jokin näppäimistön';
                        returnMessage += ' emojeista ja kirjoita juoman nimi perään)\n\n';

                        // Does this user have an account?
                        if (_.isNull(user)) {
                            returnMessage += '\n\n(Tee tunnus /luotunnus-komennolla, niin voin laskea Sinulle arvion';
                            returnMessage += ' promilletasostasi!)\n\n';
                        }
                    }

                    // Is there a group title?
                    if (_.isNull(primaryGroupId) && drinksTodayForThisUser > 1) {
                        returnMessage += ' Se olikin jo ' + drinksTodayForThisUser + '. tälle päivälle.\n';
                    }
                    else {
                        returnMessage += ' Se olikin jo ryhmäsi ' + drinksToday +
                        '. tälle päivälle, ja Sinulle päivän ' + drinksTodayForThisUser + '.\n';

                        // # Notify the group?
                        if (drinksToday === 1) {
                            // first drink for today!
                            var groupMsg = userName + ' avasi pelin! ' + drinkType + '!';
                            botApi.sendMessage(primaryGroupId, groupMsg);

                        }

                        // Tell status report on 5, 10, 20, 30, ....
                        if (drinksToday % 10 === 0 || drinksToday === 5) {
                            controller.getGroupStatusReport(primaryGroupId).then(function (statusReport) {
                                var groupMsg = userName + ' kellotti ryhmän ' + drinksToday + '. juoman tälle päivälle!\n\n';
                                groupMsg += emoji.get(':top:') + 'Tilanne:\n';
                                groupMsg += statusReport;

                                botApi.sendMessage(primaryGroupId, groupMsg);
                            });
                        }
                    }

                    // send the message
                    botApi.sendMessage(userId, returnMessage);

                    // trigger also status report (to discourage users from spamming group chat)
                    if (!_.isNull(primaryGroupId)) {
                        controller.getGroupStatusReport(primaryGroupId).then(function(statusReport) {
                            botApi.sendMessage(userId, '\nRyhmäsi tilanne:\n' + statusReport);
                        });
                    }

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

        db.getDrinksSinceTimestamp(moment().subtract(2, 'day'), { creatorId: userId })
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

        var targetId = null;
        var whereObject = {};

        if (msgIsFromGroup) {
            whereObject.chatGroupId = chatGroupId;
            targetId = chatGroupId;
        }
        else {
            whereObject.creatorId = userId;
            targetId = userId;
        }

        botApi.sendAction(targetId, 'upload_photo');

        db.getOldest('drinks', whereObject)
        .then(function(result) {
            var startRangeMoment = moment(result[0]['min']);
            var dateRangeParameter = parseInt(userCommandParams.split(' ')[0], 10);

            if (!_.isNaN(dateRangeParameter) && dateRangeParameter > 0 && dateRangeParameter < moment().diff(startRangeMoment, 'days')) {
                startRangeMoment = moment().subtract(dateRangeParameter,'days')
            }

            db.getDrinksSinceTimestamp(startRangeMoment, whereObject)
            .then(function createHistogramFromData(drinks) {
                var timestamps = [];
                _.each(drinks.models, function(model) {
                    timestamps.push(moment(model.get('timestamp')));
                });

                graph.makeHistogram(timestamps, startRangeMoment)
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
    return new Promise(function (resolve, reject) {
         if (targetIsGroup) {

            var dbFetches = [];

            // all-time drinks for group
            dbFetches.push(db.getCount('drinks', { chatGroupId: chatGroupId }));
            dbFetches.push(db.getCount('drinks', { chatGroupId: chatGroupId }, moment().subtract(1, 'days').toJSON()));
            dbFetches.push(db.getCount('drinks', { chatGroupId: chatGroupId }, moment().subtract(2, 'days').toJSON()));

            Promise.all(dbFetches).then(function fetchOk(counts) {
                var output = chatGroupTitle + ' on tuhonnut yhteensä ' + counts[0] + ' juomaa, joista ';
                output += counts[1] + ' viimeisen 24h aikana ja ' + counts[2] + ' viimeisen 48h aikana.';

                botApi.sendMessage(chatGroupId, output);
                resolve();
            });
        }
        else {
            db.getCount('drinks')
            .then(function fetchOk(drinkCount) {
                botApi.sendMessage(userId, 'Kaikenkaikkiaan juotu ' + drinkCount + ' juomaa');
                resolve();
            });
        }
    });
}

controller.getGroupStatusReport = function(chatGroupId) {
    return new Promise(function (resolve, reject) {

        db.getDrinksSinceTimestamp(moment().subtract(2,'days'), { chatGroupId: chatGroupId })
        .then(function fetchOk(drinkCollection) {

            if (drinkCollection.models.length === 0) {
                resolve('Ei humaltuneita käyttäjiä.');
            }

            var drinksByUser = _.groupBy(drinkCollection.models, function(model) {
                return model.get('creatorId');
            });

            // Create DB fetch for each of these users
            var userAccountPromises = [];
            _.each(drinksByUser, function(drink, userId) {
                userAccountPromises.push(db.getUserById(userId));
            });

            Promise.all(userAccountPromises)
            .then(function(users) {

                // Remove unregistered users
                users = _.compact(users);

                // Calculate alcohol level for each user
                var alcoLevelPromises = [];
                _.each(users, function(user) {
                     alcoLevelPromises.push(ethanolController.getAlcoholLevel(user.get('telegramId')));
                });
                Promise.all(alcoLevelPromises)
                .then(function(alcoLevelArr) {

                    var drinkersArray = [];
                    for (var i = 0; i < alcoLevelArr.length; ++i) {
                        var userCallName = users[i].get('userName') ? users[i].get('userName') : users[i].get('firstName');
                        var userIdAsStr = '' + users[i].get('telegramId');

                        // count drinks from the last 24h
                        var drinkCount24h = 0;
                        var minMoment = moment().subtract(1, 'day');
                        _.each(drinksByUser[userIdAsStr], function(drinkModel) {
                            if (minMoment.isBefore(moment(drinkModel.get('timestamp')))) {
                                drinkCount24h++;
                            }
                        });

                        drinkersArray.push({
                            userName: userCallName,
                            alcoLevel: alcoLevelArr[i],
                            drinkCount48h: drinksByUser[userIdAsStr].length,
                            drinkCount24h: drinkCount24h
                        });
                    }

                    // Filter users who have alcoLevel > 0
                    drinkersArray = _.filter(drinkersArray, function(object) {
                        return object.alcoLevel > 0.00;
                    });

                    if (drinkersArray.length === 0) {
                        resolve('Ei humaltuneita käyttäjiä.');
                    }

                    // Sort list by alcoLevel
                    drinkersArray = _.sortBy(drinkersArray, function(object) {
                        return parseFloat(object.alcoLevel);
                    });

                    // Calculate needed padding
                    var paddingLength = _.max(drinkersArray, function(object) {
                        return object.userName.length;
                    });
                    paddingLength = paddingLength.userName.length + 3;

                    // Generate string which goes to message
                    var log = emoji.get('mens') + ' –––– ' +  emoji.get('chart_with_upwards_trend') +
                         ' –––– ' + '(24h/48h)\n';

                    _.eachRight(drinkersArray, function(userLog) {
                        log += _.padRight(userLog.userName, paddingLength, '.') + ' ' + userLog.alcoLevel + ' \u2030';
                        log += ' (' + userLog.drinkCount24h + ' / ' + userLog.drinkCount48h + ')\n';
                    });
                    resolve(log);
                })
                .catch(function(err) {
                    console.log('ERROR on status report function', err);
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

