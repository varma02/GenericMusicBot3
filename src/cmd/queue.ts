import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js"
import { mkdirSync } from "fs"
import { ICommand } from "../lib/command"

export default {
  type: "CHAT_INPUT",
  name: "queue",
  description: "Shows 10 tracks from the queue",

  async exec(bot, interaction) {
    const guildMusic = bot.guildData.get(interaction.guildId!).music
    if (guildMusic.queue.length > 0) {
      const fields: any[] = []
      for (const index in guildMusic.queue.slice(0, 10)) {
        const track = guildMusic.queue[index]
        fields.push({
          name: `#${index} ${track.title}`,
          value: `[${new Date(track.length * 1000).toISOString().substring(11, 19)}] [${track.author}] [[link]](${track.url})`,
        })
      }
      
      const msg = await interaction.reply({embeds:[new MessageEmbed({
        title: "Queue from #0 to #9",
        fields: fields,
      })], components: [new MessageActionRow().addComponents([
        new MessageButton()
        .setCustomId("bc")
        .setStyle("PRIMARY")
        .setLabel("<"),
        new MessageButton()
        .setCustomId("fw")
        .setStyle("PRIMARY")
        .setLabel(">"),
      ])], fetchReply: true})
      
      const coll = interaction.channel!.createMessageComponentCollector({componentType: "BUTTON", time: 60000, message: msg})
      let currentStart = 0
      coll.on("collect", async (ci) => {
        switch (ci.customId) {
          case "bc":
            if (currentStart > 0) {
              currentStart -= 10
              const fieldsU: any[] = []
              for (const iSU in guildMusic.queue.slice(currentStart, currentStart+10)) {
                const indexU = parseInt(iSU) + currentStart
                const trackU = guildMusic.queue[indexU]
                fieldsU.push({
                  name: `#${indexU+currentStart} ${trackU.title}`,
                  value: `[[link]](${trackU.url})  [${new Date(trackU.length * 1000).toISOString().substring(11, 19)}]  [${trackU.author}]`,
                })
              }
              await ci.update({embeds:[new MessageEmbed({
                title: `Queue from #${currentStart} to #${currentStart+9}`,
                fields: fieldsU
              })]})
            } else {
              await ci.update({})
            }
          break;
          case "fw":
            if (currentStart < guildMusic.queue.length - 9) {
              currentStart += 10
              const fieldsU: any[] = []
              for (const iSU in guildMusic.queue.slice(currentStart, currentStart+10)) {
                const indexU = parseInt(iSU) + currentStart
                const trackU = guildMusic.queue[indexU]
                fieldsU.push({
                  name: `#${indexU} ${trackU.title}`,
                  value: `[[link]](${trackU.url})  [${new Date(trackU.length * 1000).toISOString().substring(11, 19)}]  [${trackU.author}]`,
                })
              }
              await ci.update({embeds:[new MessageEmbed({
                title: `Queue  from #${currentStart} to #${currentStart+9}`,
                fields: fieldsU
              })]})
            } else {
              await ci.update({})
            }
          break;
        }
      })

      coll.on("end", () =>{
        interaction.editReply({components: []})
      })


    } else {
      await interaction.reply({embeds:[new MessageEmbed({
        description: "The queue is empty 💀",
      })]})
    }
  },
} as ICommand