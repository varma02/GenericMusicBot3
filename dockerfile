FROM node:20-alpine

# Install nessessary build tools
RUN apk add --no-cache build-base libtool autoconf automake cmake

# Install python/pip
ENV PYTHONUNBUFFERED=1
RUN apk add --update --no-cache python3 && ln -sf python3 /usr/bin/python
RUN python3 -m ensurepip
RUN pip3 install --no-cache --upgrade pip setuptools

#Install non-javascript dependencies
RUN pip3 install --no-cache --upgrade yt-dlp
RUN apk add --update --no-cache ffmpeg

# Set up the project directory and install dependencies
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .

CMD ["npx", "ts-node", "./src/index.ts"]