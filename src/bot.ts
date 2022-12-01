import { Client } from "discord.js"
import log from './lib/logger'

export class Bot extends Client {
  

  constructor(){
    log('debug', 'Running bot constructor . . .')
    super({
      intents: [
        "GUILDS", "GUILD_MEMBERS", "GUILD_VOICE_STATES"
      ],
      presence: {status: 'idle', activities: [{name:'Starting up...', type: 'PLAYING'}]},
    })

    this.on('ready', async (client) => {
      log('info', `Logged in as ${client.user.username}`)
      client.user.setPresence({status:'online', activities: [{type:'LISTENING', name:'/help'}]})
    })
  }
}