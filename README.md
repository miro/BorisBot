# BorisBot
for-the-lulz -based Telegram Bot for spinni.org. Better get started -documentation coming soon, I promise!


### Required Environment variables
* NODE_ENV - if `production`, tries to connect to database via `$DATABASE_URL`
* DATABASE_URL - connection string to database (when the `$NODE_ENV` is production)
* BORISBOT_TELEGRAM_APIKEY - API-key for your borisbot
* BORISBOT_PUBLIC_URL - URL, where this bot is located. Example `https://foo.com`




### Create development PostgreSQL database

	CREATE ROLE borisbot WITH LOGIN PASSWORD 'borisbot';
	CREATE DATABASE borisbot WITH OWNER borisbot;


