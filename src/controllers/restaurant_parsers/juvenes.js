var request     = require('request');
var moment      = require('moment-timezone');
var Promise     = require('bluebird');

var juvenes  = require('../../../resources/restaurants').juvenes;
var cfg         = require('../../config');
var logger      = cfg.logger;

moment.tz.setDefault(cfg.botTimezone);

var _fetchKitchenMenus = function(kitchen) {
    return new Promise(function(resolve,reject) {
        // juvenes' API doesn't offer 100% valid json
        // so we download the json as a string,
        // play with it little and
        // then parse it as json

        var date = moment().format('YYYY-MM-DD');

        var opt = {
            url: juvenes.url +
                "?KitchenId=" + kitchen.id +
                "&MenuTypeId=" + kitchen.menu + 
                "&date='" + date +
                "'&format=json&lang='fi'"
        }

        request(opt, function (error, resp, html) {
            if (!error) {

                // make valid json
                var json = JSON.parse(html.slice(7, -4).replace(/\\"/g, '"'));

                // search the titles of meals
                var meals = [];
                for (var i in json.MealOptions) {
                    var meal = json.MealOptions[i].MenuItems[0].Name;
                    meals.push(meal.trim());
                }
                
                resolve(meals);
                
            } else {
                reject(error);
            }
        });
    });
};

var parser = {
    newton: _fetchKitchenMenus({id: 6, menu: 60}),
    sååsbar: _fetchKitchenMenus({id: 6, menu: 77}),
    fusion: _fetchKitchenMenus({id: 60038,menu: 3}),
    konehuone: _fetchKitchenMenus({id: 60038, menu: 74})
};

// check http://www.juvenes.fi/DesktopModules/Talents.LunchMenu/LunchMenuServices.asmx
// for API documentation ( ~ kitchen and menu IDs)

module.exports = parser;
