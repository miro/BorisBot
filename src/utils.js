var Promise     = require('bluebird');
var request     = require('request');
var fs          = require('fs');
var cfg         = require('./config');
var logger      = require('./logger');


var utils = {};

utils.downloadFile = function(uri, filename) {
    return new Promise(function(resolve,reject) {
        request.head(uri, function(err, res, body) {
            if (err) {
                logger.log('error','Error on file download!', err);
                reject(err);
            }
            request(uri)
            .pipe(fs.createWriteStream(filename))
            .on('error', e => {
                logger.log('error', 'Error when downloading file: %s', e);
                resolve()
            })
            .on('close', resolve);
        });
    });
};

utils.userIsAdmin = function(userId) {
    return cfg.adminUsers.indexOf(parseInt(userId, 10)) >= 0;
};

utils.userHaveBotTalkRights = function(userId) {
    return cfg.botTalkUsers.indexOf(parseInt(userId, 10)) >= 0;
};

// TODO: implement "getCommandAndParams" (see what is done multiple times in explController)

module.exports = utils;
