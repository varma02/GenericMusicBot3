import { MessageEmbed } from "discord.js";
import { ICommand } from "../lib/command";

export default {
  name: "leave",
  description: "Disconnects the bot from voice",

  async exec(bot, interaction) {
    const guildMusic = bot.guildData.get(interaction.guildId!).music
    guildMusic.leave()
    await interaction.reply({embeds:[new MessageEmbed({
      description: `Leaving, GN 😴💤`
    })]})
  },
} as ICommand