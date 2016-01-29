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
        
        // Use shorter presentation if event is from group
        var style = (!isFromGroup) ? _splitMealsToRows : 
                                    function(x) {return x.join(', ');}
        
        var s = new String();     
        _.forEach(validDiners, function(diner, name) {
            s += '[' + diner.name + '](' + diner.homepage + ') '
            s += '`[' + diner.open.from + '-' + diner.open.to + ']`: '; 
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
        _clearMenus();
        Promise.props({
            reaktori: parserReaktori(),
            newton: parserJuvenes.newton(),
            hertsi: parserHertsi(),
            sååsbar: parserJuvenes.sååsbar(),
            fusion: parserJuvenes.fusion(),
            konehuone: parserJuvenes.konehuone()
        }).then(function(result) {
            _.forEach(result, function(menu, name) {
                diners[name].menu = menu;
            });
            resolve();
        }).catch(function(e) {
            reject(e);
        });
    });
};

var _clearMenus = function() {
    _.forEach(diners, function(diner) {
        diner.menu = [];
    });
    return;
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
    var openTo = moment(diner.open.to, 'HH:mm');
    
    if (_.isUndefined(diner.open.pause)) {
        return now.isBefore(openTo);
    } else {
        if (now.isAfter(moment(diner.open.pause.from, 'HH:mm'))
            && now.isBefore(moment(diner.open.pause.to, 'HH:mm'))) {
                return false; // Diner is on pause right now
        } else {
            return now.isBefore(openTo);
        }
    }
};

// Update menus when controller is initialized
controller.updateMenus()
.catch(function(e) {
    logger.log('error', 'restaurantController: error when fetching menus first time - %s', e);
});

module.exports = controller;