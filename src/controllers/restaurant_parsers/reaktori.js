
var restaurant = require('../resources/restaurants').reaktori;
var request    = require('request');
var moment     = require('moment-timezone');

moment.tz.setDefault(cfg.botTimezone);

// little function to make output prettier
var cleaner = function (meal) {

    // some restaurants include (M,G) -stuff in
    // the names of meals, this removes them
    var split = meal.split('(');

    // also some names of meals had useless whitespace
    var output = split[0].trim();
    return output;

}

module.exports = function (callback) {

    var date = moment().format('YYYY-MM-DD');
    var time = moment().format('HHmm');
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

            // reaktori only offers json of whole week's menus
            // so we need 2 loops: first find right date
            // then find right meals (= parsemeals function)
            var parsemeals = function (menu) {

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
                if (time >= 1600) categories = ['Iltaruoka'];
                for (var i in menu) {

                    // skip the unwanted categories
                    if (categories.indexOf(menu[i].Name) < 0) continue
                    var meal = menu[i].Components[0]
                    meals.push(cleaner(meal))
                };
            };

            // looping json to find right date
            for (var i in json.MenusForDays) {
                var menudate = json.MenusForDays[i].Date
                var menus = json.MenusForDays[i].SetMenus
                if (menudate.substring(0, 10) == date) {
                    parsemeals(menus)
                    break
                }
            };
            callback(null, meals);
        } else {
            callback(error, null);
        }
    })
}