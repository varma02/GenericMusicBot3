import { MessageEmbed } from "discord.js";
import { ICommand } from "../lib/command";
import shuffleArr from "../lib/shuffleArr";

export default {
  type: "CHAT_INPUT",
  name: "shuffle",
  description: "Randomizes the queue",

  async exec(bot, interaction) {
    const guildMusic = bot.guildData.get(interaction.guildId!).music
    if (guildMusic.queue.length > 2) {
      guildMusic.queue = [guildMusic.queue[0], ...shuffleArr(guildMusic.queue.slice(1))]
      await interaction.reply({embeds:[new MessageEmbed({
        description: "Shuffled the queue 🔀"
      })]})
    } else {
      await interaction.reply({embeds:[new MessageEmbed({
        description: "Not enough tracks to shuffle. 🤦‍♂️",
        color: "RED",
      })]})
    }
  },
} as ICommand