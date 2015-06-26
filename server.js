var express     = require('express');
var bodyParser  = require('body-parser');
var request     = require('request');
var _           = require('lodash');

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
    var commandParts = msg.text.split(' ');

    switch (commandParts[0]) {
        case '/kalja':
        case '/kippis':
            commander.registerDrink(msg.from.id, commandParts[1])
            .then(function(todaysDrinks) {
                commander.sendMessage(
                    msg.chat.id,
                    'Kippis!! Se olikin jo ' + todaysDrinks.models.length + '. tälle päivälle!'
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
    if (_.isUndefined(err.status)) {
        err.status = 500;
    }

    console.log(err); // log the error

    res.status(err.status).send(err); // send response
});


// # Start the server
app.listen(cfg.serverPort, function() {
    console.log('BorisBot backend started at port', cfg.serverPort);
});

// Subscribe webhook
request.post(
    cfg.tgApiUrl + '/setWebhook', { form: { url: cfg.webhookUrl }}, 
    function (error, response, body) {
        console.log('Webhook subscribtion callback:', response.body); 
    }
)

request(cfg.tgApiUrl + '/getMe', function (error, res, body) {
    console.log('getme test', body);
});
