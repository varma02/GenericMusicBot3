import { H } from "@highlight-run/node"
import { Bot } from "./src/bot"

const dotenv = require("dotenv")
dotenv.config()

try {
	console.log("Initializing highlight...")
	// H.init({projectID: process.env.H_PID})
} catch {
	console.warn("Highlight init failed.")
}

console.log("Starting up...")
const bot = new Bot()

for (const x of ['SIGINT', 'SIGTERM']) {
  process.on(x, () => {
    console.log(`Got ${x}, exiting...`)
    bot.destroy()
		H.stop()
  })
}

console.log("Logging in...")
bot.login(process.env.DC_TOKEN)