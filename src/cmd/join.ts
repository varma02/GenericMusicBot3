import { MessageEmbed } from "discord.js"
import { ICommand } from "../lib/command"

export default {
  type: "CHAT_INPUT",
  name: "join",
  description: "Connects the bot to the voice channel you are in",
  
  async exec(bot, interaction) {
    const guildMusic = bot.guildData.get(interaction.guildId!).music
    const userVoice = interaction.guild!.members.resolve(interaction.user)!.voice
    if (userVoice.channelId) {
      const state = guildMusic.ensureVoice(interaction, true)
      if (state) {
        await interaction.reply({ embeds: [new MessageEmbed({
          description: `Joined voice channel <#${userVoice.channelId}>`
        })]})
      } else {
        await interaction.reply({ embeds: [new MessageEmbed({
          color: "RED",
          description: "You are not connected to any voice channels."
        })], ephemeral: true })  
      }
    } else {
      await interaction.reply({ embeds: [new MessageEmbed({
        color: "RED",
        description: "You are not connected to any voice channels."
      })], ephemeral: true })
    }
  },
} as ICommand