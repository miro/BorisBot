/* eslint-disable no-unused-vars */
// ^ this is disabled since express error handlers must announce
//   all the required parameters in order to work, and it mismatches
//   with that rule

var express         = require('express');
var bodyParser      = require('body-parser');
var _               = require('lodash');
var fs              = require('fs');
var exec            = require('child_process').exec;

var dispatcher      = require('./dispatcher');
var botApi          = require('./botApi');
var cfg             = require('./config');
var msgHistory      = require('./messageHistory');
var scheduler       = require('./scheduler');
var explController  = require('./controllers/explController');
var logger          = require('./logger');

var app         = express();

// # Express middleware
app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse json


// # Routes
//
app.post('/api/webhook', (req, res) => {
    var updateId = req.body.update_id;

    if (!msgHistory.startProcessingMsg(updateId)) {
        // this message is already parsed
        logger.info('Message ignored due to messageHistory state!');
        res.sendStatus(200);
        return;
    }

    // Send message to the actual bot

    // Check if body was message or edited_message
    var msg = (req.body.message) ? req.body.message : req.body.edited_message;

    dispatcher(msg)
    .then(() => {
        msgHistory.messageProcessed(updateId);
        res.sendStatus(200);
    })
    .error(() => {
        msgHistory.messageProcessingFailed(updateId);
        res.sendStatus(500);
    });
});

// Catch all 404 route (this needs to be last)
app.get('*', (req, res, next) => {
    var err = new Error();
    err.status = 404;
    next(err);
});

// # Error handlers
app.use(function handle404(err, req, res, next) { // 404
    const fallbackMsg = [
        '404 Content not found',
        'but such are the mysteries of the Internet sometimes'
    ].join(' - ');

    if (err.status !== 404) return next(err);
    return res.send(err.message || fallbackMsg);
});
app.use(function genericErrorHandler(err, req, res, next) { // 500
    err.status = _.isUndefined(err.status) ? 500 : err.status;
    logger.log('error', 'Error catched by genericErrorHandler!', err);
    res.status(err.status).send(err);
});

// # Make required directories
_.each(cfg.requiredDirectories, directory => {
    fs.lstat(directory, (err, stats) => {
        logger.log(err);

        if (err && err.code === 'ENOENT') {
            var mkdir = 'mkdir -p ' + directory;
            var child = exec(mkdir, (mkdirErr, stdout, stderr) => {
                if (mkdirErr) throw mkdirErr;
                logger.info('Created folder: ' + directory);
            });
        }
    });
});

// # Start the server
app.listen(cfg.serverPort, () => {
    logger.log('info', 'BorisBot backend started at port ' + cfg.serverPort);
});

// Subscribe webhook
botApi.setWebhook({ url: cfg.webhookUrl, certificate: cfg.certificateFile })
// Run test sequence
.then(() => botApi.getMe())
.then(response => logger.info('I am %s / @%s', response.first_name, response.username));

// Start scheduler
scheduler.startJobs();

// Update expl keys for !rexpl
explController.updateRexplKeys();

