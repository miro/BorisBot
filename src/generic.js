var utils       = require('./utils');
var cfg         = require('./config');
var botApi      = require('./botApi');
var db          = require('./database');
var msgs        = require('./messageHistory');
var logger      = require('./logger');

var Promise     = require('bluebird');
var _           = require('lodash');
var getPixels   = require('get-pixels');
var fs          = require('fs');
var emoji       = require('node-emoji');
var request     = require('request');
var iconv       = require('iconv-lite');
var cheerio     = require('cheerio');

var generic = {};

generic.webcam = function(userId, chatGroupId, eventIsFromGroup) {
    return new Promise(function(resolve,reject) {
        if (_.isUndefined(cfg.webcamURL)) {
            botApi.sendMessage({chat_id: userId, text: 'Botille ei ole määritetty webcamin osoitetta!'});
            return resolve();
        }

        db.getUserById(userId)
        .then(function(user) {

            if (_.isNull(user)) {
                botApi.sendMessage({chat_id: userId, text: 'Sinun täytyy /luotunnus ja käydä /moro ´ttamassa SpänniMobissa saadaksesi /webcam toimimaan!'});
                return resolve();
            }

            var groupId = (eventIsFromGroup) ? chatGroupId : user.get('primaryGroupId');
            var targetId = (eventIsFromGroup) ? chatGroupId : userId;

            // check if the command came from an allowedId
            var msgFromAllowedId = false;
            for (var group in cfg.allowedGroups) {
                if (groupId === cfg.allowedGroups[group]) {
                    msgFromAllowedId = true;
                }
            }

            if (!msgFromAllowedId) {
                botApi.sendMessage({chat_id: targetId, text: 'Sinun täytyy käydä /moro ´ttamassa SpänniMobissa saadaksesi /webcam-komennon toimimaan priva-chatissa!'});
                resolve();
            }
            else {
                // -> If we get here, we are good to go!
                botApi.sendAction({chat_id: targetId, action: 'upload_photo'});
                utils.downloadFile(cfg.webcamURL, cfg.webcamDirectory + 'webcam.jpg')
                .then(function() {
                    if (!eventIsFromGroup) {
                        botApi.sendPhoto({chat_id: targetId, file: cfg.webcamDirectory + 'webcam.jpg'});
                        resolve();
                    } else {
                        calculateWebcamLightness_()
                        .then(threshold => {
                            if (threshold < 40) {
                                botApi.sendMessage({chat_id: targetId, text: '_"I only see a vast emptiness."_', parse_mode: 'Markdown'});
                            } else {
                                botApi.sendPhoto({chat_id: targetId, file: cfg.webcamDirectory + 'webcam.jpg'});
                            }
                            resolve();
                        })
                        .catch(err=> {
                            logger.log('error', 'Error on threshold checking, sending photo anyway');
                            botApi.sendPhoto({chat_id: targetId, file: (cfg.webcamDirectory + 'webcam.jpg')});
                            resolve();
                        })
                    }
                });
            }
        });
    });
};

generic.checkWebcamLightness = function() {
    return new Promise(function(resolve,reject) {
        if (_.isUndefined(cfg.webcamURL)) {
            logger.log('warn', 'Unable to calculate clubroom lightness, webcamURL is undefined');
            return resolve();
        }
        // Don't use this feature if environment is development
        if (cfg.env === 'development') return resolve();

        utils.downloadFile(cfg.webcamURL, cfg.webcamDirectory + 'webcam.jpg')
        .then(function() {
            calculateWebcamLightness_()
            .then(threshold => {

                if (threshold > 80) {   // TODO: Explore more specific thresholds

                    // Lights on, check if they were already on
                    if (!generic.webcamLightsOn) {
                        logger.log('info', 'Webcam detected lights at clubroom, threshold: ' + threshold);
                        var bulb = emoji.get(':bulb:');
                        botApi.sendMessage({chat_id: cfg.allowedGroups.mainChatId, text: bulb+bulb+bulb});
                        generic.webcamLightsOn = true;
                    }
                    resolve();
                } else {

                    // Lights off, reset status
                    generic.webcamLightsOn = false;
                    resolve();
                }
            })
            .catch(err => logger.log('error', 'Error when calculating webcam pixels: %s', err));
        });
    });
}

// Assume that lights are on, this prevents chat spamming if app shuts down
generic.webcamLightsOn = true;

generic.commandCount = function(userId) {
    return new Promise(function(resolve, reject) {
        botApi.sendMessage({chat_id: userId, text: 'Viestejä hanskattu ' + msgs.getEventCount()});
        resolve();
    });
};

generic.help = function(userId) {

    botApi.sendMessage({
        chat_id: userId,
        text: 'Moro! Olen Spinnin oma Telegram-botti, näin kavereiden kesken BorisBot. ' +
        'Pääset alkuun kirjoittamalla minulle /luotunnus ja käy sen jälkeen /moro ´ttamassa ' +
        'Spinnin kanavalla!\n' +
        'Minulta voit myös kysyä seuraavia toimintoja:\n' +
        '\n/graafi - Tutkin alkoholinkäyttöäsi ja luon niistä kauniin kuvaajan. ' +
        'Jos annat komennon perään positiivisen numeron, rajaan kuvaajan ' +
        'leveyden olemaan kyseisen numeron verran päiviä.\n' +
        '\n/kahvi - Kirjaan nauttimasi kupillisen tietokantaani.\n' +
        '\n/kalja - Kirjaan nauttimasi ohrapirtelön tietokantaani.\n' +
        '\n/kippis - Kirjaan kilistelemäsi juoman ylös ja käytän sitä myöhemmin erilaisiin toimintoihini.\n' +
        '\n/kahvit - Printaan sinulle ryhmäsi tämänhetkisen kahvitilanteen.\n' +
        '\n/kaljoja - Näytän kaikki nautitut alkoholilliset juomat.\n' +
        '\n/kumpi `<vaihtoehto 1>` `<vaihtoehto 2>` - Päätän tärkeät valinnat puolestasi.\n' +
        '\n/luomeemi - Luon haluamasi meemin haluamillasi teksteillä. ' +
        'Tuetut meemit saat tietoosi /meemit komennolla.\n' +
        '\n/luotunnus - Kirjoitan tietosi muistiin, jotta voin käyttää niitä\n' +
        'myöhemmin. Tarvitsen komennon perään myös painosi ja sukupuolesi' +
        'lupaan että tietoja ei käytetä kaupallisiin tarkoituksiin).\n' +
        '\n/meemit - Listaan meemi-generaattorissa tuetut meemit.\n' +
        '\n/moro - Yhdistän käyttäjäsi ryhmään, mistä tämä komento lähetettiin. ' +
        'Tämän avulla voin yhdistää tekemäsi kippikset ryhmän tilastoihin.\n' +
        '\n/otinko - Muistutan sinua juomista, jotka olet ottanut viimeisen 48 tunnin aikana.\n' +
        '\n/poistatunnus - Unohdan tunnuksesi tietokannastani.\n' +
        '\n/promille - Tulostan sinun henkilökohtaisen promilletasosi. \n' +
        'HUOM: lasken promillesi korkeammassa ulottuvuudessa, joten älä ' +
        'luota tulosten olevan täysin realistisia.\n' +
        '\n/promillet - Tulostan ryhmän tämänhetkiset promilletasot.\n' +
        '\n/puhelin - Tulostan Spinnin puhelinnumeron.\n' +
        '\n/raflat - Tulostan kampuksen ravintoloiden ruokalistat.\n' +
        '\n/tee - Kirjaan nauttimasi kupillisen tietokantaani.\n' +
        '\n/tili - Lähetän sinulle Spinnin tilinumeron.\n' +
        '\n/viina `<senttilitrat>` `<alkoholi%>` - Merkkaan nauttimasi viina-annoksen.\n' +
        '\n/virvokkeita - Näytän kaikki nautitut alkoholittomat juomat.\n' +
        '\n/webcam - Lähetän tuoreen kuvan Spinnin kerhohuoneelta.\n' +
        '\n!expl <avain> - Annan sanallesi selityksen, jos löydän sellaisen.\n' +
        '\n!add `<avain>` `<selite>` - Annan sanalle uuden selityksen.\n' +
        '\n!remove `<avain>` - Poistan selitteen, jos se on sinun hallussasi.\n' +
        '\n!list - Listaan kaikki saatavilla olevat selitettävät sanat.\n' +
        '\n!g <hakusanat> - Haen hakusanoja vastaavan kuvan internetin syövereistä.',
        parse_mode: 'Markdown'});
};

generic.whichOne = function(targetId, userParams) {
    const SEPARATION_KEYWORD = 'vai';

    var paramParts = userParams.split(' ');

    var alternatives = [];
    if (paramParts.length === 2) {
        // there were only two parts -> pick from them
        alternatives = alternatives.concat(paramParts);
    } else if (userParams.split(SEPARATION_KEYWORD).length > 1) {
        alternatives = alternatives.concat(userParams.split(SEPARATION_KEYWORD));
    } else {
        alternatives = alternatives.concat(userParams.split(' '));
    }

    // Did we get something to choose from?
    if (alternatives.length <= 1) {
        botApi.sendMessage({
            chat_id: targetId,
            text: 'Anna ainakin kaksi asiaa mistä arpoa!'
        });

        return;
    }

    // -> all good, pick a winner!

    var outcome;
    var dice = Math.floor(Math.random() * 100);
    if (dice === 99) {
        outcome = 'Molemmat!';
    } else if (dice === 98) {
        outcome = 'Ei kumpikaan!';
    } else {
        outcome = _.sample(alternatives);
    }

    botApi.sendMessage({ chat_id: targetId, text: outcome });
};

generic.justNow = function(event) {

    request({uri: 'http://www.iltalehti.fi/', encoding: null}, function(error, response, html) {
        if(!error){

            var selectors = [
                '.juurinyt > p > a',
                '#iltab_luetuimmat-kaikki1 > p > a > span:nth-child(2)'
            ];
            html = iconv.decode(new Buffer(html), "ISO-8859-1");
            var $ = cheerio.load(html);

            var output = [];
            $(selectors.join(", ")).each( function() {
                var text = $( this ).text();
                if (text != generic.lastJustNow) {
                    output.push(text)
                }
            });

            var message = _.sample(output);
            generic.lastJustNow = message;

            var pre = ((Math.random()*100 < 60) && (message.indexOf(':') === -1)) ?
                ['Voiko tämä olla tottakaan! ', 'Mitäs? ',
                'Mitä vittua! ', 'Tästä Perttekin olisi ylpeä: ',
                '..uskomatonta! ', 'Timo Soini: ', 'Kai se on pakko uskoa! ',
                'Mitähän nyt taas?! ', 'Marsaklan päiväkäsky: ', 'Näin vaikuttaa Brexit: ',
                'Lama näkyy jo ihmisten kasvoilla: ', 'Enkelihoidot suosiossa: ',
                'Uskomaton käänne puljujärven draftissa: ', 'Sote-uudistuksen laajat vaikutukset: ',
                'Tätä et uskonut lukevasi ikinä koskaan: ', 'Arvaatko mitä? ', 'Miksi / Miksi ei ',
                'Asiantuntijan raju analyysi: ', 'Mentula jyrähtää: ', 'Osti euroja, sai markkoja; Nyt marko tilittää: ',
                'Bull Mentulan treenaamiseen liittyvä vihje: ', 'Lama-Eerikin oppivuodet: ', 'Heikki Lampelakin sen tiesi: ',
                'Poliisihallituksessa kuhisee: ', 'Tarja Halosella epämiellyttävä epäily: ', 'Yllättävä fakta pieruista: ',
                'Kyrpä kovettuu kun tämän ymmärtää: ', 'Tätä et voinut aavistaa vaikka olisitkin voinut: ',
                'Lampela avaa eronsa / paluunsa taustoja: ', 'Sipilän viimeinen kikka: ', 'Nobel-voittajissa yllättävä yllätys - perustelu ontuu: ',
                'Sote-uudistuksessa käänne: ', 'Timo Soini: en mielestäni ole Hitler, koska ', 'Helleraja taas rikki: ',
                'Lähestyykö Suomea matala/korkeapaine? Pekka Pouta ennustaa: ', 'Jatkuvat vaikeudet ajoivat yrittäjän ahdinkoon: ',
                'Säätilassa kernainen muutos, johon liittyy, että ', 'Miehet ja naiset kertovat: ', 'No johan pomppas! ',
                '"Vittu" kertoi Mauri Kunnas - Syyt taustaan ovat: ', 'Uniikki tiedottaa: ', 'Tämä on fantastinen juttu: ',
                'Mi-tä?! ', 'Nainen lihotti lähes 60 kiloa yllättävän metodin avulla: ', 'Mies masturboi koirallaan - lisäksi: ',
                'Tätä et tiennyt enkelihoidoista: ', 'Oikeestikko?! ', 'Syöpää vedestä - asian tuntiat älähtävät: ',
                'Ehkä elämällä ei olekaan niin suurta merkitystä: ', 'Koru-Arvin tarinassa uusi käänne: ',
                'Tietotekniikka nurin: ', 'Tietojohtajan muistutus: ', 'Tämäkin on Jannen koodikoulusta tuttua: ',
                'Ylikomisarion viimeinen toive: ', 'Oispa tosiaan näin, että ', 'Vanha kansa ennusti tämän: ',
                'Yleinen loruhan sen jo tiesi: ', 'Jos mennään näillä: ', 'Eiku sano vaan: '] : [''];

            var post = ((Math.random()*100 < 60) && (message.indexOf('-') === -1)) ?
                [' - humalassa', ' - pajareissa',
                ' saatana', ' - reaktio oli uskomaton!', ' iltaa',
                ' - luona armopöydän', ' - eipä siinä', ' - mutta missä oli Puljujärvi?!',
                ' - eipä siinä', ' - viimeistään huomenna', '- mieluiten nyt', ' - Töölössä',
                ' - tää herättää kysymyksiä', ' - loogista? Ei välttämättä.', ' - leprassa',
                ' - kera huorien', ' - kaupankäynti saattaa vaikeutua', ' - ihmisiä saattaa kuolla',
                ' - Brexit syyllinen?', ' - myös Trump on tätä mieltä.', ' - paikalliset hankkivat tilalle uuden',
                ' - suunnittelijana oma äiti', ' - oikeasti', ' - tulikin perseestä vene', ' - siinä lauantain perinteet!',
                ' - kas sepä oiva kikka!', ' - selvinpäin', ' - vahingossa', ' - tee testi!', ' - luultavasti tarkoituksella',
                ' - voisiko tämä olla mahdollista myös Suomessa?', ' - taustalla varsin outo syy', ' - raiskasi saatana',
                ' - oikeustoimiakin väläytelty', ' - rakastaja uunissa?', ' - paljastui huijaukseksi'] : [''];

            botApi.sendMessage({
                chat_id: event.targetId,
                text: '<b>JUURI NYT </b>' + _.sample(pre) + message + _.sample(post),
                parse_mode: 'HTML'
            });

        } else {
            logger.error('Error when fetching "Iltalehti": ' + error);
        }
    });
}

// Admin commands
//

generic.adminhelp = function(userId) {
    if (utils.userIsAdmin(userId)) {
        botApi.sendMessage({
            chat_id: userId,
            text:   '/botgrouptalk `[text]` - Puhu bottina päächattiin.\n' +
                    '/botgroupprivatetalk `[text]` - Puhu bottina kaikille päächattiin rekisteröityneille käyttäjille privassa.\n' +
                    '/botprivatetalk `[id or username]` `[text]` - Puhu bottina käyttäjälle privassa.\n' +
                    '/logs - Printtaa lokit.\n' +
                    '/ban `<id tai username>` - Banni käyttäjä.\n' +
                    '/unban `<id tai username>` - Unbanni käyttäjä.',
            parse_mode: 'Markdown'
        })
    } else {
        botApi.sendMessage({chat_id: userId, text: 'Käyttö evätty.'});
    }
};

generic.sendLog= function(userId, userParams) {
    return new Promise(function(resolve, reject) {
        if (utils.userIsAdmin(userId)) {
            botApi.sendAction({chat_id: userId, action: 'typing'});
            fs.readFile(cfg.logLocation, function (err,data) {
                if (err) {
                    botApi.sendMessage({chat_id: userId, text: 'Lokia ei voitu avata! ' + err});
                    resolve();
                } else {
                    var linesToRead = parseInt(userParams) || 50;
                    var lines = data.toString('utf-8').split('\n');
                    var lastLine = (lines.length - linesToRead > 0) ? lines.length - linesToRead : 0;
                    var message = '';
                    for(var i=lastLine; i<lines.length; i+=1) {
                        message += lines[i];
                        message += '\n';
                    }
                    botApi.sendMessage({chat_id: userId, text: message, disable_web_page_preview: true });
                    resolve();
                }
            });
        } else {
            botApi.sendMessage({chat_id: userId, text: 'Käyttö evätty.'});
            resolve();
        }
    });
};

generic.talkAsBotToUser = function(userId, userParams) {
    return new Promise(function(resolve,reject) {
        if (utils.userIsAdmin(userId)) {
            var msg = _.drop(userParams.split(' ')).join(' ');
            var targetUser = (userParams.split(' ')).shift();
            parseId_(targetUser)
            .then(id => {
                if (_.isNull(id)) {
                    botApi.sendMessage({chat_id: userId, text: 'Henkilöä ' + targetUser + ' ei löytynt'});
                    resolve();
                } else {
                    botApi.sendMessage({chat_id: id, text: msg});
                    resolve();
                }
            });
        } else {
            botApi.sendMessage({chat_id: userId, text: 'Käyttö evätty.'});
            resolve();
        }
    });
};

generic.talkAsBotToMainGroup = function(userId, msg) {
    // lazy version which talks to "main group" as a bot
    // TODO: convert this with a more generic one after we have info about groups
    // on the database
    if (utils.userIsAdmin(userId)) {
        botApi.sendMessage({chat_id: cfg.allowedGroups.mainChatId, text: msg});
    }
    else {
        botApi.sendMessage({chat_id: userId, text: 'Käyttö evätty.'});
    }
};

generic.talkAsBotToUsersInMainGroup = function(userId, msg) {
    return new Promise(function(resolve,reject) {
        if (utils.userIsAdmin(userId)) {
            db.getUsersByPrimaryGroupId(cfg.allowedGroups.mainChatId)
            .then(function(collection) {
                _.each(collection.models, function(user) {
                    botApi.sendMessage({chat_id: user.get('telegramId'), text: msg});
                });
                resolve();
            });
        } else {
            botApi.sendMessage({chat_id: userId, text: 'Käyttö evätty.'});
            resolve();
        }
    });
};

generic.banUser = function(userId, userParams) {
    return new Promise(function(resolve,reject) {
        if (utils.userIsAdmin(userId)) {
            var splitParams = userParams.split(' ');
            parseId_(splitParams[0])
            .then(id => {
                if (_.isNull(id)) {
                    botApi.sendMessage({chat_id: userId, text: 'Henkilöä "' + splitParams[0] + '" ei löytynyt.'});
                    resolve();
                } else {
                    if (!_.includes(cfg.ignoredUsers, id)) {
                        cfg.ignoredUsers.push(id);
                        botApi.sendMessage({chat_id: userId, text: 'Banned id: ' + id})
                        resolve();
                    } else {
                        botapi.sendMessage({chat_id: userId, text: 'Id ' + id + ' on jo bannittu.'});
                        resolve();
                    }
                }
            });
        } else {
            botApi.sendMessage({chat_id: userId, text: 'Käyttö evätty.'});
            resolve();
        }
    });
}

generic.unbanUser = function(userId, userParams) {
    return new Promise(function(resolve,reject) {
        if (utils.userIsAdmin(userId)) {
            var splitParams = userParams.split(' ');
            parseId_(splitParams[0])
            .then(id => {
                if (_.isNull(id)) {
                    botApi.sendMessage({chat_id: userId, text: 'Henkilöä "' + splitParams[0] + '"" ei löytynyt.'});
                    resolve();
                } else {
                    if (_.includes(cfg.ignoredUsers, id)) {
                        _.pull(cfg.ignoredUsers, id);
                        botApi.sendMessage({chat_id: userId, text: 'Unbanned id: ' + id})
                        resolve();
                    } else {
                        botapi.sendMessage({chat_id: userId, text: 'Henkilöä ' + id + ' ei ole bannittu.'});
                        resolve();
                    }
                }
            });
        } else {
            botApi.sendMessage({chat_id: userId, text: 'Käyttö evätty.'});
            resolve();
        }
    });
}

var calculateWebcamLightness_ = function() {
    return new Promise(function(resolve, reject) {
        getPixels(cfg.webcamDirectory + 'webcam.jpg', function(err,pixels) {
            if (err) {
                return reject(err);
            }

            // Notice only every n pixel
            var n = 4;

            // Calculate sum of averages
            var sum = 0;
            var x = 0;
            for(var i=0; i<pixels.shape[0]; i+=n) {
                for(var j=0; j<pixels.shape[1]; ++j) {
                    var colorValue = 0;
                    for(var k=0; k<3; ++k) {
                        colorValue += parseInt(pixels.get(i,j,k));
                    };
                    sum += Math.round(colorValue / 3);
                    ++x;
                };
            };

            // Return whole average
            var threshold = Math.round(sum / x);
            logger.log('debug', 'Webcam lightness value: %d', threshold);
            return resolve(threshold);
        });
    });
}

var parseId_ = function(targetUser) {
    return new Promise(function(resolve,reject) {
        if (!_.isNaN(_.parseInt(targetUser))) {
            resolve(targetUser);
        } else {
             db.getUserByName(targetUser)
            .then(model => {
                if (_.isNull(model)) {
                    resolve(null);
                } else {
                    resolve(model.get('telegramId'));
                }
            });
        }
    });
}

module.exports = generic;
