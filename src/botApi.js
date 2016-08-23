var cfg     = require('./config');
var request = require('superagent');
var Promise = require('bluebird');
var _       = require('lodash');
var logger  = require('./logger');

var botApi = {};

// ## Public functions
//

botApi.getMe = () => {
    request
    .get(`${cfg.tgApiUrl}/getMe`)
    .then((res, err) => _validateResponse('getMe', res, err));
};

  // chat_id [int] REQUIRED
  // text [string] REQUIRED
  // parse_mode ["Markdown" or "HTML"] OPTIONAL
  // disable_web_page_preview [boolean] OPTIONAL
  // disable_notification [boolean] OPTIONAL
  // reply_to_message_id [int] OPTIONAL
  // reply_markup [ReplyKeyboardMarkup, ReplyKeyboardHide or ForeReply] OPTIONAL
botApi.sendMessage = (options) => {

    options.hide_keyboard = (_.isUndefined(options.reply_markup));

    return (
        request
        .post(`${cfg.tgApiUrl}/sendMessage`)
        .send(options)
        .then((res, err) => _validateResponse('sendMessage', res, err))
    );
};

  // chat_id [int or string] REQUIRED
  // from_chat_id [int or string] REQUIRED
  // disable_notification [boolean] OPTIONAL
  // message_id [int] REQUIRED
botApi.forwardMessage = (options) => {
    request
    .post(`${cfg.tgApiUrl}/forwardMessage`)
    .send(options)
    .then((res, err) => _validateResponse('forwardMessage', res, err));
};

  // chat_id [int or string] REQUIRED
  // action ['typing' or 'upload_photo' or 'record_video' or
  //        'upload_video' or 'record_video' or 'upload_audio' or
  //        'upload_document' or 'find_location'] REQUIRED
botApi.sendAction = (options) => {
    request
    .post(`${cfg.tgApiUrl}/sendChatAction`)
    .send(options)
    .then((res, err) => _validateResponse('sendChatAction', res, err));
};

  // chat_id [int or string] REQUIRED
  // file [file_location or file_id] REQUIRED
  // disable_notification [boolean] OPTIONAL
  // reply_to_message_id [int] OPTIONAL
  // reply_markup [ReplyKeyboardMarkup or ReplyKeyboardHide or ForceReply] OPTIONAL
botApi.sendSticker = (options) => _sendFile('sticker', options);

  // chat_id [int or string] REQUIRED
  // file [file_location or file_id] REQUIRED
  // duration [int] OPTIONAL
  // width [int] OPTIONAL
  // height [int] OPTIONAL
  // caption [string] OPTIONAL
  // disable_notification [boolean] OPTIONAL
  // reply_to_message_id [int] OPTIONAL
  // reply_markup [ReplyKeyboardMarkup or ReplyKeyboardHide or ForceReply] OPTIONAL
botApi.sendVideo = (options) => _sendFile('video', options);


  // chat_id [int or string] REQUIRED
  // file [file_location or file_id] REQUIRED
  // caption [string] OPTIONAL
  // disable_notification [boolean] OPTIONAL
  // reply_to_message_id [int] OPTIONAL
  // reply_markup [ReplyKeyboardMarkup or ReplyKeyboardHide or ForceReply] OPTIONAL
botApi.sendPhoto = (options) => _sendFile('photo', options);

  // url [string] REQUIRED
  // certificate [file_location] OPTIONAL
botApi.setWebhook = (options) => {

    // Delete old webhook
    return request
    .post(`${cfg.tgApiUrl}/setWebhook`)
    .send({ url: '' })
    .then((res, err) => _validateResponse('setWebhook', res, err))
    .then(
        // Subscribe new webhook
        request
        .post(`${cfg.tgApiUrl}/setWebhook`)
        .set('Content-Type', 'multipart/form-data')
        .send(options)
        .attach('certificate', options.certificate)
        .then((res, err) => _validateResponse('setWebhook', res, err))
    );
};


  // file_id [string] REQUIRED
botApi.getFile = (options) => {
    request
    .post(`${cfg.tgApiUrl}/getFile`)
    .send(options)
    .then((res, err) => _validateResponse('getFile', res, err));
};

function _sendFile(type, options) {
    let req = request
    .post(`${cfg.tgApiUrl}/send${_.capitalize(type)}`)
    .send(options);

    // Check if file was location instead of ID
    if (!_.isNumber(options.file)) {
        req
        .set('Content-Type', 'multipart/form-data')
        .attach(type, options.file);
    }

    return (
      req.then((res, err) => _validateResponse(`send${_.capitalize(type)}`, res, err))
    );
}

function _validateResponse(action, res, err) {
    if (!err && res.body.ok) {
        logger.debug(`botApi: executed ${action}`);
        return Promise.resolve(res.body.result);
    } else {
        let errmsg = (err)
          ? `Telegram API unreachable: ${err}`
          : `Error from Telegram API: ${res.body.description}`;
        logger.error(errmsg);
        return Promise.reject(errmsg);
    }
}

module.exports = botApi;
