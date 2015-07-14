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

// set default timezone to bot timezone
moment.tz.setDefault(cfg.botTimezone);


var controller = {};


controller.addDrink = function(messageId, chatGroupId, chatGroupTitle, userId, userName, drinkType) {
    var responseTargetId = chatGroupId ? chatGroupId : userId;

    drinkType = drinkType.substring(0,140); // shorthen this to match the DB field
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

                botApi.sendMessage(responseTargetId, returnMessage);

                resolve(returnMessage);
            });
        })
        .error(function(e) {
            botApi.sendMessage(responseTargetId, 'Kippistely epäonnistui, yritä myöhemmin uudelleen');
            resolve();
        });
    });
};


controller.getPersonalDrinkLog = function(userId) {
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

        dbFetchTimestampFunction(targetId)
        .then(function(result) {
            var startRangeMoment = moment(result[0]['min']);
            var dateRangeParameter = parseInt(userCommandParams.split(' ')[0], 10);

            if (!_.isNaN(dateRangeParameter) && dateRangeParameter > 0) {
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
            
            if (collection.models.length === 0) {resolve('Ei humaltuneita käyttäjiä.');}
            
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
                    for (var i=0;i<alcoLevelArr.length;++i) {
                        logArr.push({'userName': userArr[i].get('userName'), 'alcoLevel': alcoLevelArr[i]});
                    }
                    
                    // Filter users who have alcoLevel > 0
                    logArr = _.filter(logArr, function(object) {
                        return object.alcoLevel > 0.00;
                    });
                    
                    if (logArr.length === 0) {resolve('Ei humaltuneita käyttäjiä.');}
                    
                    // Sort list by alcoLevel
                    logArr = _.sortBy(logArr, function(object) {
                        return object.alcoLevel;
                    });
                    
                    // Calculate needed padding
                    var paddingLength = _.max(logArr, function(object) {
                        return object.userName.length;
                    });
                    paddingLength = paddingLength.userName.length + 3;
                    
                    // Generate string which goes to message
                    var log = "";
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

