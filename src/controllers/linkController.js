'use strict'
var Promise             = require('bluebird');
var _                   = require('lodash');

var cfg                 = require('../config');
var logger              = cfg.logger;
var LinkModel           = require('../schema').models.Link;
var botApi              = require('../botApi');
var groupController     = require('./groupController');


const URL_REGEX = /[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;

var controller = {};


// # "Main" function
// Processes event received from Telegram
controller.process = function processEvent(event) {
    if (!event.isFromGroup) {
        // if you want to spam me via links as a private message, I don't mind
        return Promise.resolve();
    }

    const rawInput = event.rawInput.toLowerCase();
    const link = controller.findLink(rawInput);

    if (!link) {
        return Promise.resolve();
    }

    // -> event has a link!
    logger.debug('Link to ' + link + ' found from event payload');

    Promise.resolve()
        .then(() => groupController.addIfNonexistent(event))
        .then(groupModel => LinkModel.where({
                url: link,
                telegram_group_id: event.chatGroupId
            }).fetch()
        )
        .then(existingLink => {
            if (existingLink) {
                logger.debug('Old link posted:', link);

                // Update link count
                existingLink
                    .set('times_linked', existingLink.get('times_linked') + 1)
                    .save();

                // Be annoying to the user who linked this
                punishFromOldLink(existingLink, event);
            }
            else {
                return controller.addLink(link, event);
            }
        });
};


// Finds the FIRST link from inputString using URL_REGEX.
// If the link has www. -prefix, it will be dropped
controller.findLink = function(inputString) {
    let regexResult = inputString.match(URL_REGEX);
    let url = regexResult ? regexResult[0] : null;

    if (url) {
        return url.split('www.').pop();
    } else {
        return null;
    }
};


controller.addLink = function(url, event) {
    return LinkModel.forge({
        url,
        original_link_message_id: event.eventId,
        telegram_group_id: event.chatGroupId,
        linker_telegram_id: event.userId
    }).save();
};


function punishFromOldLink(linkModel, event) {
    const timesPosted = linkModel.get('times_linked');

    // This could be funnier
    botApi.sendMessage({
        chat_id: event.chatGroupId,
        text: 'W, postattu ' + timesPosted + ' kertaa',
        reply_to_message_id: event.eventId
    });
}


module.exports = controller;
