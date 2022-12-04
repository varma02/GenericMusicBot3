
import { MessageEmbed } from "discord.js"
import { ICommand } from "../lib/command"

export default {
  type: "CHAT_INPUT",
  name: "add",
  description: "Adds a track to the end of the queue",
  options: [{
    name: "query",
    description: "An url or a search terms for the track you want to play",
    required: true,
    type: "STRING",
  },],

  async exec(bot, interaction) {
    const query = interaction.options.getString("query", true)
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
    const track = await guildMusic.get_track_metadata(query)
    if (track) {
      await interaction.editReply({embeds:[new MessageEmbed({
        description: `[${track.title}](${track.url})`,
        fields: [
          { name: "Position", value: "#" + guildMusic.queue.length.toString(), inline: true },
          { name: "Length", value: new Date(track.length * 1000).toISOString().substring(11, 19), inline: true },
          { name: "Author", value: `[${track.author}](${track.author_url})`, inline: true },
        ]})
        .setThumbnail(track.thumbnail_url)
      ]})
      guildMusic.addTracks(track)
    } else {
      await interaction.editReply({embeds:[new MessageEmbed({
        description: "Track not found",
        color: "RED",
      })]})
    }
    
  },
} as ICommand