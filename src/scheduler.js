// This module is for configuring cron jobs to the bot

var moment          = require('moment-timezone');
var _               = require('lodash');
var CronJob         = require('cron').CronJob;

var botApi          = require('./botApi');
var cfg             = require('./config');
var generic         = require('./generic');
var drinkController = require('./controllers/drinkController');
var textController  = require('./controllers/textController');

// set default timezone to bot timezone
moment.tz.setDefault(cfg.botTimezone);


// ## The Returning "service"
var scheduler = {
    jobs: []
};

// ## Public functions
//
scheduler.addJob = function(cronObj) {
    cronObj.start = false; // force the start parameter to false

    scheduler.jobs.push(new CronJob(cronObj));
};

scheduler.startJobs = function() {
    _.each(scheduler.jobs, function(job) {
        job.start();
    });
};

scheduler.stopJobs = function() {
    _.each(scheduler.jobs, function(job) {
        job.stop();
    });
};




// ## Add default jobs
//

// "Time until kesäpäivät"
scheduler.addJob({
    cronTime: '00 00 10 * * *',
    onTick: function sendTimeUntilKesaPaivatToSpinniMobi() {
        var startMoment = moment('2015-07-24 18:00');
        var daysLeft = startMoment.diff(moment(), 'days');

        if (daysLeft > 0) {
            botApi.sendMessage(cfg.allowedGroups.mainChatId, 'HUOOOMENTA! Kesäpäiviin aikaa ' + daysLeft + ' päivää!!');
        }
    },
    timeZone: cfg.botTimezone
});

// "Check clubroom's lightness value on weekdays"
scheduler.addJob({
    cronTime: '00 */5 0-8,15-23 * * 1-5',
    onTick: function checkClubRoomStatus() {
        generic.checkWebcamLightness();
    },
    timeZone: cfg.botTimezone
});

// "Check clubroom's lightness value on weekends"
scheduler.addJob({
    cronTime: '00 */5 * * * 6-7',
    onTick: function checkClubRoomStatus() {
        generic.checkWebcamLightness();
    },
    timeZone: cfg.botTimeZone
});

// "Delete expired messages from textController
scheduler.addJob({
    cronTime: '00 00 * * * *',
    onTick: function deleteExpiredMessages() {
        textController.deleteExpired();
    },
    timeZone: cfg.botTimeZone
});

module.exports = scheduler;