var _           = require('lodash');
var winston     = require('winston');
var moment      = require('moment-timezone');

var cfg = {}; // the cfg object which will be returned

// The timezone in which the bot outputs all the datetimes
cfg.botTimezone = 'Europe/Helsinki';

// set default timezone to bot timezone
moment.tz.setDefault(cfg.botTimezone);

cfg.env = process.env.NODE_ENV || 'development';

// Database configs
var dbPass = process.env.BORISBOT_DATABASE_PASSWORD || 'borisbot';
var dbLocalConnection = {
	host: 'localhost',
	user: 'borisbot',
	port: 5432,
	password: dbPass,
	database: 'borisbot',
	charset: 'utf8'
};
var dbConnection = process.env.DATABASE_URL || dbLocalConnection;

cfg.db = {
    client: 'postgresql',
    connection: dbConnection,
	pool: { min: 0, max: 5 }
};

// Logging config
cfg.logLocation = process.env.BORISBOT_LOGFILE || './logs/output.log';

var logOptions = {};
if (cfg.env === 'production') {
    logOptions.transports = [
        new (winston.transports.File)({
                filename: cfg.logLocation,
                level: 'error',
				timestamp: function() {
					return moment().format('YYYY-MM-DDTHH:mm:SS');
				},
				formatter: function(options) {
                    return options.timestamp() +'--'+ options.level.toUpperCase() +'--'+ (undefined !== options.message ? options.message : '');
                },
				maxsize: 15000000,
				json: false
				
        })
    ];
} else {
    logOptions.transports = [
        new (winston.transports.Console)({
			timestamp: function() {
				return moment().format('YYYY-MM-DDTHH:mm:SS');
			},
			level: 'debug'})
    ];
}

cfg.logger = new (winston.Logger)(logOptions);

cfg.allowedGroups = {
    testChatId: -13232285, // "BorisTest"
    mainChatId: -8573374, // "SpänniMobi"
};

// List of users who can execute "admin only" commands
cfg.adminUsers = [24175254, 100100780];

// List of users who can send messages through bot
cfg.botTalkUsers = _.union(cfg.adminUsers, [73814886]);

cfg.ignoredUsers = [50446519]; // users whom commands are ignored

// Port which the Boris server will listen to
cfg.serverPort = process.env.PORT || 3000;

// Telegram API configs
cfg.tgApiKey = process.env.BORISBOT_TELEGRAM_APIKEY;
cfg.tgApiUrl = 'https://api.telegram.org/bot' + cfg.tgApiKey;

// URL where the Telegram webhook will send POST requests
cfg.webhookUrl = process.env.BORISBOT_PUBLIC_URL + '/api/webhook';
cfg.certificateFile = process.env.BORISBOT_PUBLIC_CERTIFICATE || null;

// Plotly API configs
cfg.plotlyUserName = process.env.BORISBOT_PLOTLY_USERNAME || "BorisBot";
cfg.plotlyApiKey = process.env.BORISBOT_PLOTLY_APIKEY;

// ImgFlip API configs
cfg.imgFlipUserName = process.env.BORISBOT_IMGFLIP_USERNAME;
cfg.imgFlipPassword = process.env.BORISBOT_IMGFLIP_PASSWORD;

// Local directories for data storage
cfg.plotlyDirectory = './plotly/';
cfg.webcamDirectory = './webcam/';
cfg.memeDirectory = './memes/';
cfg.logDirectory = './logs/';
cfg.requiredDirectories = [cfg.plotlyDirectory, cfg.webcamDirectory, cfg.memeDirectory, cfg.logDirectory]; // these folders will be made with mkdir

// URL where webcam image will be downloaded
cfg.webcamURL = process.env.BORISBOT_WEBCAM_URL;


module.exports = cfg;
