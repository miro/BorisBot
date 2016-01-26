var restaurant  = require('../../../resources/restaurants').reaktori;
var cfg         = require('../../config');
var logger      = cfg.logger;

var request     = require('request');
var moment      = require('moment-timezone');
var _           = require('lodash');
var Promise     = require('bluebird');

moment.tz.setDefault(cfg.botTimezone);

var parser = {};

parser.meals = [];

parser.getMeals = function () {
    return new Promise(function(resolve,reject) {
        if (_.isEmpty(parser.meals)) {
            _parseMeals()
            .then(function(){
                return resolve(parser.meals);
            })
            .error(function(error) {
                logger.log('error', 'Error when requesting Reaktori JSON: %s', error);
                return resolve(['Virhe haettaessa Reaktorin ruokalistaa!']);
            });
        } else {
            return resolve(parser.meals);
        }
    });
}

var _parseMeals = function() {
    return new Promise(function(resolve,reject) {
        var date = moment().format('YYYY-MM-DD');
        var opt = {
            url: restaurant.url +
                '?costNumber=0812&firstDay=' +
                date + '&language=fi',
            json: true
        };
        // request the json
        request(opt, function (error, resp, json) {
            if (!error) {
                var meals = [];          
                // looping json to find right date
                for (var i in json.MenusForDays) {
                    var menudate = json.MenusForDays[i].Date;
                    var menus = json.MenusForDays[i].SetMenus;
                    if (menudate.substring(0, 10) == date) {
                        meals = _parseMenu(menus);
                        break;
                    }
                };
                
                parser.meals = meals;
                return resolve();
            } else {
                return reject(error);
            }
        });
    });
}

var _parseMenu = function (menu) {
    
    // we don't want to include all the meals
    var categories = [
        'Linjasto',
        'Kasvislounas',
        'Keittolounas',
        /*'Leipäateria',
        'Salaattilounas',
        'Special',
        'Iltaruoka',
        'Jälkiruoka',
        'A´la carte',*/
    ];   
    // offer only 'iltaruoka' if time is over 16
    if (moment().format('HHmm') >= 1600) categories = ['Iltaruoka'];
    
    var meals = [];
    for (var i in menu) {
        if (categories.indexOf(menu[i].Name) < 0) continue; // skip the unwanted categories
        var meal = menu[i].Components[0];
        meals.push(_cleaner(meal));
    };
    return meals;
};

// little function to make output prettier
var _cleaner = function (meal) {

    // some restaurants include (M,G) -stuff in
    // the names of meals, this removes them
    var split = meal.split('(');

    // also some names of meals had useless whitespace
    var output = split[0].trim();
    return output;
};

module.exports = parser;