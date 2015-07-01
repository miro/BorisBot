// This module keeps track of already handled messages. Since Telegram APi might
// re-send on startup the message several times, some commands might create duplicates to DB etc

module.exports = {

    historySize: 15, // how many message id's will be stored
    history: [], // array of previous messages
    inProgress: {}, // messages currently in "progress"


    // marks the message to be "in progress", returns false if this message
    // is already in progress or has already been parsed
    startProcessingMsg: function(messageId) {
        if (this.history.indexOf(messageId) >= 0) {
            // this message has already been parsed
            return false;
        }
        else if (this.inProgress[messageId]) {
            // message is already in progress, abort
            return false;
        }
        else {
            this.inProgress[messageId] = true;
            return true;
        }
    },

    messageProcessed: function(messageId) {
        this.history.push(messageId);

        delete this.inProgress[messageId];

        if (this.history.length > this.historySize) {
            this.history.shift();
        }

        console.log(this.history);
    }
};
