var request     = require('request');
var fs          = require('fs');

var cfg         = require('./config');


var utils = {};

utils.downloadFile = function(uri, filename, callback) {
    request.head(uri, function(err, res, body) {
        if (err) {
            console.log('Error on file download!', err);
        }
        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};

utils.userIsAdmin = function(userId) {
    return cfg.adminUsers.indexOf(parseInt(userId, 10)) >= 0;
};

module.exports = utils;
