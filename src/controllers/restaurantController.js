var Promise = require('bluebird');
var _       = require('lodash');
var moment  = require('moment-timezone');

var parserJuvenes   = require('./restaurant_parsers/juvenes');
var parserHertsi    = require('./restaurant_parsers/hertsi');
var parserReaktori  = require('./restaurant_parsers/reaktori');
var resources       = require('../../resources/restaurants');
var cfg             = require('../config');
var logger          = cfg.logger;

controller = {};

var parsers = {
    reaktori: parserReaktori(),
    newton: parserJuvenes.newton,
    hertsi: parserHertsi(),
    sååsbar: parserJuvenes.sååsbar,
    fusion: parserJuvenes.fusion,
    konehuone: parserJuvenes.konehuone
}

var diners = {
    reaktori: resources.reaktori,
    newton: resources.juvenes.newton,
    hertsi: resources.hertsi,
    sååsbar: resources.juvenes.sååsbar,
    fusion: resources.juvenes.fusion,
    konehuone: resources.juvenes.konehuone
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
        
        // Choose right parsers
        var validParsers = {}
        _.forEach(validDiners, function(diner,name) {
            validParsers[name] = parsers[name];
        })
        
        // Use shorter presentation if event is from group
        var style = (!isFromGroup) ? _splitMealsToRows : 
                                    function(x) {return x.join(', ');}

        // Fetch new menus
        Promise.props(validParsers)
        .then(function(fetchedParsers) {    
            var s = new String();     
            _.forEach(validDiners, function(diner, name) {
                s += '[' + diner.name + '](' + diner.homepage + '): '; 
                s += style(fetchedParsers[name]) + '\n';
            });
            resolve(s);
        })
        .error(function(e) {
            logger.log('error', 'restaurantController: %s', e);
            reject();
        });
    });
};

var _splitMealsToRows = function(meals) {
    var s = new String();
    _.forEach(meals, function(meal) {
        s += '\n  \u2022 ' + meal;
    });
    return s;
};

var _isDinerOpen = function(diner) {
    var now = moment();
    var openTo = moment(diner.open.to, 'HHmm');
    
    if (_.isUndefined(diner.open.pause)) {
        return now.isBefore(openTo);
    } else {
        if (now.isAfter(moment(diner.open.pause.from, 'HHmm'))
            && now.isBefore(moment(diner.open.pause.to, 'HHmm'))) {
                return false; // Diner is on pause right now
        } else {
            return now.isBefore(openTo);
        }
    }
};

module.exports = controller;