var cfg             = require('./config');
var request         = require('request');
var stream          = require('stream');
var fs              = require('fs');
var mime            = require('mime');
var path            = require('path');
var Promise         = require('bluebird');
var logger          = cfg.logger;

var botApi = {};

// ## Public functions
//

botApi.sendMessage = function(chatId, text, replyMarkupObject) {
    return new Promise(function(resolve, reject) {
        var data = {};
        data.chat_id = chatId;
        data.text = text;

        // Is there a reply markup set?
        if (replyMarkupObject) {
            data.reply_markup = JSON.stringify(replyMarkupObject);
        }
        else {
            data.hide_keyboard = true;
        }

        // Send the message to Telegram API
        logger.log('info', chatId + ' -> "' + text + '"');
        request.post(
            cfg.tgApiUrl + '/sendMessage',
            { form: data },
            function(err, httpResponse, body) {
                if (!err) {
                    resolve(body);
                } else {
                    resolve(err);
                }
            }
        );
    });
};

botApi.sendAction = function (chatId, action) {
    request.post(cfg.tgApiUrl + '/sendChatAction', {
        form: {
            chat_id: chatId,
            action: action
        }
    });
};

botApi.sendPhoto = function (chatId, photo, options) {
    var opts = {
        qs: options || {}
    };
    opts.qs.chat_id = chatId;
    var content = _formatSendData('photo', photo);

    opts.formData = content.formData;
    opts.qs.photo = content.file;
    request.post(cfg.tgApiUrl + '/sendPhoto', opts);
};



// ## Internal functions
//

var _formatSendData = function (type, data) {
    var formData = {};
    var fileName;
    var fileId = data;

    if (data instanceof stream.Stream) {
        fileName = path.basename(data.path);

        formData[type] = {
            value: data,
            options: {
                filename: fileName,
                contentType: mime.lookup(fileName)
            }
        };
    }
    else if (fs.existsSync(data)) {
        fileName = path.basename(data);

        formData[type] = {
            value: fs.createReadStream(data),
            options: {
                filename: fileName,
                contentType: mime.lookup(fileName)
            }
        };
    }

    return {
        formData: formData,
        file: fileId
    };
};

module.exports = botApi;
