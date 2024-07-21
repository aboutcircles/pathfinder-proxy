FROM node:latest
LABEL org.opencontainers.image.source=https://github.com/aboutcircles/pathfinder-proxy

COPY . /usr/pathfinder-proxy
WORKDIR /usr/pathfinder-proxy

RUN npm i
RUN npx tsc

WORKDIR /usr/pathfinder-proxy/dist

CMD ["node", "main.js"]
