FROM ghcr.io/puppeteer/puppeteer:22.6.0

USER root

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

CMD [ "npm", "start" ]
