var _       = require('lodash');
var moment  = require('moment-timezone');
var Promise = require('bluebird');

var botApi  = require('../botApi');
var db      = require('../database');

var controller = {};

controller.display = function(userId, groupId) {
    return new Promise( function(resolve,reject) {
        controller.calculateDrunkLevel(userId)
        .then( function calculateOk(alchLevel) {
            var messageString = 'Promillesi: ' + alchLevel;
            if (_.isNull(groupId)) {
                botApi.sendMessage(userId, messageString);
                resolve();
            } else {
                botApi.sendMessage(groupId, messageString);
                resolve();
            }
        })
        .catch( function(errorMessage) {
            botApi.sendMessage(userId, errorMessage);
            resolve();
        });
    });
};

controller.calculateDrunkLevel = function(userId) {
    return new Promise( function(resolve,reject) {
        db.getUserById(userId)
        .then( function UserFetchOk(user) {
            var weight = user.get('weight');
            var isMale = user.get('isMale');
            var startMoment = moment().subtract(2,'days'); //Assuming that user have been once sober in two days
            
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
                return resolve(alchLevel);
            });
        })
        .catch( function noUserFound() {
            reject('Käyttäjäsi täytyy olla rekisteröity laskeaksesi promillet!');
        });
    });
};

// Helper functions 
//

// Source: http://www.mvnet.fi/blogi/index.php?title=alkoholin_palaminen_ja_alkoholilaskuri&more=1&c=1&tb=1&pb=1
var _burnRate = function(weight) {
    var liverBurnRate = 0.1; // 1 gram of ethanol per 10 kg bodymass in one hour
    var otherOrgansBurnRate = (liverBurnRate / 0.94) * 0.06 // 94% from liver, 6% from other organs   
    return (liverBurnRate + otherOrgansBurnRate) * weight // grams per hour
};

var _perMil = function(ethGrams, weight, male) {
    var waterConsentration = 0.75; // Mens water to bodymass ratio
    if (!male) { waterConsentration=0.66 }; // Womens water to bodymass ratio
    if (ethGrams < 0) { return 0 }
    else { return ethGrams / (waterConsentration*weight) };
};

var _drunklevel = function(ethGrams, hours, weight, male) {
    var burnedEthGrams = _burnRate(weight) * hours;
    return _perMil(ethGrams-burnedEthGrams, weight, male).toFixed(2);
};



module.exports = controller;