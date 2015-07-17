var GoogleMapsAPI = require('googlemaps');

var cfg           = require('../config');
var utils         = require('../utils');
var botApi        = require('../botApi');

var googlemaps = {};

googlemaps.publicConfig = {
  key: cfg.googleMapsApi,
};

googlemaps.params = {
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

googlemaps.api = new GoogleMapsAPI(googlemaps.publicConfig);

googlemaps.test = function() {
    utils.downloadFile(googlemaps.api.staticMap(googlemaps.params), cfg.googlemapsDirectory + 'map.png', function() {
        botApi.sendPhoto(100100780, cfg.googlemapsDirectory + 'map.png');
    });
};

module.exports = googlemaps;