<center><h1>GenericMusicBot3</h1></center>
A simple discord music bot created for playing any content that yt-dlp can download, since no other mainstream bot can do it. It is intended to be deployed in ideally 10 Discord servers or less.

## Deploying
There are two ways to deploy this bot, cloning the repo or with Docker. I recommend installing on Linux or using the Docker method since the sodium NPM package is hard to get installed on Windows.

### Creating the bot
You first need to create a bot on the [Discord developer portal](https://discord.com/developers/).
1. Log in to the developer portal with your discord account
2. Click on `New Application` in the top right
3. Give your app a name (this is not your bot's name) and click create
4. Go to the `OAuth2` tab on the left, the click on `URL Generator`
5. Select `bot` and `application.commands`
6. Scroll down and select `Administrator`
7. (OPTIONAL) If you don't want to give the bot admin permissions, you need to select the following options: `Send Messages`, `Send Messages in Threads`, `Embed Links`, `Attach Files`, `Add Reactions`, `Connect`, `Speak` and `Use Voice Activity`
8. Scroll to the bottom and copy the generated URL
9. Paste it into a new tab and invite the bot to the server you want
10. Go back to the developer portal and click on the `Bot` tab on the left
11. Click `Reset Token` and copy it, you will be needing it later
12. Select an install method and follow the instructions (recommended: Docker)

### Docker
1. Make sure that Docker is installed on your system by running `docker -v`

#### Using prebuilt image
2. Set the `DC_TOKEN` enviornment variable to your token
3. If you are running for the first time you should set the `DC_REGISTER` enviornment variable to 1 to register the slash commands
4. Run the command and enjoy 😎
```
docker run -d --env DC_TOKEN=<Your token here> --env DC_REGISTER=1 ghcr.io/varma02/generic-music-bot3:latest
```

#### Building the image
2. Clone the repository on your system
```
git clone https://github.com/varma02/GenericMusicBot3.git
```
3. Build the Docker image (you have to be in the cloned directory)
```
docker build -t mybot .
```
4. Create and run the container (replace the token with yours)
```
docker run -d --env DC_TOKEN=<Your token here> --env DC_REGISTER=1 mybot
```

### Linux
1. Install Node 19 or above (recommended via [Node Version Manager](https://github.com/nvm-sh/nvm))
2. Install yt-dlp and ffmpeg
```
Debian/Ubuntu:
sudo apt update
sudo apt install python3 ffmpeg

CentOS/RHEL/Fedora:
sudo dnf install python3 ffmpeg

python3 -m pip install -U yt-dlp
```
3. Clone the repository on your system
```
git clone https://github.com/varma02/GenericMusicBot3.git
```
4. Create a `.env` and add your token
5. Run `npm install` to install dependencies
6. Run `npm start` 

---
GenericMusicBot3 © 2023 by Váradi Marcell (varma02@Github) is licensed under [CC BY-NC-SA 4.0](http://creativecommons.org/licenses/by-nc-sa/4.0/)