FROM ghcr.io/puppeteer/puppeteer:22.6.0

USER root

WORKDIR /app

# Copy ONLY package configuration files first
COPY package*.json ./
RUN npm install

# This explicitly copies ONLY your valid code files, leaving the bad image file behind!
COPY index.js ./
COPY config.js ./
COPY handler.js ./

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

CMD ["node", "index.js"]
