var express     = require('express');
var bodyParser  = require('body-parser');
var request     = require('request');
var _           = require('lodash');
var moment      = require('moment');

var commander   = require('./commander');
var cfg         = require('./config');

var app         = express();



// # Express middleware
app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse json


// # Routes
//
app.post('/api/webhook', function(req, res) {
    console.log('webhook event!', req.body);

    var msg = req.body.message;

    if (!msg.text) {
        console.log('no text on event, ignore');
        res.sendStatus(200);
        return;
    }

    // parse command & possible parameters
    var userInput = msg.text.split(' ');
    var userCommand = userInput.shift();
    var userCommandParams = userInput.join(' ');


    switch (userCommand) {
        case '/kalja':
        case '/kippis':
            commander.registerDrink(msg.from.id, userCommandParams) 
            .then(function(drinksCollection) {

                var drinksToday = drinksCollection.models.length;
                var drinksTodayForThisUser = _.filter(drinksCollection.models, function(model) {
                    return model.attributes.creatorId === msg.from.id;
                }).length;

                // everyone doesn't have username set - use first_name in that case
                var username = !msg.from.username ? msg.from.first_name : msg.from.username;

                commander.sendMessage(
                    msg.chat.id,
                    'Kippis!! Se olikin jo Spännin ' + drinksToday + '. tälle päivälle, ja ' +
                    drinksTodayForThisUser + '. käyttäjälle @' + msg.from.username
                );
                res.sendStatus(200);
            })
            .error(function(e) {
                commander.sendMessage(msg.chat.id, 'Kippis failed');
                res.sendStatus(200);
            });
        break;

        case '/kaljoja':
            commander.getDrinksAmount()
            .then(function fetchOk(result) {
                commander.sendMessage(msg.chat.id, 'Kaikenkaikkiaan juotu ' + result[0].count + ' juomaa');
                res.sendStatus(200);
            });
        break;

        case '/otinko':
            commander.getPersonalDrinkLog(msg.from.id)
            .then(function(logString) {
                commander.sendMessage(msg.from.id, logString);
                res.sendStatus(200);
            });
        break;

        default:
            console.log('! Unknown command', msg.text);
            res.sendStatus(200);
    }
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

