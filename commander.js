// ### Handles all the bot commands


var Promise     = require('bluebird');
var request     = require('request');
var moment      = require('moment-timezone');
var _           = require('lodash');

var cfg         = require('./config');
var db          = require('./database');
var graph		= require('./graph');

// set default timezone to bot timezone
moment.tz.setDefault(cfg.botTimezone);


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

        // Parse metadata from the message
        var userId = msg.from.id;
        var userName = _.isUndefined(msg.from.username) ? msg.from.first_name : ('@' + msg.from.username);
        var chatGroupId = _eventIsFromGroup(msg) ? msg.chat.id : null;
        var chatGroupTitle = _eventIsFromGroup(msg) ? msg.chat.title : null;

        // check if user is ignored
        var userIsIgnored = cfg.ignoredUsers.indexOf(userId) >= 0;
        if (userIsIgnored) {
            // do nothing
            console.log('! Ignored user tried to trigger command');
            resolve();
            return;
        }


        // parse command & possible parameters
        var userInput = msg.text.split(' ');
        var userCommand = userInput.shift();
        var userCommandParams = userInput.join(' ').substring(0,140);


        switch (userCommand.toLowerCase()) {
            case '/kalja':
            case '/kippis':
                commander.registerDrink(msg.message_id, chatGroupId, chatGroupTitle, userId, userName, userCommandParams) 
                .then(function(returnMessage) {
                    commander.sendMessage(msg.chat.id, returnMessage);
                    resolve();
                })
                .error(function(e) {
                    commander.sendMessage(msg.chat.id, 'Kippistely epäonnistui, yritä myöhemmin uudelleen');
                    resolve();
                });
            break;

            case '/kaljoja':
                // TODO "joista x viimeisen tunnin aikana"?

                if (_eventIsFromGroup(msg)) {
                    db.getTotalDrinksAmountForGroup(msg.chat.id)
                    .then(function fetchOk(result) {
                        var output = msg.chat.title + ' on tuhonnut yhteensä ' + result[0].count + ' juomaa!';
                        commander.sendMessage(msg.chat.id, output);
                        resolve();
                    });
                }
                else {
                    db.getTotalDrinksAmount()
                    .then(function fetchOk(result) {
                        commander.sendMessage(msg.chat.id, 'Kaikenkaikkiaan juotu ' + result[0].count + ' juomaa');
                        resolve();
                    });
                }
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

			case '/histogrammi':
				var params = userCommandParams.split(" ");
				var subtractDays = 2
				var userOrGroup = "user"
				
				if (params.length >= 1) {
					if (params[0] > 0) { subtractDays = params[0] }
					else if (params[0].toLowerCase() == "group" && _eventIsFromGroup(msg)) { userOrGroup = "group" };
				};
				if (params.length >= 2) {
					if (params[1].toLowerCase() == "group" && _eventIsFromGroup(msg)) { userOrGroup = "group" };
				};
				
				if (userOrGroup == "group") {
					commander.getGroupDrinkTimesSince(chatGroupId, moment().subtract(subtractDays, 'day'))
					.then(function(timestamp_arr) {
						graph.makeHistogram(chatGroupTitle, timestamp_arr, subtractDays)
						.then(function (plotly) {
							commander.sendMessage(chatGroupId, plotly.url + ".png");
							resolve();
						});
					});
					resolve();
				} else {	
					commander.getPersonalDrinkTimesSince(userId, moment().subtract(subtractDays, 'day'))
					.then(function(date_arr) {
						graph.makeHistogram(userName, date_arr, subtractDays)
						.then(function (plotly) {
							if (_eventIsFromGroup(msg)) {
								commander.sendMessage(msg.chat.id, plotly.url + ".png");
							} else {
								commander.sendMessage(userId, plotly.url + ".png");
							};
							resolve();
						});
					});
				};
			break;
			
            default:
                console.log('! Unknown command', msg.text);
                resolve();
        }
    });
};

commander.registerDrink = function(messageId, chatGroupId, chatGroupTitle, userId, userName, drinkType) {
    // fallback to 'kalja' if no drinkType is set
    drinkType = !drinkType ? 'kalja' : drinkType;

    return new Promise(function(resolve, reject) {
        db.registerDrink(messageId, chatGroupId, userId, drinkType)
        .then(function() {
            db.getDrinksSinceTimestamp(_getTresholdMoment(), chatGroupId)
            .then(function createReturnMessageFromCollection(drinksCollection) {

                var drinksToday = drinksCollection.models.length;
                var drinksTodayForThisUser = _.filter(drinksCollection.models, function(model) {
                    return model.attributes.creatorId === userId;
                }).length;

                // # Form the message
                var returnMessage = 'Kippis!!';

                // was this todays first for the user?
                if (drinksTodayForThisUser === 1) {
                    returnMessage += ' Päivä käyntiin!';
                }

                // Is there a group title?
                if (_.isNull(chatGroupTitle)) {
                    returnMessage += ' Se olikin jo ' + drinksTodayForThisUser + '. tälle päivälle.\n';
                }
                else {
                    returnMessage += ' Se olikin jo ryhmän ' + chatGroupTitle + ' ' + drinksToday + 
                    '. tälle päivälle, ja ' + drinksTodayForThisUser + '. käyttäjälle ' + userName + '.\n';
                }

                resolve(returnMessage);
            });
        });
    });
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
            var message = 'Juomasi viimeisen 48h ajalta:\n\n';

            _.each(collection.models, function(model) {
                message += moment(model.get('timestamp')).format('HH:mm');
                message += ' - ' + model.get('drinkType') + '\n';
            });

            message += '______________\n';
            message += 'Yhteensä ' + collection.models.length + ' kpl';

            resolve(message);
        });
    });
};

commander.getPersonalDrinkTimesSince = function(userId, timestamp) {
	return new Promise(function (resolve, reject) {
		
		db.getDrinksSinceTimestampForUser(timestamp, userId)
		.then(function(collection) {
			var timestamp_arr = [];
			_.each(collection.models, function(model) {
				timestamp_arr.push(moment(model.get('timestamp')))
			});
			resolve(timestamp_arr);
		});
	});
};

commander.getGroupDrinkTimesSince = function(chatGroupId, timestamp) {
	return new Promise(function (resolve, reject) {
		
		db.getDrinksSinceTimestamp(timestamp, chatGroupId)
		.then(function(collection) {
			var timestamp_arr = [];
			_.each(collection.models, function(model) {
				timestamp_arr.push(moment(model.get('timestamp')))
			});
			resolve(timestamp_arr);
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
