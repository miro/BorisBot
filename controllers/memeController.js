var _       = require('lodash');
var Promise = require('bluebird');

var cfg     = require('../config');
var utils   = require('../utils');

var controller = {};

controller.supportedMemes = [
    'One-Does-Not-Simply',
    'Ancient-Aliens',
    'Futurama-Fry'
];

controller.downloadTemplates = function() {
    var downloadPromises = [];
    
    _.each(controller.supportedMemes, function(template) {
        downloadPromises.push(utils.downloadFile('https://imgflip.com/s/meme/' + template + '.jpg', cfg.memeDirectory + template + '.jpg'));
    });
    Promise.all(downloadPromises)
    .then(function() {
        console.log('Downloaded supported memes');
    }).catch(function(err) {
        console.log('Error while downloading memes');
    });
};

module.exports = controller;