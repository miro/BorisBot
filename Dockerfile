FROM    debian:jessie

RUN     apt-get update
RUN     apt-get install -y nodejs npm

COPY    . /
RUN     npm install

EXPOSE  3000
CMD     ["nodejs", "/src/server.js"]
