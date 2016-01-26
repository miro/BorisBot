var juvenes  = require('./restaurant_parsers/juvenes');
var hertsi   = require('./restaurant_parsers/hertsi');
var reaktori = require('./restaurant_parsers/reaktori');

var Promise = require('bluebird');
var _       = require('lodash');

controller = {};

controller.getString = function () {
    return new Promise(function(resolve,reject)  {
        reaktori.getMeals()
        .then(function(meals) {
            var s = '*Reaktori:* ' + meals.join(', ');
            return resolve(s);
        });
    });
};

module.exports = controller;