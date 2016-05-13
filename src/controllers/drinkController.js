var cfg                 = require('../config');
var db                  = require('../database');
var botApi              = require('../botApi');
var utils               = require('../utils');
var graphController     = require('./graphController');
var userController      = require('./userController');
var ethanolController   = require('./ethanolController');
var logger              = require('../logger');

var Promise             = require('bluebird');
var moment              = require('moment-timezone');
var _                   = require('lodash');
var emoji               = require('node-emoji');

// set default timezone to bot timezone
moment.tz.setDefault(cfg.botTimezone);

var controller = {};

// TODO: announce when % 100 breaks in group

const ALCOHOL_DAY_TRESHOLD_HOUR = 9;

controller.showDrinkKeyboard = function(userId, eventIsFromGroup) {
    var keyboard = [[
        emoji.get(':beer:'),
        emoji.get(':wine_glass:'),
        emoji.get(':cocktail:')
    ],
    [
        emoji.get(':coffee:'),
        emoji.get(':tea:')
    ]];

    var msg = eventIsFromGroup ? 'Kippistele tänne! Älä spämmää ryhmächättiä!' : 'Let\'s festival! Mitä juot?\n';
    msg += 'Käytä allaolevaa näppäimistöä merkataksesi juoman, tai anna /kippis <juoman nimi>\n';
    msg += '(Tämä komento ei lisännyt vielä yhtään juomaa juoduksi.)';

    return new Promise(function (resolve, reject) {
        botApi.sendMessage({
            chat_id: userId,
            text: msg,
            reply_markup: JSON.stringify({
                keyboard: keyboard,
                resize_keyboard: true,
                one_time_keyboard: true
            })
        });

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

            db.registerDrink(messageId, primaryGroupId, userId, drinkType, drinkValue, user)
            .then(function() {
                db.getDrinksSinceTimestamp(_getTresholdMoment(ALCOHOL_DAY_TRESHOLD_HOUR), { chatGroupId: primaryGroupId })
                .then(function createReturnMessageFromCollection(drinksCollection) {

                    var returnMessage = '';

                    // Drink had alcohol
                    if (drinkValue > 0) {

                        var alcoholDrinks = _.filter(drinksCollection.models, function(model) {
                            return model.get('drinkValue') > 0;
                        });
                        var drinksToday = alcoholDrinks.length;
                        var drinksTodayForThisUser = _.filter(alcoholDrinks, function(model) {
                            return model.attributes.drinker_telegram_id === userId;
                        }).length;

                        // # Form the message
                        returnMessage = 'Kippis!!';

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
                        if (_.isNull(primaryGroupId)) {
                            returnMessage += ' Se olikin jo ' + drinksTodayForThisUser + '. tälle päivälle.\n';
                        } else {
                            returnMessage += ' Se olikin jo ryhmäsi ' + drinksToday +
                            '. tälle päivälle, ja Sinulle päivän ' + drinksTodayForThisUser + '.\n';
                                // # Notify the group?
                                if (drinksToday === 1) {
                                    // first drink for today!
                                    var groupMsg = userName + ' avasi pelin! ' + drinkType + '!';
                                    botApi.sendMessage({chat_id: primaryGroupId, text: groupMsg});
                                }
                                // Tell status report on 5, 10, 20, 30, ....
                                if (drinksToday % 10 === 0 || drinksToday === 5) {
                                    controller.getGroupAlcoholStatusReport(primaryGroupId).then(function (statusReport) {
                                        var groupMsg = userName + ' kellotti ryhmän ' + drinksToday + '. juoman tälle päivälle!\n\n';
                                        groupMsg += emoji.get(':top:') + 'Tilanne:\n';
                                        groupMsg += statusReport;

                                        botApi.sendMessage({chat_id: primaryGroupId, text: groupMsg});
                                    });
                                }
                        }

                        // send the message
                        botApi.sendMessage({chat_id: userId, text: returnMessage});

                        // trigger also status report (to discourage users from spamming group chat)
                        if (!_.isNull(primaryGroupId)) {
                            controller.getGroupAlcoholStatusReport(primaryGroupId).then(function(statusReport) {
                                botApi.sendMessage({ chat_id: userId, text: '\nRyhmäsi tilanne:\n' + statusReport});
                            });
                        }

                        resolve(returnMessage);

                    // Drink was coffee or tea
                    } else if (drinkType === 'coffee' || drinkType === 'tea') {
                        var drinkTypeMsg = (drinkType === 'coffee') ? 'kahvikupit' : 'teekupposet';
                        var msg = 'Tänään nauttimasi ' + drinkTypeMsg + ':\n';

                        db.getCount('drinks', {
                            drinker_telegram_id: userId,
                            drinkType: drinkType
                        }, _getTresholdMoment(6))
                        .then(function(count) {
                            _.times(count, function() {
                                msg += emoji.get(':' + drinkType + ':');
                            });
                            msg += '\n\n';
                            if (!_.isNull(primaryGroupId)) {
                                controller.getGroupHotBeveragelStatusReport(primaryGroupId)
                                .then(function(statusReport) {
                                    msg += statusReport;
                                    botApi.sendMessage({chat_id: userId, text: msg});
                                    resolve(msg);
                                });
                            } else {
                                msg += 'Huom: Käy /moro ´ttamassa ryhmässä nähdäksesi koko ryhmäsi nauttimat kupposet!';
                                botApi.sendMessage({chat_id: userId, text: msg});
                                resolve(msg);
                            }
                        });

                    // Drink was something non-alcohol and unspecified
                    } else {
                        logger.log('info', 'Unknown drinkType: ', drinkType);
                        resolve();
                    }
                });
            });
        })
        .catch(function(e) {
            botApi.sendMessage({chat_id: userId, text: 'Kippistely epäonnistui, yritä myöhemmin uudelleen'});
            resolve();
        });
    });
};


controller.getPersonalDrinkLog = function(userId) {
    return new Promise(function (resolve, reject) {

        db.getDrinksSinceTimestamp(moment().subtract(2, 'day'), { drinker_telegram_id: userId })
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

            botApi.sendMessage({chat_id: userId, text: message});
            resolve();
        });
    });
};


controller.getDailyAlcoholLogForEachGroup = function() {
    // TODO: sort the list

    // get not-the-previous-treshold but the treshold-before-that
    var treshold = _getTresholdMoment(ALCOHOL_DAY_TRESHOLD_HOUR).subtract(1, 'day');

    return db.getDrinksSinceTimestamp(treshold)
    .then(collection => _.chain(collection.serialize())
        .filter(item => item.drinkValue > 0)
        .filter(item => _.get(item, 'drinker.id'))
        .groupBy(item => item.chatGroupId)
        .reduce((result, groupItems, key) => {
            result[key] = _.countBy(groupItems, item => {
                return item.drinker.userName ? item.drinker.userName : item.drinker.firstName;
            });
            return result;
        }, {})
        .value());
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
            whereObject.drinker_telegram_id = userId;
            targetId = userId;
        }

        botApi.sendAction({chat_id: targetId, action: 'upload_photo'});

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

                graphController.makeHistogram(timestamps, startRangeMoment)
                .then(function histogramCreatedHandler(plotly) {
                    var destinationFilePath = cfg.plotlyDirectory + 'latestGraph.png';
                    utils.downloadFile(plotly.url + '.png', destinationFilePath)
                    .then(function() {
                        botApi.sendPhoto({chat_id: targetId, file: destinationFilePath});
                        resolve();
                    });
                });
            });
        });
    });
};


controller.getDrinksAmount = function(userId, chatGroupId, chatGroupTitle, targetIsGroup, alcoholic) {
    return new Promise(function (resolve, reject) {

        var drinkType = (alcoholic) ? 'alkoholillista juomaa' : 'alkoholitonta juomaa';
        if (targetIsGroup) {

            var dbFetches = [];

            // all-time drinks for group
            dbFetches.push(db.getCount('drinks', { chatGroupId: chatGroupId }, null, alcoholic));
            dbFetches.push(db.getCount('drinks', { chatGroupId: chatGroupId,}, moment().subtract(1, 'days').toJSON(), alcoholic));
            dbFetches.push(db.getCount('drinks', { chatGroupId: chatGroupId }, moment().subtract(2, 'days').toJSON(), alcoholic));

            Promise.all(dbFetches).then(function fetchOk(counts) {
                var output = chatGroupTitle + ' on tuhonnut yhteensä ' + counts[0] + ' ' + drinkType + ', joista ';
                output += counts[1] + ' viimeisen 24h aikana ja ' + counts[2] + ' viimeisen 48h aikana.';

                botApi.sendMessage({chat_id: chatGroupId, text: output});
                resolve();
            });
        }
        else {
            db.getCount('drinks', null, null, alcoholic)
            .then(function fetchOk(drinkCount) {
                botApi.sendMessage({ chat_id: userId, text: 'Kaikenkaikkiaan juotu ' + drinkCount + ' ' + drinkType + '.' });
                resolve();
            });
        }
    });
}

controller.getGroupAlcoholStatusReport = function(chatGroupId) {
    return new Promise(function (resolve, reject) {

        db.getDrinksSinceTimestamp(moment().subtract(2,'days'), { chatGroupId: chatGroupId })
        .then(function fetchOk(drinkCollection) {

            if (drinkCollection.models.length === 0) {
                resolve('Ei humaltuneita käyttäjiä.');
            }

            var alcoholDrinks = _.filter(drinkCollection.models, function(model) {
                return model.get('drinkValue') > 0;
            });

            var drinksByUser = _.groupBy(alcoholDrinks, function(model) {
                return model.get('drinker_telegram_id');
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
                        log += _.padEnd(userLog.userName, paddingLength, '.') + ' ' + userLog.alcoLevel + ' \u2030';
                        log += ' (' + userLog.drinkCount24h + ' / ' + userLog.drinkCount48h + ')\n';
                    });
                    resolve(log);
                })
                .catch(function(err) {
                    logger.log('error', 'ERROR on status report function %s', err);
                    resolve(err);
                });
            });
        });
    });
};

controller.getGroupHotBeveragelStatusReport = function(chatGroupId) {
    return new Promise(function(resolve,reject) {
        var log = 'Ryhmäsi hörppimät kuumat kupposet:\n- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -\n';
        db.getDrinksSinceTimestamp(_getTresholdMoment(6), {drinkValue: 0})
        .then(function fetchOk(collection) {

            // Filter coffees and teas
            var beveragesByUser = _.filter(collection.models, function(model) {
                return model.get('drinkType') === 'coffee' || model.get('drinkType') === 'tea';
            });

            beveragesByUser = _.groupBy(collection.models, function(model) {
                return model.get('drinker_telegram_id');
            });
            var userAccountPromises = [];
            _.each(beveragesByUser, function(coffee, userId) {
                userAccountPromises.push(db.getUserById(userId));
            });
            Promise.all(userAccountPromises)
            .then(function(users) {
                users = _.compact(users);
                _.each(users, function(user) {
                    log += user.get('userName') + ': ';
                    _.each(beveragesByUser[user.get('telegramId')], function(beverage) {
                        log += emoji.get(':' + beverage.get('drinkType') + ':');
                    });
                    log += '\n';
                });
                resolve(log);
            });
        });
    });
};

controller.sendHotBeverageStatusReportForUser = function(userId) {
    return new Promise(function(resolve,reject) {
        db.getUserById(userId)
        .then(function(model) {
            var primaryGroupId = (_.isNull(model)) ? null : model.get('primaryGroupId');
            if (!_.isNull(primaryGroupId)) {
                controller.getGroupHotBeveragelStatusReport(primaryGroupId)
                .then(function(msg) {
                    botApi.sendMessage(userId, msg);
                    resolve();
                });
            } else {
                botApi.sendMessage({chat_id: userId, text: 'Käy /moro´ttamassa ryhmässä saadaksesi kahvitilastot näkyviin!'});
                resolve();
            }
        });
    });
};

// ## Private functions
//

var _getTresholdMoment = function(timeAsHours) {
    var treshold = moment().hour(timeAsHours).minute(0);

    var tresholdIsInFuture = treshold.isAfter(moment());
    if (tresholdIsInFuture) {
        treshold.subtract(1, 'day');
    }

    return treshold;
};

module.exports = controller;

