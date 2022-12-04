import { MessageEmbed } from "discord.js"
import { ICommand } from "../lib/command"

export default {
  type: "CHAT_INPUT",
  name: "ping",
  description: "Replies with the bot's latency",
  
  async exec(bot, interaction) {
    await interaction.reply({embeds:[new MessageEmbed({
      fields: [
        { name: "💓 Hearthbeat", value: `   ${bot.ws.ping}ms`, inline: true },
        { name: "⏱ Latency", value: `   ${Date.now() - interaction.createdTimestamp}ms`, inline: true }
      ]
    })]})
  },
} as ICommand