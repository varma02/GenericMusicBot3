import { MessageEmbed } from "discord.js";
import { ICommand } from "../lib/command";

export default {
  name: "clear",
  description: "Removes all tracks from the queue",

  async exec(bot, interaction) {
    const guildMusic = bot.guildData.get(interaction.guildId!).music
    guildMusic.clear()
    await interaction.reply({embeds:[new MessageEmbed({
      description: "🧹 Cleared the queue"
    })]})
  },
} as ICommand