import { Bot } from "./src/bot"
import log from "./src/lib/logger"
import * as dotenv from 'dotenv'

dotenv.config()

const bot = new Bot()

for ( const x of ['SIGINT', 'SIGTERM', 'SIGKILL']) {
  process.once(x, () => {
    log('info', 'Exiting . . .')
    bot.destroy()
  })
}

log('info', 'Logging in . . .')
bot.login(process.env.DC_TOKEN)