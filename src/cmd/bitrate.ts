import { MessageEmbed } from "discord.js";
import { ICommand } from "../lib/command";

export default {
  name: "bitrate",
  description: "Sets the audio quality",
  options: [{
    name: "quality",
    description: "Bitrate of audio (default: 64kbps)",
    type: "INTEGER",
    choices: [
      {name: "8kbps", value: 8},
      {name: "16kbps", value: 16},
      {name: "32kbps", value: 32},
      {name: "64kbps", value: 64},
      {name: "96kbps", value: 96},
    ],
    required: true,
  }],

  async exec(bot, interaction) {
    const guildMusic = bot.guildData.get(interaction.guildId!).music
    const quality = interaction.options.getInteger("quality", true)
    guildMusic.setBitrate(quality)
    await interaction.reply({embeds:[new MessageEmbed({
      description: `Bitrate set to: ${quality}kbps  :troll:`
    })]})
  },
} as ICommand