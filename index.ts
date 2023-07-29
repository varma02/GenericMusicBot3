import { Bot } from "./src/bot"

console.log("Starting up...")

const dotenv = require("dotenv")
dotenv.config()

const bot = new Bot()

for (const x of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.once(x, () => {
    console.log(`Got ${x}, exiting...`)
    bot.destroy()
  })
}

console.log("Logging in...")
bot.login(process.env.DC_TOKEN)