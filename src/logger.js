const winston   = require('winston');
const moment    = require('moment-timezone');
const cfg       = require('./config');


var logOptions = {};
logOptions.transports = [
    new (winston.transports.Console)({
        timestamp: function() {
            return moment().format('YYYY-MM-DDTHH:mm:SS');
        },
        level: 'debug',
        colorize: true
    })
];

// Add logs also to file if env is production
if (cfg.env === 'production') {
    logOptions.transports.push(
        new (winston.transports.File)({
            filename: cfg.logLocation,
            level: 'info',
            timestamp: function() {
                return moment().format('YYYY-MM-DDTHH:mm:SS');
            },
            formatter: function(options) {
                var msg = (options.message !== undefined ? options.message : '');
                return `${options.timestamp()}--${options.level.toUpperCase()}--${msg}`;
            },
            maxsize: 10000000,
            json: false
        })
    );
}

var logger = new (winston.Logger)(logOptions);

module.exports = logger;

