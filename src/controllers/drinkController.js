var Promise             = require('bluebird');
var moment              = require('moment-timezone');
var _                   = require('lodash');
var emoji               = require('node-emoji');

var cfg                 = require('../config');
var db                  = require('../database');
var botApi              = require('../botApi');
var utils               = require('../utils');
var graphController     = require('./graphController');
var ethanolController   = require('./ethanolController');
var logger              = require('../logger');


// set default timezone to bot timezone
moment.tz.setDefault(cfg.botTimezone);

var controller = {};

// TODO: announce when % 100 breaks in group
// TODO: user related database interactions should be done through userController

const ALCOHOL_DAY_TRESHOLD_HOUR = 9;

controller.showDrinkKeyboard = function(userId, eventIsFromGroup) {
    var keyboard = [
        [
            emoji.get(':beer:'),
            emoji.get(':wine_glass:'),
            emoji.get(':cocktail:')
        ],
        [
            emoji.get(':coffee:'),
            emoji.get(':tea:')
        ]
    ];

    var msg = eventIsFromGroup
        ? 'Kippistele tänne! Älä spämmää ryhmächättiä!'
        : 'Let\'s festival! Mitä juot?\n';

    msg += 'Käytä allaolevaa näppäimistöä merkataksesi juoman, tai anna /kippis <juoman nimi>\n';
    msg += '(Tämä komento ei lisännyt vielä yhtään juomaa juoduksi.)';


    botApi.sendMessage({
        chat_id: userId,
        text: msg,
        reply_markup: JSON.stringify({
            keyboard,
            resize_keyboard: true,
            one_time_keyboard: true
        })
    });
    return Promise.resolve();
};


controller.addDrink = function(
    messageId, userId, userName, drinkType, drinkValue, eventIsFromGroup
) {

    // TODO: don't save chatGroup as part drink
    return new Promise((resolve) => {
        if (eventIsFromGroup) resolve(); // ignore

        drinkType = drinkType.substr(0, 140); // shorten to fit DB field

        db.getUserById(userId).then((user) => {
            var primaryGroupId = (user && user.get('primaryGroupId'))
                ? user.get('primaryGroupId')
                : null;

            db.registerDrink(messageId, primaryGroupId, userId, drinkType, drinkValue, user)
            .then(() => {
                db.getDrinksSinceTimestamp(
                    _getTresholdMoment(ALCOHOL_DAY_TRESHOLD_HOUR), { chatGroupId: primaryGroupId }
                ).then(function createReturnMessage(drinksCollection) {

                    var returnMessage = '';

                    // Drink had alcohol
                    if (drinkValue > 0) {

                        var alcoholDrinks = _.filter(drinksCollection.models, (model) =>
                            model.get('drinkValue') > 0
                        );
                        var drinksToday = alcoholDrinks.length;
                        var drinksTodayForThisUser = _.filter(alcoholDrinks, (model) =>
                            model.attributes.drinker_telegram_id === userId
                        ).length;

                        // # Form the message
                        returnMessage = 'Kippis!! ';

                        // was this todays first for the user?
                        if (drinksTodayForThisUser === 1) {
                            returnMessage += [
                                'Päivä käyntiin!\n\n',
                                '(Jos haluat merkata tarkemmin juomiasi, anna käsin',
                                'jokin näppäimistön emojeista ja kirjoita juoman nimi perään)\n\n'
                            ].join(' ');

                            // Does this user have an account?
                            if (_.isNull(user)) {
                                returnMessage += [
                                    '\n\n(Tee tunnus /luotunnus-komennolla, niin voin',
                                    'laskea Sinulle arvion promilletasostasi!)\n\n'
                                ].join(' ');
                            }
                        }

                        // Is there a group title?
                        if (_.isNull(primaryGroupId)) {
                            returnMessage += ' Se olikin jo ' + drinksTodayForThisUser +
                                '. tälle päivälle.\n';

                        } else {
                            returnMessage += ' Se olikin jo ryhmäsi ' + drinksToday +
                            '. tälle päivälle, ja Sinulle päivän ' + drinksTodayForThisUser + '.\n';

                            // # Notify the group?
                            if (drinksToday === 1) {
                                // -> first drink for today!
                                var groupMsg = userName + ' avasi pelin! ' + drinkType + '!';
                                botApi.sendMessage({ chat_id: primaryGroupId, text: groupMsg });
                            }
                            // Tell status report on 5, 10, 20, 30, ....
                            if (drinksToday % 10 === 0 || drinksToday === 5) {
                                controller.getGroupAlcoholStatusReport(primaryGroupId)
                                .then(statusReport => {
                                    var groupAnnouncement = [
                                        `${userName} kellotti ryhmän`,
                                        `${drinksToday}. juoman tälle päivälle!`,
                                        `\n\n${emoji.get(':top:')} Tilanne:\n`,
                                        statusReport
                                    ].join(' ');

                                    botApi.sendMessage({
                                        chat_id: primaryGroupId,
                                        text: groupAnnouncement
                                    });
                                });
                            }
                        }

                        // send the message
                        botApi.sendMessage({ chat_id: userId, text: returnMessage });

                        // trigger also status report (to discourage users from spamming group chat)
                        if (!_.isNull(primaryGroupId)) {
                            controller.getGroupAlcoholStatusReport(primaryGroupId)
                            .then((statusReport) => {
                                botApi.sendMessage({
                                    chat_id: userId,
                                    text: '\nRyhmäsi tilanne:\n' + statusReport });
                            });
                        }

                        resolve(returnMessage);

                    // Drink was coffee or tea
                    } else if (drinkType === 'coffee' || drinkType === 'tea') {
                        var drinkTypeMsg = (drinkType === 'coffee') ? 'kahvikupit' : 'teekupposet';
                        var msg = 'Tänään nauttimasi ' + drinkTypeMsg + ':\n';

                        db.getCount('drinks', {
                            drinker_telegram_id: userId,
                            drinkType
                        }, _getTresholdMoment(6))
                        .then((count) => {
                            _.times(count, () => {
                                msg += emoji.get(':' + drinkType + ':');
                            });
                            msg += '\n\n';
                            if (!_.isNull(primaryGroupId)) {
                                controller.getGroupHotBeveragelStatusReport(primaryGroupId)
                                .then((statusReport) => {
                                    msg += statusReport;
                                    botApi.sendMessage({ chat_id: userId, text: msg });
                                    resolve(msg);
                                });
                            } else {
                                msg += 'Huom: Käy /moro ´ttamassa ryhmässä nähdäksesi';
                                msg += ' koko ryhmäsi nauttimat kupposet!';

                                botApi.sendMessage({ chat_id: userId, text: msg });
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
        .catch(e => {
            logger.error(e);
            botApi.sendMessage({
                chat_id: userId,
                text: 'Kippistely epäonnistui, yritä myöhemmin uudelleen'
            });
            resolve();
        });
    });
};


controller.getPersonalDrinkLog = function(userId) {

    return db.getDrinksSinceTimestamp(moment().subtract(2, 'day'), { drinker_telegram_id: userId })
    .then(collection => {
        let message = 'Juomasi viimeisen 48h ajalta:\n';

        const groupedDrinkRows = _
            .chain(collection.models)
            .map(drink => {
                const timestamp = drink.get('timestamp');
                const rowTimestamp = moment(timestamp).format('HH:mm');

                const logRow = `${rowTimestamp} - ${drink.get('drinkType')}`;

                return { logRow, timestamp };
            })
            .groupBy(rowItem => moment(rowItem.timestamp).format('YYYY-MM-DD'))
            .value();

        const orderedGroupKeys = _.keys(groupedDrinkRows).sort();
        _.each(orderedGroupKeys, (datestamp) => {
            let logItems = groupedDrinkRows[datestamp];

            // add header row for this day
            message += '\n\n' + emoji.get(':calendar:');
            message += moment(datestamp, 'YYYY-MM-DD').format('DD.MM') + '\n';

            // add actual content of this day
            _.each(logItems, item => {
                message += item.logRow + '\n';
            });
        });

        message += '\n______________\n';
        message += 'Yhteensä ' + collection.models.length + ' kpl';

        botApi.sendMessage({ chat_id: userId, text: message });
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
                if (item.drinker.userName) {
                    return item.drinker.userName;
                } else {
                    return item.drinker.firstName;
                }
            });
            return result;
        }, {})
        .value());
};


controller.drawGraph = function(userId, chatGroupId, msgIsFromGroup, userCommandParams) {
    return new Promise(resolve => {

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

        botApi.sendAction({ chat_id: targetId, action: 'upload_photo' });

        db.getOldest('drinks', whereObject)
        .then(result => {
            var startRangeMoment = moment(result[0].min);
            var dateRangeParameter = parseInt(userCommandParams.split(' ')[0], 10);

            if (!_.isNaN(dateRangeParameter) && dateRangeParameter > 0
                && dateRangeParameter < moment().diff(startRangeMoment, 'days')) {

                startRangeMoment = moment().subtract(dateRangeParameter, 'days');
            }

            db.getDrinksSinceTimestamp(startRangeMoment, whereObject)
            .then(function createHistogramFromData(drinks) {
                var timestamps = [];
                _.each(drinks.models, model => {
                    timestamps.push(moment(model.get('timestamp')));
                });

                graphController.makeHistogram(timestamps, startRangeMoment)
                .then(function histogramCreatedHandler(plotly) {
                    var destinationFilePath = cfg.plotlyDirectory + 'latestGraph.png';
                    utils.downloadFile(plotly.url + '.png', destinationFilePath)
                    .then(() => {
                        botApi.sendPhoto({ chat_id: targetId, file: destinationFilePath });
                        resolve();
                    });
                });
            });
        });
    });
};


controller.getDrinksAmount = function(
    userId, chatGroupId, chatGroupTitle, targetIsGroup, getAlcohol
) {
    return new Promise(resolve => {

        var drinkType = (getAlcohol) ? 'alkoholillista juomaa' : 'alkoholitonta juomaa';
        if (targetIsGroup) {

            var dbFetches = [];

            // all-time drinks for group
            dbFetches.push(db.getCount('drinks', { chatGroupId }, null, getAlcohol));
            dbFetches.push(db.getCount(
                'drinks',
                { chatGroupId },
                moment().subtract(1, 'days').toJSON(),
                getAlcohol
            ));
            dbFetches.push(db.getCount(
                'drinks',
                { chatGroupId },
                moment().subtract(2, 'days').toJSON(),
                getAlcohol
            ));

            Promise.all(dbFetches).then(function fetchOk(counts) {
                var output = chatGroupTitle + ' on tuhonnut yhteensä ';
                output += counts[0] + ' ' + drinkType + ', joista ';
                output += counts[1] + ' viimeisen 24h aikana ja ';
                output += counts[2] + ' viimeisen 48h aikana.';

                botApi.sendMessage({ chat_id: chatGroupId, text: output });
                resolve();
            });
        }
        else {
            db.getCount('drinks', null, null, getAlcohol)
            .then(function fetchOk(drinkCount) {
                botApi.sendMessage({
                    chat_id: userId,
                    text: 'Kaikenkaikkiaan juotu ' + drinkCount + ' ' + drinkType + '.'
                });
                resolve();
            });
        }
    });
};

controller.getGroupAlcoholStatusReport = function(chatGroupId) {
    return new Promise(resolve => {

        db.getDrinksSinceTimestamp(moment().subtract(2, 'days'), { chatGroupId })
        .then(function fetchOk(drinkCollection) {

            if (drinkCollection.models.length === 0) {
                resolve('Ei humaltuneita käyttäjiä.');
            }

            var alcoholDrinks = _.filter(drinkCollection.models, model =>
                model.get('drinkValue') > 0
            );

            var drinksByUser = _.groupBy(alcoholDrinks, model =>
                model.get('drinker_telegram_id')
            );

            // Create DB fetch for each of these users
            var userAccountPromises = [];
            _.each(drinksByUser, (drink, userId) => {
                userAccountPromises.push(db.getUserById(userId));
            });

            Promise.all(userAccountPromises)
            .then(users => {

                // Remove unregistered users
                users = _.compact(users);

                // Calculate alcohol level for each user
                var alcoLevelPromises = [];
                _.each(users, user => {
                    alcoLevelPromises.push(
                        ethanolController.getAlcoholLevel(user.get('telegramId'))
                    );
                });
                Promise.all(alcoLevelPromises)
                .then(alcoLevelArr => {

                    var drinkersArray = [];
                    for (var i = 0; i < alcoLevelArr.length; ++i) {
                        var userCallName = users[i].get('userName')
                            ? users[i].get('userName') : users[i].get('firstName');
                        var userIdAsStr = '' + users[i].get('telegramId');

                        // count drinks from the last 24h
                        var drinkCount24h = 0;
                        var minMoment = moment().subtract(1, 'day');

                        _.each(drinksByUser[userIdAsStr], drinkModel => {
                            // TODO convert this function to use _.reduce
                            if (minMoment.isBefore(moment(drinkModel.get('timestamp')))) {
                                drinkCount24h++;
                            }
                        });

                        drinkersArray.push({
                            userName: userCallName,
                            alcoLevel: alcoLevelArr[i],
                            drinkCount48h: drinksByUser[userIdAsStr].length,
                            drinkCount24h
                        });
                    }

                    // Filter users who have alcoLevel > 0
                    drinkersArray = _.filter(drinkersArray, object =>
                        object.alcoLevel > 0.00
                    );

                    if (drinkersArray.length === 0) {
                        resolve('Ei humaltuneita käyttäjiä.');
                    }

                    // Sort list by alcoLevel
                    drinkersArray = _.sortBy(drinkersArray, object =>
                        parseFloat(object.alcoLevel)
                    );

                    // Calculate needed padding
                    var paddingLength = _.max(drinkersArray, object =>
                        object.userName.length
                    );
                    paddingLength = paddingLength.userName.length + 3;

                    // Generate string which goes to message
                    var log = `${emoji.get('mens')} –––– ${emoji.get('chart_with_upwards_trend')}
                        –––– (24h/48h)\n`;

                    _.eachRight(drinkersArray, userLog => {
                        log += _.padEnd(userLog.userName, paddingLength, '.') + ' '
                        + userLog.alcoLevel + ' \u2030';
                        log += ' (' + userLog.drinkCount24h + ' / ' + userLog.drinkCount48h + ')\n';
                    });
                    resolve(log);
                })
                .catch(err => {
                    logger.log('error', 'ERROR on status report function %s', err);
                    resolve(err);
                });
            });
        });
    });
};

controller.getGroupHotBeveragelStatusReport = function(chatGroupId) {
    // TODO: this function does not utilize the chatGroupId parameter at all!
    return new Promise(resolve => {
        var log = 'Ryhmäsi hörppimät kuumat kupposet:' +
        '\n- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -\n';
        db.getDrinksSinceTimestamp(_getTresholdMoment(6), { drinkValue: 0 })
        .then(collection => {

            // Filter coffees and teas
            var beveragesByUser = _.filter(collection.models, model =>
                model.get('drinkType') === 'coffee' || model.get('drinkType') === 'tea'
            );

            beveragesByUser = _.groupBy(collection.models, model =>
                model.get('drinker_telegram_id')
            );

            var userAccountPromises = [];
            _.each(beveragesByUser, (coffee, userId) => {
                userAccountPromises.push(db.getUserById(userId));
            });

            Promise.all(userAccountPromises).then(users => {
                users = _.compact(users);
                _.each(users, user => {
                    log += user.get('userName') + ': ';
                    _.each(beveragesByUser[user.get('telegramId')], beverage => {
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
    return db.getUserById(userId)
    .then(model => {
        var primaryGroupId = (_.isNull(model)) ? null : model.get('primaryGroupId');
        if (!_.isNull(primaryGroupId)) {
            controller.getGroupHotBeveragelStatusReport(primaryGroupId)
            .then(msg => {
                botApi.sendMessage(userId, msg);
            });
        } else {
            botApi.sendMessage({
                chat_id: userId,
                text: 'Käy /moro´ttamassa ryhmässä saadaksesi kahvitilastot näkyviin!'
            });
        }
    });
};

controller.addCustomValueDrink = function(event, drinkType) {
    var params = event.userCommandParams.split(' ');
    if (params.length < 2) {
        botApi.sendMessage({
            chat_id: event.userId,
            text: `/ ${drinkType}  <senttilitrat> <alkoholi%>`
        });
        return Promise.resolve();
    }

    var centLiter = + params[0];
    var procent = + (params[1].replace(',', '.'));

    if (centLiter > 0 && centLiter <= 50 && procent >= 1.0 && procent <= 90.0) {
        // centiliters * 10 * procent / 100 * density of ethanol -> grams of ethanol
        return controller.addDrink(
            event.eventId, event.userId, event.userCallName,
            drinkType,
            Math.round(centLiter * procent * 0.0789),
            event.isFromGroup
        );
    } else {
        var text = [
            `Anna ${drinkType}n määrä senttilitroina`,
            '(1-50) ja alkoholipitoisuus prosentteina (1-90)!'
        ].join(' ');

        botApi.sendMessage({
            chat_id: event.userId,
            text
        });
        return Promise.resolve();
    }
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

