var request     = require('request');
var moment      = require('moment-timezone');
var _           = require('lodash');
var Promise     = require('bluebird');

var reaktori    = require('../restaurantsConfig').reaktori;
var cfg         = require('../../../config');
var logger      = require('../../../logger');

moment.tz.setDefault(cfg.botTimezone);

module.exports = function fetchKitchenMenus() {
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
                try {
                    // looping json to find right date
                    _.forEach(json.MenusForDays, function(MenusForDays) {
                        var menudate = MenusForDays.Date;
                        var menus = MenusForDays.SetMenus;
                        if (menudate.substring(0, 10) == date) {
                            meals = _parseMenu(menus);
                            return;
                        }
                    });
                    resolve(meals);
                }
                catch (error) {
                    logger.log('error', 'Error when parsing reaktori: %s', error);
                    resolve();
                }
            } else {
                logger.log('error', 'Error when requesting Reaktori JSON: %s', error);
                resolve();
            }
        });
    });
}

var _parseMenu = function(menu) {

    // we don't want to include all the meals
    var categories = [
        'Linjasto',
        'Kasvislounas',
        'Keittolounas'
        /*'Leipäateria',
        'Salaattilounas',
        'Special',
        'Iltaruoka',
        'Jälkiruoka',
        'A´la carte',*/
    ];
    // offer only 'iltaruoka' if time is over 16 and its not saturday
    if (moment().isAfter(moment(1500, 'HHmm')) && moment().weekday() !== 6) {
        categories = ['Iltaruoka'];
    }

    var meals = [];
    _.forEach(menu, function(category) {
        // Skip the unwanted categories
        if (!(_.indexOf(categories, category.Name) < 0) && !_.isEmpty(category.Components)) {
            meals.push((category.Components[0]).split('(')[0].trim());
        }
    });
    return meals;
};
