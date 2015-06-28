// ### Handles all the bot commands


var Promise     = require('bluebird');
var request     = require('request');
var moment      = require('moment-timezone');
var _           = require('lodash');

var cfg         = require('./config');
var db          = require('./database');


var commander = {};

// "Public" functions
//

// This function handle
commander.handleWebhookEvent = function runUserCommand(msg) {
    return new Promise(function (resolve, reject) {
        // TODO check the sender
        console.log('webhook event!', msg);


        if (!msg.text) {
            console.log('no text on event, ignore');
            resolve();
            return;
        }

        // parse command & possible parameters
        var userInput = msg.text.split(' ');
        var userCommand = userInput.shift();
        var userCommandParams = userInput.join(' ');

        var userId = msg.from.id;

        switch (userCommand) {
            case '/kalja':
            case '/kippis':
                commander.registerDrink(userId, userCommandParams) 
                .then(function(drinksCollection) {

                    var drinksToday = drinksCollection.models.length;
                    var drinksTodayForThisUser = _.filter(drinksCollection.models, function(model) {
                        return model.attributes.creatorId === userId;
                    }).length;

                    // everyone doesn't have username set - use first_name in that case
                    var username = _.isUndefined(msg.from.username) ? msg.from.first_name : ('@' + msg.from.username);

                    var userPosition = commander.getUserCurrentPosition(drinksCollection, userId);

                    // form the message
                    var returnMessage = 'Kippis!!';

                    if (drinksTodayForThisUser === 1) {
                        returnMessage += ' Päivä käyntiin!';
                    }

                    returnMessage += ' Se olikin jo Spännin ' + drinksToday + '. tälle päivälle, ja ' +
                    drinksTodayForThisUser + '. käyttäjälle ' + username + '.\n';

                    commander.sendMessage(msg.chat.id, returnMessage);
                    resolve();
                })
                .error(function(e) {
                    commander.sendMessage(msg.chat.id, 'Kippis failed');
                    reject();
                });
            break;

            case '/kaljoja':
                // TODO "joista x viimeisen tunnin aikana"?
                db.getTotalDrinksAmount()
                .then(function fetchOk(result) {
                    commander.sendMessage(msg.chat.id, 'Kaikenkaikkiaan juotu ' + result[0].count + ' juomaa');
                    resolve();
                });
            break;

            case '/otinko':
                commander.getPersonalDrinkLog(userId)
                .then(function(logString) {
                    commander.sendMessage(userId, logString);

                    if (_eventIsFromGroup(msg)) {
                        commander.sendMessage(userId, 'PS: anna "' + 
                            userCommand + '"-komento suoraan minulle, älä spämmää turhaan ryhmächättiä!');
                    }

                    resolve();
                });
            break;

            default:
                console.log('! Unknown command', msg.text);
                resolve();
        }
    });
};

commander.registerDrink = function(drinker, drinkType) {
    // fallback to 'kalja' if no drinkType is set
    drinkType = !drinkType ? 'kalja' : drinkType;

    var tresholdMoment = _getTresholdMoment();

    return new Promise(function(resolve, reject) {
        // register drink
        db.registerDrink(drinker, drinkType)
        .then(function() {

            // fetch drink data
            db.getDrinksSinceTimestamp(tresholdMoment)
            .then(function(collection) {
                resolve(collection);
            });
        })
        .error(function(e) {
            console.log('Error on registerDrink', e);
            reject(e);
        });
    });
};

commander.getUserCurrentPosition = function(collection, userId) {
    var grouped = _.groupBy(collection.models, function(model) {
        return model.get('creatorId');
    });

    var position = 1;
    for (var id in grouped) {
        if (parseInt(id, 10) === userId) {
            return position;
        }
        position += 1;
    }

    // no match found...?
    return undefined;
};

commander.sendMessage = function(chatId, text) {
    request.post(cfg.tgApiUrl + '/sendMessage', { form: {
        chat_id: chatId,
        text: text
    }});
};

commander.getPersonalDrinkLog = function(userId) {
    return new Promise(function (resolve, reject) {
        
        db.getDrinksSinceTimestampForUser(moment().subtract(2, 'day'), userId)
        .then(function(collection) {
            var message = 'Juomasi viimeisen 48h ajalta:\n-----------\n';

            _.each(collection.models, function(model) {
                message += moment(model.get('timestamp')).tz('Europe/Helsinki').format('HH:mm');
                message += ' - ' + model.get('drinkType') + '\n';
            });

            resolve(message);
        });
    });
};


// Helper functions
//
var _getTresholdMoment = function() {
    var treshold = moment().hour(9).minute(0);

    var tresholdIsInFuture = treshold.isAfter(moment());
    if (tresholdIsInFuture) {
        treshold.subtract(1, 'day');
    }

    return treshold;
};

// Returns true, if this event is triggered from group
var _eventIsFromGroup = function(msg) {
    return !_.isUndefined(msg.chat.title);
};


module.exports = commander;
