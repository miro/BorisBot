var Promise = require('bluebird');
var _       = require('lodash');

var juvenes     = require('./restaurant_parsers/juvenes');
var hertsi      = require('./restaurant_parsers/hertsi');
var reaktori    = require('./restaurant_parsers/reaktori');

controller = {};

controller.getAllMenusForToday = function () {
    return new Promise(function(resolve,reject)  {
        
        var restaurantPromises = []
        restaurantPromises.push(reaktori.getMeals());
        restaurantPromises.push(juvenes.getMeals('newton'));
        restaurantPromises.push(hertsi.getMeals());
        
        Promise.all(restaurantPromises).then(function(meals) {
            var s = '*Reaktori:* ' + meals[0].join(', ') + '\n\n'
                + '*Juvenes:* ' + meals[1].join(', ') + '\n\n'
                + '*Hertsi:* ' + meals[2].join(', ');
            return resolve(s);
        });
    });
};

module.exports = controller;