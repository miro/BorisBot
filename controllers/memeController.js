var _       = require('lodash');
var Promise = require('bluebird');
var request = require('request');

var cfg     = require('../config');
var utils   = require('../utils');


var controller = {};

controller.getMemes = function() {
    request('https://api.imgflip.com/get_memes', function(error,res,body) {
        var response = JSON.parse(body);
        if (response['success']) {
            controller.supportedMemes = response['data']['memes'];
        } else {
            console.log('Error when using meme API');
        }
    });
};

module.exports = controller;