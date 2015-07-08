var request     = require('request');
var fs          = require('fs');


var utils = {};

utils.downloadFile = function(uri, filename, callback) {
    request.head(uri, function(err, res, body) {
        if (err) {
            console.log('Error on file download!', err);
        }
        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};



module.exports = utils;
