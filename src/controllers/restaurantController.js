var Promise = require('bluebird');
var _       = require('lodash');
var moment  = require('moment-timezone');
var emoji   = require('node-emoji')

var parserJuvenes   = require('./restaurant_parsers/juvenes');
var parserHertsi    = require('./restaurant_parsers/hertsi');
var parserReaktori  = require('./restaurant_parsers/reaktori');
var resources       = require('../../resources/restaurants');
var cfg             = require('../config');
var logger          = cfg.logger;

controller = {};

var diners = {
    reaktori: {
        info: resources.reaktori,
        parser: parserReaktori
    },
    newton: {
        info: resources.juvenes.newton,
        parser: parserJuvenes.newton
    },
    hertsi: {
        info: resources.hertsi,
        parser: parserHertsi
    },
    sååsbar: {
        info: resources.juvenes.sååsbar,
        parser: parserJuvenes.sååsbar
    },
    fusion: {
        info: resources.juvenes.fusion,
        parser: parserJuvenes.fusion
    },
    konehuone: {
        info: resources.juvenes.konehuone,
        parser: parserJuvenes.konehuone
    }
};

controller.getAllMenusForToday = function (isFromGroup) {
    return new Promise(function(resolve,reject)  {
        
        // Process only three diners if message is from group
        var validDiners = (isFromGroup) ? {
            reaktori: diners.reaktori,
            newton: diners.newton,
            hertsi: diners.hertsi
        } : diners;

        // Remove diners which aren't open
        _.forEach(validDiners, function(diner, name) {
            if (!_isDinerOpen(diner)) {
                _.unset(validDiners, name);
            }
        });
        
        // Check if every diner is closed
        if (_.isEmpty(validDiners)) {
            resolve('Ei ravintoloita auki.');
            return;
        }
        
        // Use shorter presentation if event is from group
        var style = (!isFromGroup) ? _splitMealsToRows : 
                                    function(x) {return x.join(', ');}
                                    
        // On saturday display right opening hours
        if (moment().weekday() === 6) {
            _.forEach(validDiners, function(diner) {
                if (!_.isUndefined(diner.info.open.saturday)) {
                    diner.info.open = diner.info.open.saturday;
                }
            });
        }

        // Choose the right closing time if diner have pause
        _.forEach(validDiners, function(diner, name) {
            if (!_.isUndefined(diner.info.open.pause) && moment().isBefore(moment(diner.info.open.pause.from, 'HH:mm'))) {
                diner.info.open.to = diner.info.open.pause.from;
            }
        });

        var s = new String();
        _.forEach(validDiners, function(diner, name) {
            
            // Print diner info
            s += '[' + diner.info.name + '](' + diner.info.homepage + ')';
            s +=  _timeToClose(diner) + ': ';
            
            // Print menus if they exists
            if (!_.isEmpty(diner.menu)) {
                s += style(diner.menu) + '\n';
            } else {
                s += ' _ruokalistaa ei saatavilla_\n';
            }
        });
        resolve(s);
    });
};

controller.updateMenus = function () {
    return new Promise(function(resolve,reject) {
        
        // Delete old menus
        _.forEach(diners, function(diner) {
            diner.menu = [];
        });
        
        // Choose only relevant diners
        var validDiners = diners;
        var validParsers = [];
        _.forEach(diners, function(diner,name) {
            if (_isDinerOpenToday(diner)) {
                validParsers.push(diner.parser());
            } else {
                _.unset(validDiners, name);
            }
        });
        
        // Fetch new ones
        Promise.all(validParsers)
        .then(function(result) {
            var i = 0;
            _.forEach(validDiners, function(diner) {
                diner.menu = result[i];
                i++;
            });
            resolve();
        }).catch(function(e) {
            reject(e);
        });
    });
};

var _timeToClose = function(diner) {

    var timeleft = moment(diner.info.open.to, 'HH:mm').diff(moment(), 'minutes');
    if (timeleft >= 60 || timeleft < 0) { return '';}

    var s = ' ' + emoji.get(':exclamation:') + ' `[Auki vielä ' + timeleft + ' minuutti';
    if (timeleft !== 1) { s += 'a'; }
    s += ']`';
    return s;
}

var _splitMealsToRows = function(meals) {
    var s = new String();
    _.forEach(meals, function(meal) {
        s += '\n  \u2022 ' + meal;
    });
    return s;
};

var _isDinerOpen = function(diner) {
    
    if (!_isDinerOpenToday(diner)) {return false;}
    
    var now = moment();
    var openTo = moment(diner.info.open.to, 'HH:mm');
    
    // Check if diner is open at saturday
    if (!_.isUndefined(diner.info.open.saturday) && moment().weekday() === 5) {
        return now.isBefore(moment(diner.info.saturday.to, 'HH:mm'));
    }
    
    // Check if diner have a pause middle of the day
    if (_.isUndefined(diner.info.open.pause)) {
        return now.isBefore(openTo);
    } else {
        if (now.isAfter(moment(diner.info.open.pause.from, 'HH:mm'))
            && now.isBefore(moment(diner.info.open.pause.to, 'HH:mm'))) {
                return false; // Diner is on pause right now
        } else {
            return now.isBefore(openTo);
        }
    }
};

var _isDinerOpenToday = function(diner) {
    var now = moment();

    // No diners open at sunday
    if (now.weekday() === 7) {
        return false;
    } else if (now.weekday() === 6) {
        if (!_.isUndefined(diner.info.open.saturday)) {
            return true;
        } else {
            return false
        }
    } else {
        return true;
    }
}

// Update menus when controller is initialized
controller.updateMenus()
.catch(function(e) {
    logger.log('error', 'restaurantController: error when fetching menus first time - %s', e);
});

module.exports = controller;