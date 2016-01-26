var request     = require('request');
var moment      = require('moment-timezone');
var Promise     = require('bluebird');

var restaurant  = require('../../../resources/restaurants').hertsi;
var cfg         = require('../../config');
var logger      = cfg.logger;

moment.tz.setDefault(cfg.botTimezone);

var parser = {};

parser.getMeals = function() {
    return new Promise(function(resolve,reject) {
        _parser()
        .then(function(meals) {
            return resolve(meals);
        })
        .error(function(error) {
            logger.log('error', 'Error when requesting Hertsi JSON: %s', error);
            return resolve(['Virhe haettaessa Hertsin ruokalistaa!']);
        });
    });
};

var _parser = function() {
    return new Promise(function(resolve,reject) {
        // makes an array of hertsi's meals of current date
        var date = moment().format('YYYY/MM/DD');
        var opt = {
            url: restaurant.url + date + '/fi',
            json: true
        };

        // request the json
        request(opt, function (error, resp, json) {

            if (!error) {
                var meals = [];
                var categories = [
                    'Inspiring',
                    'Soup',
                    'Popular',
                    /*'Wok',
                    'Warm Salad',
                    'Vitality',*/
                    'Vegetarian'
                ];

                // search the titles of meals
                for (var i in json.courses) {
                    var menu = json.courses[i];
                    
                    // skip the unwanted categories
                    if (categories.indexOf(menu.category) < 0) continue;

                    var meal = menu.title_fi;
                    meals.push(meal.trim());
                };
                return resolve(meals);
            } else {
                return reject(error);
            }
        });
    });
};

module.exports = parser;
