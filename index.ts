import { Bot } from "./src/bot"
import log from "./src/lib/logger"
import * as dotenv from 'dotenv'

log('info', 'Starting up . . .')

dotenv.config()

const bot = new Bot()

for (const x of ['SIGINT', 'SIGTERM']) {
  process.on(x, () => {
    log('info', 'Exiting . . .')
    bot.destroy()
  })
}

log('debug', 'Logging in . . .')
bot.login(process.env.DC_TOKEN)