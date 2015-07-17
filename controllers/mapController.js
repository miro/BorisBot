var GoogleMapsAPI = require('googlemaps');
var Promise       = require('bluebird');

var cfg           = require('../config');
var utils         = require('../utils');
var botApi        = require('../botApi');
var db            = require('../database');

var controller = {};

controller.publicConfig = {
  key: cfg.googleMapsApi,
};

controller.testparams = {
  center: 'Tampere',
  zoom: 13,
  size: '500x400',
  maptype: 'roadmap',
  style: [
    {
      feature: 'road',
      element: 'all',
      rules: {
        hue: '0x00ff00'
      }
    }
  ],
};

controller.api = new GoogleMapsAPI(controller.publicConfig);

// ## Public functions
//

controller.addLocation = function(userId, longitude, latitude) {
    return new Promise(function(resolve,reject) {
        db.registerLocation(userId, longitude, latitude)
        .then(function() {
            botApi.sendMessage(userId, 'Sijainti kirjattu!');
            resolve();
        });
    });
};

controller.test = function() {
    utils.downloadFile(controller.api.staticMap(controller.testparams), cfg.googlemapsDirectory + 'map.png', function() {
        botApi.sendPhoto(100100780, cfg.googlemapsDirectory + 'map.png');
    });
};

module.exports = controller;