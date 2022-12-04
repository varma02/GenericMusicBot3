import { Bot } from "../bot"
import Music from "./music"

type GuildData = {
  readonly guildId: string,
  music: Music
}

export default class GuildDataMap extends Map<string, GuildData> {

  readonly bot: Bot

  constructor(bot: Bot) {
    super()
    this.bot = bot
  }

  get(key: string): GuildData {
    const sget = super.get(key)
    if (sget){
      return sget
    } else {
      const data = {
        guildId: key,
        music: new Music(key, this.bot)
      }
      this.set(key, data)
      return data
    }
  }
}