var _       = require('lodash');
var moment  = require('moment-timezone');
var Promise = require('bluebird');

var botApi  = require('../botApi');
var db      = require('../database');


var controller = {};


// ### Public functions
//

controller.display = function(userId, groupId) {
    return new Promise( function(resolve,reject) {
        var targetId = _.isNull(groupId) ? userId : groupId;

        controller.calculateDrunkLevel(userId, 1)
        .then(function calculateOk(alchLevel) {
            botApi.sendMessage(targetId, 'Promillesi: ' + alchLevel);
            resolve();
        })
        .catch(function(err) {
            // TODO: use Error-objects in here? https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
            if (err === 'userError') {
                botApi.sendMessage(userId, 'Käyttäjäsi täytyy olla rekisteröity laskeaksesi promillet!\nVoit tehdä tämän komennolla /addme');
                resolve();
            }
            else if (err === 'rangeError') {
                controller.calculateDrunkLevel(userId, 5)
                .then(function secondCalculateOk(alchLevel) {
                    botApi.sendMessage(targetId, 'Promillesi: ' + alchLevel);
                    resolve();
                });
            }
        });
    });
};

controller.calculateDrunkLevel = function(userId, startDaysBefore) {
    return new Promise( function(resolve,reject) {
        db.getUserById(userId)
        .then( function UserFetchOk(user) {

            var weight = user.get('weight');
            var isMale = user.get('isMale');
            var startMoment = moment().subtract(startDaysBefore,'days');

            db.getDrinksSinceTimestampSortedForUser(userId, startMoment)
            .then(function drinkFetchOk(collection) {

                var alchLevel = 0.00;
                var drinkEthGrams = 0;
                var differenceInHours = 0;

                _.each(collection, function(model) {
                    differenceInHours = moment(model['timestamp']).diff(startMoment,'hours', true);
                    alchLevel = _drunklevel(drinkEthGrams, differenceInHours, weight, isMale);

                    // If user was sober before this drink, reset startMoment to this drinks timestamp
                    if (alchLevel == 0.00) {
                        startMoment = moment(model['timestamp']);
                        drinkEthGrams = 0;
                    }
                    drinkEthGrams += model['drinkValue'];
                });

                // Calculate effect of the last drink to current time
                differenceInHours = moment().diff(startMoment,'hours', true);
                alchLevel = _drunklevel(drinkEthGrams, differenceInHours, weight, isMale);

                // If this is true, user have taken his first drink in the first 30% of the range
                // and there is no other calculated "soberpoints", so this function needs to be called
                // again with wider range
                var rangeAsHours = moment(moment()).diff(moment().subtract(startDaysBefore,'days'), 'hours', true);
                if (differenceInHours > rangeAsHours * 0.7 && differenceInHours < rangeAsHours) {
                    reject('rangeError');
                }
                else {
                    resolve(alchLevel);
                }
            });
        })
        .catch( function noUserFound() {
            reject('userError');
        });
    });
};



// ### Helper functions
//

// Source: http://www.mvnet.fi/blogi/index.php?title=alkoholin_palaminen_ja_alkoholilaskuri&more=1&c=1&tb=1&pb=1
var _burnRate = function(weight) {
    var liverBurnRate = 0.1; // 1 gram of ethanol per 10 kg bodymass in one hour
    var otherOrgansBurnRate = (liverBurnRate / 0.94) * 0.06 // 94% from liver, 6% from other organs
    return (liverBurnRate + otherOrgansBurnRate) * weight // grams per hour
};

var _perMil = function(ethGrams, weight, isMale) {
    var waterConsentration = isMale ? 0.75 : 0.66; // use gender-specific water/bodymass -ratio

    return (ethGrams < 0) ? 0 : (ethGrams / (waterConsentration * weight));
};

var _drunklevel = function(ethGrams, hours, weight, male) {
    var burnedEthGrams = _burnRate(weight) * hours;
    return _perMil(ethGrams-burnedEthGrams, weight, male).toFixed(2);
};

module.exports = controller;

