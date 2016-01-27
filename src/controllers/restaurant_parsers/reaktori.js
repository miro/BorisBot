var request     = require('request');
var moment      = require('moment-timezone');
var _           = require('lodash');
var Promise     = require('bluebird');

var reaktori    = require('../../../resources/restaurants').reaktori;
var cfg         = require('../../config');
var logger      = cfg.logger;

moment.tz.setDefault(cfg.botTimezone);

parser = function() {
    return new Promise(function(resolve,reject) {
        var date = moment().format('YYYY-MM-DD');
        var opt = {
            url: reaktori.url +
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
                return resolve(meals);
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
        meals.push((menu[i].Components[0]).split('(')[0].trim());
    };
    return meals;
};

module.exports = parser;