// Here will be configured all the routes which the Boris will have
var Promise = require('bluebird');
var _       = require('lodash');

var db      = require('./database');
var logger  = require('./config').logger

const BASE_URL = process.env.BORISBOT_BASE_URL || '/';

module.exports = function(app) {

    app.get('/', function (req, res) {
        res.render('index', { title: 'Hey', message: 'Hello there!'});
    });

    app.param('username', function(req, res, next, username) {
        db.getUserByLowercaseName(_.lowerCase(username))
        .then(model => {
            if (!_.isNull(model)) {
                req.user = model.serialize();
            }
            next();
        })
    });

    app.get('/user/:username', function (req, res) {
        if (req.user) {
            res.render('user', req.user);
        } else {
            res.render('not_found');
        }
    });

    app.get('/user', function (req, res) {
        res.redirect(BASE_URL);
    })
}
