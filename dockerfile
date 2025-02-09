FROM oven/bun:alpine

# Install nessessary tools
RUN apk add --no-cache build-base libtool autoconf automake cmake curl

#Install non-javascript dependencies
# RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ~/.local/bin/yt-dlp
# RUN chmod +x ~/.local/bin/yt-dlp
RUN apk add --update --no-cache ffmpeg yt-dlp libsodium

# Set up the project directory and install dependencies
WORKDIR /app
COPY package.json .
RUN bun install
COPY . .

CMD ["bun", "run", "./index.ts"]