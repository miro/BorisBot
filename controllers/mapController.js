var GoogleMapsAPI  = require('googlemaps');
var Promise             = require('bluebird');
var moment            = require('moment-timezone');
var _               = require('lodash');

var cfg           = require('../config');
var utils         = require('../utils');
var botApi        = require('../botApi');
var db            = require('../database');

var controller = {};

controller.publicConfig = {
  key: cfg.googleMapsApi,
};

controller.api = new GoogleMapsAPI(controller.publicConfig);

controller.defaultOptions = {
    size: '500x400',
    maptype: 'roadmap',
    style: [{
        feature: 'terrain',
        element: 'all',
        rules: {
        hue: '0x00ff00'
        }
    }],
    markers: [],
    path: []
};

controller.testparams = {
    markers: [
        {
            location: '61.483981, 23.801683'
        },
        {
            location: '61.497185, 23.735372'
        }
    ],
    path: [
        {
             color: '0x0000ff',
             weight: '5',
             points: [
                '61.483981, 23.801683',
                '61.497185, 23.735372'
             ]
        }
    ]
};

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

controller.getLocationsForUser = function(userId, hoursSince) {
    return new Promise(function(resolve,reject) {
        db.getLocationsSinceTimestampById(userId, moment().subtract(hoursSince, 'hours'))
        .then(function(collection) {
            if (collection.length === 0) {
                botApi.sendMessage(userId, 'Ei merkittyjä paikkoja!');
                resolve();
            } else {
                var mapOptions = controller.defaultOptions;
                _.each(collection.models, function(model) {
                    var location = model.get('latitude') + ', ' + model.get('longitude');
                    mapOptions.markers.push({location: location});
                });
                utils.downloadFile(controller.api.staticMap(mapOptions), cfg.googlemapsDirectory + 'userLocations.png', function() {
                    botApi.sendPhoto(userId, cfg.googlemapsDirectory + 'userLocations.png');
                    resolve();
                });
            }
        });
    });
};

controller.test = function() {
    utils.downloadFile(controller.api.staticMap(_.merge(controller.defaultOptions, controller.testparams)), cfg.googlemapsDirectory + 'map.png', function() {
        botApi.sendPhoto(100100780, cfg.googlemapsDirectory + 'map.png');
    });
};

module.exports = controller;