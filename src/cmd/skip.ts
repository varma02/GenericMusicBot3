import { MessageEmbed } from "discord.js"
import { ICommand } from "../lib/command"

export default {
  type: "CHAT_INPUT",
  name: "skip",
  description: "Skips forward in the queue",
  options: [{
    name: "amount",
    description: "The amount of tracks to skip",
    type: "INTEGER",
    required: false
  }],

  async exec(bot, interaction) {
    const guildMusic = bot.guildData.get(interaction.guildId!).music
    const amount = interaction.options.getInteger("amount", false) || undefined
    await interaction.deferReply()
    const num = (await guildMusic.skip(amount)).length
    await interaction.editReply({embeds:[new MessageEmbed({
      description: `⏩ Skipped ${num} track${num == 1 ? "" : "s"}`
    })]})
  }
} as ICommand