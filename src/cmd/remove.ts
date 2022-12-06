import { MessageEmbed } from "discord.js";
import { ICommand } from "../lib/command";

export default {
  type: "CHAT_INPUT",
  name: "remove",
  description: "Removes 1 or more tracks from the queue (both ends included)",
  options: [{
    name: "from",
    description: "Position to remove tracks from",
    type: "INTEGER",
    required: true,
  }, {
    name: "to",
    description: "Position to remove tracks until (default: from+1)",
    type: "INTEGER",
    required: false,
  }],

  async exec(bot, interaction) {
    const guildMusic = bot.guildData.get(interaction.guildId!).music
    await interaction.deferReply()
    const from = interaction.options.getInteger("from", true)
    const to = interaction.options.getInteger("to", false) || (from+1)
    const removed = await guildMusic.remove(from, to)
    await interaction.editReply({embeds:[new MessageEmbed({
      description: `Removed ${removed} tracks 🗑`
    })]})
  },
} as ICommand