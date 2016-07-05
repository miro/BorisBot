var Promise = require('bluebird');
var _       = require('lodash');
var moment  = require('moment-timezone');
var emoji   = require('node-emoji')

var parserJuvenes   = require('./parsers/juvenes');
var parserHertsi    = require('./parsers/hertsi');
var parserReaktori  = require('./parsers/reaktori');
var resources       = require('./restaurantsConfig');
var botApi          = require('../../botApi');

var cfg             = require('../../config');
var logger          = require('../../logger');

moment.tz.setDefault(cfg.botTimezone);

var controller = {};

var diners = {
    reaktori: {
        info: resources.reaktori,
        parser: parserReaktori
    },
    newton: {
        info: resources.juvenes.newton,
        parser: parserJuvenes.newton
    },
    hertsi: {
        info: resources.hertsi,
        parser: parserHertsi
    },
    sååsbar: {
        info: resources.juvenes.sååsbar,
        parser: parserJuvenes.sååsbar
    },
    fusion: {
        info: resources.juvenes.fusion,
        parser: parserJuvenes.fusion
    },
    konehuone: {
        info: resources.juvenes.konehuone,
        parser: parserJuvenes.konehuone
    }
};

controller.getAllMenusForToday = function (event) {
    return new Promise(function(resolve,reject)  {

        // Process only three main diners if message is from group
        var validDiners = (event.isFromGroup && moment().isBefore(moment('15:00', 'HH:mm'))) ? {
            reaktori: diners.reaktori,
            newton: diners.newton,
            hertsi: diners.hertsi
        } : _.clone(diners);

        // Remove diners which aren't open
        _.forEach(validDiners, function(diner, name) {
            if (!_isDinerOpen(diner)) {
                _.unset(validDiners, name);
            }
        });

        // Check if every diner is closed
        if (_.isEmpty(validDiners)) {
            return resolve('Ei ravintoloita auki.');
        }
        // Use shorter presentation if event is from group
        var style = (!event.isFromGroup) ? _splitMealsToRows : x => x.join(', ');

        var s = new String();
        _.forEach(validDiners, function(diner, name) {

            // Print diner info
            s += '[' + diner.info.name + '](' + diner.info.homepage + ')';
            s +=  _timeToCloseOrOpen(diner) + ': ';

            // Print menus if they exists
            if (!_.isEmpty(diner.menu)) {
                s += style(diner.menu) + '\n';
            } else {
                s += ' _ruokalistaa ei saatavilla_\n';
            }
        });

        botApi.sendMessage({
            chat_id: event.targetId,
            text: s,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });

        return resolve();
    });
};

controller.updateMenus = function () {
    return new Promise(function(resolve,reject) {

        // Delete old menus
        _.forEach(diners, diner => diner.menu = []);
        // Choose only relevant diners
        var validDiners = _.clone(diners);
        var validParsers = [];
        _.forEach(validDiners, function(diner,name) {
            if (_isDinerOpenToday(diner)) {
                validParsers.push(diner.parser());
            } else {
                _.unset(validDiners, name);
            }
        });

        // Fetch new ones
        Promise.all(validParsers)
        .then(function(result) {
            var i = 0;
            _.forEach(validDiners, diner => {
                diner.menu = result[i];
                i++;
            });
            resolve();
        }).catch(e => reject(e));
    });
};

var _timeToCloseOrOpen = function(diner) {
    var now = moment();
    var s = '';
    var info = diner.info.open[now.weekday()];
    var to = '';
    var from = ''

    if (!_.isUndefined(info.pause)) {

        // Is diner now on break?
        if (now.isBetween(moment(info.pause.from, 'HH:mm'), moment(info.pause.to, 'HH:mm'))) {
            from = info.pause.from
            to = info.pause.to;

        // Will diner be on break?
        } else if (now.isBefore(moment(info.pause.from, 'HH:mm'))) {
            from = info.from;
            to = info.pause.from;

        // There has been break already
        } else {
            from = info.pause.to;
            to = info.to
        }
    } else {
        from = info.from;
        to = info.to;
    }

    var minutesToOpen = moment(from, 'HH:mm').diff(now, 'minutes');

    // Is diner open yet?
    if (minutesToOpen > 0) {
        s += ' ' + '`(Aukeamiseen aikaa '

        // Is there only minutes
        if (minutesToOpen <= 60) {
            s += minutesToOpen + ' minuutti';
            if (minutesToOpen !== 1) {
                s += 'a'
            }
        } else {
            var hours = _.floor(minutesToOpen / 60);
            s += hours + ' tunti';
            if (hours !== 1) { s += 'a'; }

            var minutes = minutesToOpen - hours * 60;
            if (minutes > 0) {
                s += ' ja ' + minutes + ' minuutti';
                if (minutes !== 1) { s += 'a'; }
            }
        }
        s += ')`';

    } else {
        var minutesToClose = now.diff(moment(to, 'HH:mm'), 'mintues');
        if (minutesToClose > 0 && minutesToClose <= 60) {
            s += ' ' + emoji.get(':exclamation:') + ' `(Auki vielä ' + minutesToClose + ' minuutti';
            if (minutesToClose !== 1) { s += 'a'; }
            s += ')`';
        }
    }
    return s;
}

var _splitMealsToRows = function(meals) {
    var s = new String();
    _.forEach(meals, meal => s += '\n  \u2022 ' + meal);
    return s;
};

var _isDinerOpen = function(diner) {

    if (!_isDinerOpenToday(diner)) {return false;}

    var now = moment();
    var info = diner.info.open[now.weekday()];
    var openTo = moment(info.to, 'HH:mm');

    // Check if diner have a pause middle of the day
    if (_.isUndefined(info.pause)) {
        return now.isBefore(openTo);
    } else {
        if (now.isAfter(moment(info.pause.from, 'HH:mm'))
            && now.isBefore(moment(info.pause.to, 'HH:mm'))) {
                return false; // Diner is on pause right now
        } else {
            return now.isBefore(openTo);
        }
    }
};

var _isDinerOpenToday = function(diner) {
    var weekday = moment().weekday();

    if (!_.isUndefined(diner.info.open[weekday])) {
        return true;
    } else {
        return false
    }
}

// Update menus when controller is initialized
controller.updateMenus()
.catch(e =>
    logger.log('error', 'restaurantController: error when fetching menus first time - %s', e)
);

module.exports = controller;
