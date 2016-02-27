var express         = require('express');
var bodyParser      = require('body-parser');
var request         = require('request');
var _               = require('lodash');
var fs              = require('fs');
var exec            = require('child_process').exec;

var dispatcher      = require('./dispatcher');
var botApi          = require('./botApi');
var cfg             = require('./config');
var msgHistory      = require('./messageHistory');
var scheduler       = require('./scheduler');
var memeController  = require('./controllers/memeController');
var logger          = cfg.logger;

var app         = express();



// # Express middleware
app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse json


// # Routes
//
app.post('/api/webhook', function(req, res) {
    var msg = req.body.message;

    if (!msgHistory.startProcessingMsg(msg.message_id)) {
        // this message is already parsed
        logger.log('info', 'Message ignored due to messageHistory state!');
        res.sendStatus(200);
        return;
    }

    // Send message to the actual bot
    dispatcher(msg)
    .then(function() {
        msgHistory.messageProcessed(msg.message_id);
        res.sendStatus(200);
    })
    .error(function() {
        msgHistory.messageProcessingFailed(msg.message_id);
        res.sendStatus(500);
    });
});

// Catch all 404 route (this needs to be last)
app.get('*', function(req, res, next) {
    var err = new Error();
    err.status = 404;
    next(err);
});

// # Error handlers
app.use(function handle404(err, req, res, next) { // 404
    if (err.status !== 404) return next(err);
    res.send(err.message || '404 Content not found - but such are the mysteries of the Internet sometimes');
});
app.use(function genericErrorHandler(err, req, res, next) { // 500
    err.status = _.isUndefined(err.status) ? 500 : err.status;
    logger.log('error', 'Error catched by genericErrorHandler!', err);
    res.status(err.status).send(err);
});

// # Make required directories
_.each(cfg.requiredDirectories, function(directory) {
    fs.lstat(directory, function(err, stats) {
        logger.log(err);
        if (err && err['code'] === 'ENOENT') {
            var mkdir = 'mkdir -p ' + directory;
            var child = exec(mkdir, function(err,stdout,stderr) {
                if (err) throw err;
                logger.log('info', 'Created folder: ' + directory);
            });
        };
    });
});

// # Start the server
app.listen(cfg.serverPort, function() {
    logger.log('info', 'BorisBot backend started at port ' + cfg.serverPort);
});

// Subscribe webhook
botApi.setWebhook({url: cfg.webhookUrl, certificate: cfg.certificateFile})
// Run test sequence
.then(() => botApi.getMe()).then(r => logger.log('info', 'I am %s / @%s', r.first_name, r.username));

// Start scheduler
scheduler.startJobs();

