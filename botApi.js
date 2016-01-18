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

botApi.sendMessage = function(chatId, text, replyMarkupObject, parseMode) {
    return new Promise(function(resolve, reject) {
        var data = {};
        data.chat_id = chatId;
        data.text = text;
        data.parse_mode = parseMode || '';

        // Is there a reply markup set?
        if (replyMarkupObject) {
            data.reply_markup = JSON.stringify(replyMarkupObject);
        }
        else {
            data.hide_keyboard = true;
        }

        // Send the message to Telegram API
        logger.log('debug', chatId + ' -> "' + text + '"');
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

botApi.setWebhook = function (webhookUrl, certificateFile) {
	
	// Delete old webhook
	request.post(cfg.tgApiUrl + '/setWebhook', { form: {url: ''}}, function (error, response, body) {
		if (error) logger.log('error', 'ERROR when trying to reach Telegram API', error);
		else {
			logger.log('debug', 'Webhook deleted! Response: ' + body);
			
			// Subscribe new webhook
			certificateFile = typeof certificateFile !== 'undefined' ? certificateFile : null;
			var opts = {
				qs: {
					url: webhookUrl
				}
			};
			if (certificateFile) {
				var content = _formatSendData('certificate', certificateFile);
				opts.formData = content.formData;
				opts.qs.certificate = content.formData;
			}
			request.post(cfg.tgApiUrl + '/setWebhook', opts, function (error, response, body) {
					if (error) logger.log('error', 'ERROR when trying to reach Telegram API', error);
					else {
						logger.log('info', 'Webhook updated successfully!')
						logger.log('debug', 'Webhook response' + body);
					}
				}
			);
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

module.exports = botApi;
