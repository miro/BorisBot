var request     = require('request');
var moment      = require('moment-timezone');
var Promise     = require('bluebird');
var _           = require('lodash');

var hertsi      = require('../../../resources/restaurants').hertsi;
var cfg         = require('../../config');
var logger      = cfg.logger;

moment.tz.setDefault(cfg.botTimezone);

module.exports = function() {
    return new Promise(function(resolve,reject) {
        // makes an array of hertsi's meals of current date
        var date = moment().format('YYYY/MM/DD');
        var opt = {
            url: hertsi.url + date + '/fi',
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

                    meals.push(menu.title_fi.trim());
                };
                resolve(meals);
            } else {
                reject(error);
            }
        });
    });
};