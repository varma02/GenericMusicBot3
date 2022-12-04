import { MessageEmbed } from "discord.js";
import { ICommand } from "../lib/command";

export default {
  name: "resume",
  description: "Resumes playback",

  async exec(bot, interaction) {
    const guildMusic = bot.guildData.get(interaction.guildId!).music
    await guildMusic.resume()
    await interaction.reply({embeds:[new MessageEmbed({
      description: "Resuming playback ▶"
    })]})
  },
} as ICommand