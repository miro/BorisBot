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

// URL where the Telegram webhook will send POST requests. Change accordingly!
cfg.webhookUrl = 'https://457450e5.ngrok.com/api/webhook'; // https://borisbot.herokuapp.com/api/webhook


module.exports = cfg;
