FROM    debian:jessie

# Replace shell with bash so we can source files
RUN     rm /bin/sh && ln -s /bin/bash /bin/sh

# Set debconf to run non-interactively
RUN     echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections

# Install dependencies
RUN     apt-get update && apt-get install -y -q --no-install-recommends \
        apt-transport-https \
        build-essential \
        ca-certificates \
        curl \
        git \
        libssl-dev \
        python \
        rsync \
        software-properties-common \
        wget \
    && rm -rf /var/lib/apt/lists/*

# Configure NodeJS
ENV     NODE_ENV production
ENV     NVM_DIR /usr/local/nvm
ENV     NODE_VERSION 6.2.2

# Install nvm with node and npm
RUN     curl https://raw.githubusercontent.com/creationix/nvm/v0.30.2/install.sh | bash \
        && source $NVM_DIR/nvm.sh \
        && nvm install $NODE_VERSION \
        && nvm alias default $NODE_VERSION \
        && nvm use default

ENV     NODE_PATH $NVM_DIR/versions/node/v$NODE_VERSION/lib/node_modules
ENV     PATH      $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

RUN     npm install pm2 -g
RUN     npm install knex -g

# Copy host directory into container and install required node_modules
COPY    . /app/
WORKDIR /app
RUN     npm install

# Trigger migration script
RUN     chmod +x ./tools/run-migrations.sh
RUN     ./tools/run-migrations.sh

# Open port 3000
EXPOSE  3000

CMD     ["pm2", "start",  "ecosystem.json", "--env", "production", "--no-daemon"]
