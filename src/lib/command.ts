import { 
  ApplicationCommandOptionData, 
  ApplicationCommandType, 
  CommandInteraction ,
  ApplicationCommandData
} from "discord.js"
import { Bot } from "../bot"

export type ICommand = {
  name: string,
  description: string,
  type: ApplicationCommandType,
  options?: ApplicationCommandOptionData[],
  exec: (bot: Bot, interaction: CommandInteraction) => Promise<void>,
}

