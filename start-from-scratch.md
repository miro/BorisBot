Required software for starting local development environment
============================================================


# For OSX

**Runtime:** nodejs
Usage of [nvm](https://github.com/creationix/nvm) is recommended. If that is not available for your OS version, download [directly from nodejs.org](https://nodejs.org/en/).

(npm [node package manager] is also required, but it comes bundled with nodejs installation)


**Version control:** Git 
I recommend installing it via [Homebrew](http://brew.sh/). If usage of it is not possible, download it from [here](https://git-scm.com/download/mac)


**Database:** Postgresql
Easiest way to install this is from [here](http://postgresapp.com/)


**Tunnel form Internet to your computer:** ngrok
To allow Telegram Bot API to relay the messages sent to your bot to your actual bot implementation, the server running on your local computer must be exposed to the Internet. 

One of the easiest ways of doing so is using ngrok. Download and install it from [ngrok.com](https://ngrok.com/)

