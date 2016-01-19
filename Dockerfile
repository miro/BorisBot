FROM    debian:jessie

RUN     apt-get update
RUN     apt-get install -y nodejs npm

COPY    package.json /src/package.json
RUN     cd /src; npm install

COPY    . /src

EXPOSE  3000
CMD     ["nodejs", "/src/server.js"]
