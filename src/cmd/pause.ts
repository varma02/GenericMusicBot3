import { MessageEmbed } from "discord.js";
import { ICommand } from "../lib/command";

export default {
  name: "pause",
  description: "Pauses the currently plaing track",

  async exec(bot, interaction) {
    const guildMusic = bot.guildData.get(interaction.guildId!).music
    guildMusic.pause()
    await interaction.reply({embeds:[new MessageEmbed({
      description: "Pausing playback ⏸"
    })]})
  },
} as ICommand