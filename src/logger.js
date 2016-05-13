const winston   = require('winston');
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
                    return options.timestamp() +'--'+ options.level.toUpperCase() +'--'+ (undefined !== options.message ? options.message : '');
                },
                maxsize: 10000000,
                json: false
        })
    );
}

var logger = new (winston.Logger)(logOptions);

module.exports = logger;
