var restaurant  = require('../../../resources/restaurants').juvenes;
var cfg         = require('../../config');
var logger      = cfg.logger;

var request     = require('request');
var moment      = require('moment-timezone');
var Promise     = require('bluebird');

moment.tz.setDefault(cfg.botTimezone);

var parser = {
    newton: {
        id: {
            id: 6,
            menu: 60
        }
    },
    sååsbar: {
        id: {
            id: 6,
            menu: 77
        }
    },
    fusion: {
        id: {
            id: 60038,
            menu: 3
        }
    },
    konehuone: {
        id: {
            id: 60038,
            menu: 74
        }
    }
};

parser.getMeals = function() {
    return new Promise(function(resolve,reject) {
        _parser(parser.newton.id)
        .then(function(meals) {
            return resolve(meals);
        })
        .error(function(e) {
            logger.log('error', 'Error when requesting Juvenes JSON: %s', error);
            return resolve(['Virhe haettaessa Juveneksen ruokalistaa!']);
        });
    });
};

var _parser = function(kitchen) {
    return new Promise(function(resolve,reject) {
        // juvenes' API doesn't offer 100% valid json
        // so we download the json as a string,
        // play with it little and
        // then parse it as json

        var date = moment().format('YYYY-MM-DD');

        var opt = {
            url: restaurant.url +
                "?KitchenId=" + kitchen.id +
                "&MenuTypeId=" + kitchen.menu + 
                "&date='" + date +
                "'&format=json&lang='fi'"
        }

        request(opt, function (error, resp, html) {
            if (!error) {
                var meals = [];

                // make valid json
                html = html.slice(7, -4);
                html = html.replace(/\\"/g, '"');
                var json = JSON.parse(html);

                // search the titles of meals
                for (var i in json.MealOptions) {
                    var meal = json.MealOptions[i].MenuItems[0].Name;
                    meals.push(meal.trim());
                }
                return resolve(meals);
            } else {
                return reject(error);
            }
        });
    });
};

// check http://www.juvenes.fi/DesktopModules/Talents.LunchMenu/LunchMenuServices.asmx
// for API documentation ( ~ kitchen and menu IDs)

module.exports = parser;
