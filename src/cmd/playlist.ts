import { MessageEmbed } from "discord.js";
import { ICommand } from "../lib/command";
import shuffleArr from "../lib/shuffleArr";

export default {
  name: "playlist",
  description: "Adds a playlist to the queue",
  options: [{
    name: "url",
    description: "The playlist's URL you want to add",
    type: "STRING",
    required: true,
  },
  {
    name: "shuffle",
    description: "Shuffle the playlist or not",
    type: "BOOLEAN",
    required: false,
  }],

  async exec(bot, interaction) {
    const guildMusic = bot.guildData.get(interaction.guildId!).music
    const state = guildMusic.ensureVoice(interaction)
    if (!state) {
      await interaction.reply({embeds:[new MessageEmbed({
        description: "I'm not connected to a voice channel",
        color: "RED",
      })]})
      return
    }
    await interaction.deferReply()
    const url = interaction.options.getString("url", true)
    const shuffle = interaction.options.getBoolean("shuffle", false)
    const tracks = await guildMusic.get_playlist_metadata(url)
    if (tracks) {
      await interaction.editReply({embeds:[new MessageEmbed({
        description: `📃 Queued ${tracks.length} tracks`,
      })]})
      if (shuffle) {
        shuffleArr(tracks)
      }
      guildMusic.addTracks(...tracks)
    } else {
      await interaction.editReply({embeds:[new MessageEmbed({
        description: "Tracks not found",
        color: "RED",
      })]})
    }

  },
} as ICommand