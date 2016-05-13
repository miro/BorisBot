var request     = require('request');
var moment      = require('moment-timezone');
var Promise     = require('bluebird');
var _           = require('lodash');

var hertsi      = require('../restaurantsConfig').hertsi;
var cfg         = require('../../../config');
var logger      = require('../../../logger');

moment.tz.setDefault(cfg.botTimezone);

module.exports = function fetchKitchenMenus() {
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
                try {
                    // search the titles of meals
                    _.forEach(json.courses, function(menu) {

                        // skip the unwanted categories
                        if (categories.indexOf(menu.category) >= 0) {
                            meals.push(menu.title_fi.trim());
                        }
                    });
                    resolve(meals);
                }
                catch(err) {
                    logger.log('error', 'Error when parsing Hertsi: %s', err);
                }
            } else {
                logger.log('error', 'Error when requesting Hertsi JSON: %s', error);
                resolve();
            }
        });
    });
};
