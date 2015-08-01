var _           = require('lodash');

var cfg = {}; // the cfg object which will be returned


cfg.env = process.env.NODE_ENV || 'development';

// Environment specific database configs
var dbConfigs = {
    development: {
        client: 'postgresql',
        connection: {
            host: 'localhost',
            user: 'borisbot',
            port: 5432,
            password: 'borisbot',
            database: 'borisbot',
            charset: 'utf8'
        },
        pool: { min: 0, max: 5 }
    },

    production: {
        client: 'postgresql',
        connection: process.env.DATABASE_URL
    }
};

// Determine the correct database config
if (_.isUndefined(dbConfigs[cfg.env])) {
    cfg.db = dbConfigs.development;
}
else {
    cfg.db = dbConfigs[cfg.env];
}

// The timezone in which the bot outputs all the datetimes
cfg.botTimezone = 'Europe/Helsinki';


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

// Plotly API configs
cfg.plotlyUserName = process.env.BORISBOT_PLOTLY_USERNAME || "BorisBot";
cfg.plotlyApiKey = process.env.BORISBOT_PLOTLY_APIKEY;

// Local directories for data storage
cfg.plotlyDirectory = './plotly/';
cfg.webcamDirectory = './webcam/';
cfg.memeDirectory = './memes/';
cfg.requiredDirectories = [cfg.plotlyDirectory, cfg.webcamDirectory, cfg.memeDirectory]; // these folders will be made with mkdir

// URL where webcam image will be downloaded
cfg.webcamURL = process.env.BORISBOT_WEBCAM_URL;


module.exports = cfg;
