var _           = require('lodash');
var moment      = require('moment-timezone');

var cfg = {}; // the cfg object which will be returned

// The timezone in which the bot outputs all the datetimes
cfg.botTimezone = 'Europe/Helsinki';

// set default timezone to bot timezone
moment.tz.setDefault(cfg.botTimezone);

cfg.env = process.env.NODE_ENV || 'development';

// Database configs
var dbLocalConnection = {
	host: process.env.POSTGRES_PORT_5432_TCP_ADDR || 'localhost',
	user: 'borisbot',
	port: process.env.POSTGRES_PORT_5432_TCP_PORT || 5432,
	password: process.env.BORISBOT_DATABASE_PASSWORD || 'borisbot',
	database: 'borisbot',
	charset: 'utf8'
};
var dbConnection = process.env.DATABASE_URL || dbLocalConnection;

cfg.db = {
    client: 'postgresql',
    connection: dbConnection,
	pool: { min: 0, max: 5 }
};

cfg.allowedGroups = {
    testChatId: -13232285, // "BorisTest"
    mainChatId: (cfg.env === 'production') ? -8573374 : -13232285   // if env is production, main chat is "SpänniMobi"
};                                                                  // else main chat is "BorisTest"

// List of users who can execute "admin only" commands
cfg.adminUsers = [24175254, 100100780];

// List of users who can send messages through bot
cfg.botTalkUsers = _.union(cfg.adminUsers, [73814886]);

cfg.ignoredUsers = []; // users whom commands are ignored

// Port which the Boris server will listen to
cfg.serverPort = process.env.BORISBOT_PORT || 3000;

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

// Bing Image Seach API config
cfg.bingApiKey = process.env.BORISBOT_BING_APIKEY;

// Local directories for data storage
cfg.resourceDirectory = process.env.BORISBOT_RESOURCES_LOCATION || __dirname + '/../resources/';
cfg.plotlyDirectory = cfg.resourceDirectory + 'plotly/';
cfg.webcamDirectory = cfg.resourceDirectory + 'webcam/';
cfg.memeDirectory = cfg.resourceDirectory + 'memes/';
cfg.logDirectory = cfg.resourceDirectory + 'logs/';
cfg.requiredDirectories = [cfg.resourceDirectory, cfg.plotlyDirectory, cfg.webcamDirectory, cfg.memeDirectory, cfg.logDirectory]; // these folders will be made with mkdir

// URL where webcam image will be downloaded
cfg.webcamURL = process.env.BORISBOT_WEBCAM_URL;

// Logging config
cfg.logLocation = process.env.BORISBOT_LOGFILE_LOCATION || cfg.logDirectory + 'output.log';
cfg.mainChatLog = process.env.BORISBOT_MAINCHAT_LOG_LOCATION || cfg.logDirectory + 'mainchat.log';

module.exports = cfg;
