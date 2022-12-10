import { ApplicationCommandDataResolvable, Client } from "discord.js"
import { readdirSync } from "fs"
import { join as pathjoin } from "path"
import { ICommand } from "./lib/command"
import GuildDataMap from "./lib/guilddata"
import log from './lib/logger'

export class Bot extends Client {
  
  private commands = new Map<string, ICommand>()
  public guildData: GuildDataMap

  constructor(){
    log('debug', 'Running bot constructor . . .')
    super({
      intents: [
        "GUILDS", "GUILD_MEMBERS", "GUILD_VOICE_STATES"
      ],
      presence: {status: 'idle', activities: [{name:'Starting up...', type: 'PLAYING'}]},
    })

    this.guildData = new GuildDataMap(this)

    // Command loader
    const cmdPath = pathjoin(__dirname, 'cmd')
    const cmdDir = readdirSync(cmdPath)
    for (const cmdFile of cmdDir) {
      const cmd: ICommand = require(`${cmdPath}/${cmdFile}`).default
      this.commands.set(cmd.name, cmd)
    }
    
    this.on('ready', async (client) => {

      // Register commands
      if (process.env.DC_REGISTER == "1") {
        log('debug', 'Updating commands . . .')
        await this.application!.commands.set([...this.commands.values()] as unknown as ApplicationCommandDataResolvable[])
      }

      log('info', `Logged in as ${client.user.username}`)
      client.user.setPresence({status:'online', activities: [{type:'LISTENING', name:'Biden'}]})
    })

    this.on("guildDelete", (guild) => {
      if (this.guildData.has(guild.id)) {
        this.guildData.get(guild.id).music.destroy()
        this.guildData.delete(guild.id)
      }
    })

    this.on('interactionCreate', (interaction) => {
      if (interaction.isCommand()) {
        const cmd = this.commands.get(interaction.commandName)
        if (cmd) {
          cmd.exec(this, interaction)
          .then(
            _ => log('debug', `Command '${cmd.name}' executed successfuly.`),
            reason => log('warn', `Command '${cmd.name}' failed with reason:\n\t${reason}`)
          )
        }
      }
    })
  }

  async destroy() {
    for (const data of this.guildData) {
      await data[1].music.destroy()
    }
    super.destroy()
  }
}