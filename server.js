var express     = require('express');
var bodyParser  = require('body-parser');
var request     = require('request');
var _           = require('lodash');

var app = express();


// # Config
var serverPort = process.env.PORT || 3000;
var apiKey = process.env.BORISBOT_TELEGRAM_APIKEY;
var apiUrl = 'https://api.telegram.org/bot' + apiKey;


// # Express middleware
app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse json


// # Routes
//
app.post('/api/webhook', function(req, res) {
    console.log('webhook event!', req.body);

    var msg = req.body.message;

    request.post(apiUrl + '/sendMessage', { form: {
        chat_id: msg.chat.id,
        text: 'Sain komennon: ' + msg.text
    }});

    res.sendStatus(200);
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
app.listen(serverPort, function() {
    console.log('BorisBot backend started at port', serverPort);
});

// Subscribe webhook
request.post(
    apiUrl + '/setWebhook', { form: { url: 'https://borisbot.herokuapp.com/api/webhook' }}, 
    function (error, response, body) {
        console.log('Webhook subscribtion callback:', response.body); 
    }
)

request(apiUrl + '/getMe', function (error, res, body) {
    console.log('getme test', body);
});
