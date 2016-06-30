'use strict';
var Promise             = require('bluebird');
var GroupModel          = require('../schema').models.Group;

var controller = {};

// Creates the group if it doesn't exist already
controller.addIfNonexistent = function(event) {
    const groupData = {
        name: event.chatGroupTitle,
        telegram_group_id: event.chatGroupId
    };

    return GroupModel
        .forge(groupData)
        .fetch()
        .then(result => {
            if (result) {
                return Promise.resolve(result);
            } else {
                return GroupModel
                    .forge(groupData)
                    .save();
            }
        });
};

module.exports = controller;
