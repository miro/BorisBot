BorisBot
=========

for-the-lulz -based [Telegram Bot](https://telegram.org/blog/bot-revolution). Currently capable of keeping track of your & your Telegram group's drink consumption. Talks only Finnish at the moment.

This repository consists of NodeJS web server, which subscribes and understands events `POST`ed by [Telegram Bot API](https://core.telegram.org/bots/api)'s webhook. In order to get the events of your bot to this backend, you must expose this server to the Intertubes.

## Tech Stack
* [NodeJS](https://nodejs.org/)
* [PostgreSQL](http://www.postgresql.org/)
* ([ngrok](https://ngrok.com/) is recommended for development use)

## Integrations
* Uses [Plot.ly](https://plot.ly/) for graph generating

## Get started
**Create your Telegram Bot and run the backend for it locally**

1. Clone this repository and run `npm install`
2. Create local database (see instructions below) 
3. Create your own bot via Telegram's [@BotFather](https://telegram.me/botfather)
4. Install ngrok, set it running to port 3000 with command `ngrok 3000`
5. Configure required environment variables (see instructions below), especially these:
  * `BORISBOT_PUBLIC_URL`: this is the URL where from Telegram tries to contact your bot. Set this to the <x>.ngrok.com address where your ngrok tunnel is located
  * `BORISBOT_TELEGRAM_APIKEY`: this is the API-token you can retrieve via @BotFather
6. Start the server by running `npm start`

**If everything went well, you should see the following as an output:**

    BorisBot backend started at port 3000
    I Am <your bot name> / <@your_bot_username>
    Webhook updated successfully!

=======

### Required Environment variables
* `BORISBOT_TELEGRAM_APIKEY` - API-key for your borisbot. You get this from the @BotFather
* `BORISBOT_PUBLIC_URL` - URL, where this bot backend is located. Example `https://foo.com`
* `BORISBOT_PLOTLY_USERNAME` - your username to Plot.ly, used by graph generating functions
* `BORISBOT_PLOTLY_APIKEY` - ^
* `BORISBOT_WEBCAM_URL` - URL, where a photo from a webcam is located

For production environments add also these: 
* `NODE_ENV` - if `production`, tries to connect to database via `$DATABASE_URL`. (This is required only on prod environment)
* `DATABASE_URL` - connection string to database (when the `$NODE_ENV` is production)



### Create development PostgreSQL database

	CREATE ROLE borisbot WITH LOGIN PASSWORD 'borisbot';
	CREATE DATABASE borisbot WITH OWNER borisbot;


=======

## Acknowledgements
This project is a grateful recipient of the [Futurice Open Source sponsorship program](http://futurice.com/blog/sponsoring-free-time-open-source-activities). ♥

