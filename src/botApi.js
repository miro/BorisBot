var cfg     = require('./config');
var request = require('request');
var stream  = require('stream');
var fs      = require('fs');
var mime    = require('mime');
var path    = require('path');
var Promise = require('bluebird');
var _       = require('lodash');
var logger  = cfg.logger;

var botApi = {};

// ## Public functions
//

botApi.sendMessage = function(chatId, text, parseMode, disableWebPagePreview, replyToMessageId, replyMarkupObject) {
    // TODO: use options-object for the parameters

    return new Promise(function(resolve, reject) {
        var data = {};
        data.chat_id = chatId;
        data.text = text;
        data.parse_mode = parseMode || null;
        data.disable_web_page_preview = disableWebPagePreview || null;
        data.reply_to_message_id = replyToMessageId || null;

        // Is there a reply markup set?
        if (replyMarkupObject) {
            data.reply_markup = JSON.stringify(replyMarkupObject);
        }
        else {
            data.hide_keyboard = true;
        }
        // Send the message to Telegram API
        request.post(
            cfg.tgApiUrl + '/sendMessage',
            { form: data },
            function(err, httpResponse, body) {
                if (!err && JSON.parse(body).ok) {
                    logger.log('info', 'botApi: sending message to %s: "%s..."', chatId, text.substring(0, parseInt(text.length*0.2)));
                    resolve(body);
                } else {
                    logger.log('error', 'botApi: error when sending message: ' + err);
                    logger.debug(body);
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

botApi.sendSticker = function (chatId, sticker, options) {
    _sendFile('sticker', chatId, sticker, options);
};

botApi.sendVideo = function (chatId, video, options) {
    _sendFile('video', chatId, video, options);
};

botApi.sendPhoto = function (chatId, photo, options) {
    _sendFile('photo', chatId, photo, options);
};

botApi.setWebhook = function (webhookUrl, certificateFile) {

    // Delete old webhook
    request.post(cfg.tgApiUrl + '/setWebhook', { form: {url: ''}}, function (error, response, body) {
        if (error) logger.log('error', 'Telegram API unreachable: ', error);
        else {
            logger.log('debug', 'botApi: previous webhook deleted, response: ' + body);
            
            // Subscribe new webhook
            certificateFile = typeof certificateFile !== 'undefined' ? certificateFile : null;
            var opts = { qs: { url: webhookUrl } };
            if (certificateFile) {
                opts.formData = _formatSendData('certificate', certificateFile).formData;
            }
            request.post(cfg.tgApiUrl + '/setWebhook', opts, function (error, response, body) {
                    if (!error && JSON.parse(body).ok) {
                        logger.log('info', 'botApi: webhook updated successfully!')
                        logger.log('debug', 'botApi: webhook response' + body);
                    }
                    else {
                        logger.log('error', 'Telegram API unreachable: ', error);
                    }
            });
        }
    });
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

var _sendFile = function (type, chatId, file, options) {
    var opts = {
        qs: options || {}
    };
    var content = _formatSendData(type, file);
    opts.formData = content.formData;
    opts.qs[type] = content.file;
    opts.qs.chat_id = chatId;
    
    request.post(cfg.tgApiUrl + '/send' + _.camelCase(type), opts, function(err, httpResponse, body) {
        if (!err && JSON.parse(body).ok) {
            logger.log('info', 'botApi: sent ' + type + ' to ' + chatId);
        } else {
            var errmsg = (err) ? ('Telegram API unreachable: ' + err) : ('botApi: error when sending' + type + ': ' + JSON.parse(body).description);
            logger.log('error', errmsg);
        }
    });
};

module.exports = botApi;
