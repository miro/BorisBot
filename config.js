var cfg = {};

cfg.db = { // database config
    client: 'postgresql',
    connection: process.env.DATABASE_URL
};

cfg.allowedGroups = {
    testChatId: -13232285, // "BorisTest"
    mainChatId: -8573374, // "SpänniMobi"
};

// Port which the Boris server will listen to
cfg.serverPort = process.env.PORT || 3000;

// Telegram API configs
cfg.tgApiKey = process.env.BORISBOT_TELEGRAM_APIKEY;
cfg.tgApiUrl = 'https://api.telegram.org/bot' + cfg.tgApiKey;

// URL where the Telegram webhook will send POST requests
cfg.webhookUrl = process.env.BORISBOT_WEBHOOK_URL;



module.exports = cfg;
