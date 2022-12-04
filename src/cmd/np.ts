import { MessageEmbed } from "discord.js"
import { ICommand } from "../lib/command"

export default {
  type: "CHAT_INPUT",
  name: "nowplaying",
  description: "Shows info about the currently playing track",

  async exec(bot, interaction) {
    const guildMusic = bot.guildData.get(interaction.guildId!).music
    if (guildMusic.status == "Idle") {
      await interaction.reply({embeds:[new MessageEmbed({
        description: "Not playing anythin right now 🗿"
      })]})
    } else {
      const track = guildMusic.queue[0]
      await interaction.reply({embeds:[new MessageEmbed({
        title: "🎶 Now Playing",
        description: `[${track.title}](${track.url})`,
        fields: [
          { name: "Position", value: 
            new Date(guildMusic.position).toISOString().substring(11, 19) 
            + " / " + 
            new Date(track.length * 1000).toISOString().substring(11, 19), 
          inline: false },
          { name: "Author", value: `[${track.author}](${track.author_url})`, inline: true },
        ]})
        .setThumbnail(track.thumbnail_url)
      ]})
    }
  },
} as ICommand