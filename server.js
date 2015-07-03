var express     = require('express');
var bodyParser  = require('body-parser');
var request     = require('request');
var _           = require('lodash');

var commander   = require('./commander');
var cfg         = require('./config');
var msgHistory  = require('./messageHistory');
var scheduler   = require('./scheduler');
var graph		= require('./graph')

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
        console.log('Message ignored due to messageHistory state!');
        res.sendStatus(200);
        return;
    }

    // Send message to the actual bot
    commander.handleWebhookEvent(msg)
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
    console.log('Error catched by genericErrorHandler!', err);
    res.status(err.status).send(err);
});


// # Start the server
app.listen(cfg.serverPort, function() {
    console.log('BorisBot backend started at port', cfg.serverPort);
});

// Subscribe webhook
request.post(cfg.tgApiUrl + '/setWebhook', { form: { url: cfg.webhookUrl }},
    function (error, response, body) {
        console.log('Webhook subscribtion callback:', response.body);
    }
);

// Run test sequence
request(cfg.tgApiUrl + '/getMe', function (error, res, body) {
    console.log('I Am', body);
});
commander.sendMessage(cfg.allowedGroups.testChatId, 'Reboot! ' + Date() + '\nWebhook set to ' + cfg.webhookUrl);

// Start scheduler
scheduler.startJobs();

