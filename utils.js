var Promise     = require('bluebird');
var request     = require('request');
var fs          = require('fs');

var cfg         = require('./config');


var utils = {};

utils.downloadFile = function(uri, filename) {
    return new Promise(function(resolve,reject) {
        request.head(uri, function(err, res, body) {
            if (err) {
                console.log('Error on file download!', err);
                reject(err);
            }
            request(uri).pipe(fs.createWriteStream(filename)).on('close', resolve);
        });
    });
};

utils.userIsAdmin = function(userId) {
    return cfg.adminUsers.indexOf(parseInt(userId, 10)) >= 0;
};

module.exports = utils;
