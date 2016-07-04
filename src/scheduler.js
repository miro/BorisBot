// This module is for configuring cron jobs to the bot

var moment          = require('moment-timezone');
var _               = require('lodash');
var CronJob         = require('cron').CronJob;

var botApi  = require('./botApi');
var brain   = require('./brain');
var cfg     = require('./config');
var generic = require('./generic');

var drinkController         = require('./controllers/drinkController');
var textController          = require('./controllers/textController');
var restaurantController    = require('./controllers/restaurant/restaurantController');
var memeController          = require('./controllers/memeController');

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
    _.each(scheduler.jobs, job => {
        job.start();
    });
};

scheduler.stopJobs = function() {
    _.each(scheduler.jobs, job => {
        job.stop();
    });
};


// ## Add default jobs
//

// "Time until kesäpäivät"
scheduler.addJob({
    cronTime: '00 00 10 * * *',
    onTick: function timeTilKesaPaivatToSpinniMobi() {
        var startMoment = moment('2016-07-15 18:00');
        var daysLeft = startMoment.diff(moment(), 'days');

        if (daysLeft > 0) {
            botApi.sendMessage({
                chat_id: cfg.allowedGroups.mainChatId,
                text: 'HUOOOMENTA! Kesäpäiviin aikaa ' + daysLeft + ' päivää!!'
            });
        }
    },
    timeZone: cfg.botTimezone
});

// "Good morning & drink log"
scheduler.addJob({
    cronTime: '03 09 * * *',
    timeZone: cfg.botTimezone,
    onTick: function() {
        drinkController.getDailyAlcoholLogForEachGroup()
        .then(logs => brain.announceDrinkLogsToGroups(logs));
    }
});

// "Check clubroom's lightness value"
scheduler.addJob({
    cronTime: '00 */5 * * * *',
    onTick: function checkClubRoomStatus() {
        var now = moment();
        var month = now.month();
        var weekday = now.day();

        // If it is summer period or weekend, check lightness every five minutes
        if ((month >= 4 && month <= 7) || weekday === 0 || weekday === 6) {
            generic.checkWebcamLightness();

        // If it is school period, check lightness only before 8:00 and after 16:00
        } else {
            var hour = now.hour();
            if (hour <= 8 || hour >= 16) {
                generic.checkWebcamLightness();
            }
        }

    },
    timeZone: cfg.botTimezone
});

// "Delete expired messages from textController
scheduler.addJob({
    cronTime: '00 00 * * * *',
    onTick: function deleteExpiredMessages() {
        textController.deleteExpired();
    },
    timeZone: cfg.botTimeZone
});

// "Update restaurant menus"
scheduler.addJob({
    cronTime: '00 30 0,15 * * *',
    onTick: function updateMenus() {
        restaurantController.updateMenus();
    },
    timeZone: cfg.botTimeZone
});

// "Update memes every week"
scheduler.addJob({
    cronTime: '* * * 1 * *',
    onTick: function updateMemes() {
        memeController.getMemes();
    },
    timeZone: cfg.botTimeZone
});

module.exports = scheduler;
