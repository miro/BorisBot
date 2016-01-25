
var restaurant = require('../resources/restaurants').juvenes;
var request    = require('request');
var moment     = require('moment-timezone');

moment.tz.setDefault(cfg.botTimezone);

var parser = function (kitchen, callback) {

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
            callback(null, meals);
        } else {
            callback(error, null);
        }
    })
}

// check http://www.juvenes.fi/DesktopModules/Talents.LunchMenu/LunchMenuServices.asmx
// for API documentation ( ~ kitchen and menu IDs)

module.exports = {

    Newton: function (callback) {
        parser({id: 6, menu: 60}, callback);
    },

    Sååsbar: function (callback) {
        parser({id: 6, menu: 77}, callback);
    },

    Fusion: function (callback) {
        parser({id: 60038, menu: 3}, callback);
    },

    Konehuone: function (callback) {
        parser({id: 60038, menu: 74}, callback);
    }
}
