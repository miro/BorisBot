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

var diners = {
    reaktori: {
        parser: parserReaktori(),
        info: resources.reaktori
    },
    newton: {
        parser: parserJuvenes.newton,
        info: resources.juvenes.newton
    },
    hertsi: {
        parser: parserHertsi(),
        info: resources.hertsi
    },
    sååsbar: {
        parser: parserJuvenes.sååsbar,
        info: resources.juvenes.sååsbar
    },
    fusion: {
        parser: parserJuvenes.fusion,
        info: resources.juvenes.fusion
    },
    konehuone: {
        parser: parserJuvenes.konehuone,
        info: resources.juvenes.konehuone
    }
};

controller.getAllMenusForToday = function (isFromGroup) {
    return new Promise(function(resolve,reject)  {
        
        Promise.props(diners).then(function(fetchedDiners) {
            
            // Remove diners which aren't open
            _.remove(fetchedDiners, function(diner) {
                return _isDinerOpen(diner);
            });
            
            var s = '';
            if (isFromGroup) {
                _.forEach(fetchedDiners, function(diner) {
                    s = s + _markdownLink(diner.info) + diner.parser._settledValue.join(', ') + '\n';
                });
            } else {
                _.forEach(fetchedDiners, function(diner) {
                    s = s + _markdownLink(diner.info) + _splitMealsToRows(diner.parser._settledValue) + '\n';
                });
            }
            return resolve(s);
        })
        .error(function(e) {
            logger.log('error', 'restaurantController: %s', e);
        });
    });
};

var _isDinerOpen = function(diner) {
    var now = moment();
    var openTo = moment(diner.info.open.to, 'HHmm');
    
    if (_.isUndefined(diner.info.open.pause)) {
        return now.isBefore(openTo);
    } else {
        if (now.isAfter(moment(diner.info.open.pause.from, 'HHmm'))
            && now.isBefore(moment(diner.info.open.pause.to, 'HHmm'))) {
                return false; // Diner is on pause right now
        } else {
            return now.isBefore(openTo);
        }
    }
};

var _markdownLink = function(restaurant) {
    return '[' + restaurant.name + '](' + restaurant.homepage + '): ';
};

var _splitMealsToRows = function(meals) {
    var s = '';
    _.forEach(meals, function(meal) {
        s = s + '\n  \u2022 ' + meal;
    });
    return s;
};


module.exports = controller;