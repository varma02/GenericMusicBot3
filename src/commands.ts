import {
	ActionRowBuilder,
  ApplicationCommandOptionData, 
  ApplicationCommandOptionType, 
  ApplicationCommandType, 
  ButtonBuilder, 
  ButtonStyle, 
  Colors, 
  CommandInteraction,
	ComponentType,
	EmbedBuilder,
} from "discord.js"
import { Bot } from "./bot"

export type ICommand = {
  name: string,
  description: string,
  type: ApplicationCommandType,
  options?: ApplicationCommandOptionData[],
  exec: (bot: Bot, interaction: CommandInteraction) => Promise<void>,
}

export const Commands: {[k:string]:ICommand} = {
	"join": {
		name: "join",
		type: ApplicationCommandType.ChatInput,
		description: "Connects the bot to the voice channel you are in",
		
		async exec(bot, interaction) {
			const guildMusic = bot.guildData.get(interaction.guildId!)
			const userVoice = interaction.guild!.members.resolve(interaction.user)!.voice
			if (userVoice.channelId) {
				const state = guildMusic.ensureVoice(interaction)
				if (state) {
					await interaction.reply({ embeds: [new EmbedBuilder({
						description: `Joined voice channel <#${userVoice.channelId}>`
					})]})
					return
				}
			}
			await interaction.reply({ embeds: [new EmbedBuilder({
				color: Colors.Red,
				description: "You are not connected to any voice channels."
			})], ephemeral: true })
		},
	},


	"leave": {
		name: "leave",
		type: ApplicationCommandType.ChatInput,
		description: "Disconnects the bot from voice",
	
		async exec(bot, interaction) {
			const guildMusic = bot.guildData.get(interaction.guildId!)
			guildMusic.leave()
			await interaction.reply({embeds:[new EmbedBuilder({
				description: `Leaving, GN 😴💤`
			})]})
		},
	},


	"add": {
		type: ApplicationCommandType.ChatInput,
		name: "add",
		description: "Adds a track to the end of the queue",
		options: [{
			name: "query",
			description: "An url or a search terms for the track you want to play",
			required: true,
			type: ApplicationCommandOptionType.String,
		},],
	
		async exec(bot, interaction) {
			const guildMusic = bot.guildData.get(interaction.guildId!)
			const state = guildMusic.ensureVoice(interaction)
			if (!state) {
				await interaction.reply({embeds:[new EmbedBuilder({
					description: "I'm not connected to a voice channel 😡",
					color: Colors.Red,
				})]})
				return
			}
			await interaction.deferReply()
			const query = (interaction.options as any).getString("query", true)
			const track = await guildMusic.get_track_metadata(query)
			if (track) {
				await interaction.editReply({embeds:[new EmbedBuilder({
					description: `[${track.title}](${track.url})`,
					fields: [
						{ name: "Position", value: guildMusic.queue.length > 0 ? `#${guildMusic.queue.length}` : "Now playing", inline: true },
						{ name: "Length", value: new Date(track.length * 1000).toISOString().substring(11, 19), inline: true },
						{ name: "Author", value: `[${track.author}](${track.author_url})`, inline: true },
					]})
					.setThumbnail(track.thumbnail_url)
				]})
				guildMusic.addTracks(track)
			} else {
				await interaction.editReply({embeds:[new EmbedBuilder({
					description: "Track not found",
					color: Colors.Red,
				})]})
			}
		},
	},

	
	"playlist": {
		name: "playlist",
		type: ApplicationCommandType.ChatInput,
		description: "Adds a playlist to the queue",
		options: [{
			name: "url",
			description: "The playlist's URL you want to add",
			type: ApplicationCommandOptionType.String,
			required: true,
		},
		{
			name: "shuffle",
			description: "Shuffle the playlist or not",
			type: ApplicationCommandOptionType.Boolean,
			required: false,
		}],
	
		async exec(bot, interaction) {
			const guildMusic = bot.guildData.get(interaction.guildId!)
			const state = guildMusic.ensureVoice(interaction)
			if (!state) {
				await interaction.reply({embeds:[new EmbedBuilder({
					description: "I'm not connected to a voice channel 😡",
					color: Colors.Red,
				})]})
				return
			}
			await interaction.deferReply()
			const url = (interaction.options as any).getString("url", true)
			const shuffle = (interaction.options as any).getBoolean("shuffle", false)
			const tracks = await guildMusic.get_playlist_metadata(url)
			if (tracks) {
				await interaction.editReply({embeds:[new EmbedBuilder({
					description: `📃 Queued ${tracks.length} tracks`,
				})]})
				if (shuffle) { tracks.sort(() => 0.5 - Math.random()) }
				guildMusic.addTracks(...tracks)
			} else {
				await interaction.editReply({embeds:[new EmbedBuilder({
					description: "Tracks not found",
					color: Colors.Red,
				})]})
			}
	
		},
	},


	"skip": {
		type: ApplicationCommandType.ChatInput,
		name: "skip",
		description: "Skips forward in the queue",
		options: [{
			name: "amount",
			description: "The amount of tracks to skip",
			type: ApplicationCommandOptionType.Integer,
			required: false
		}],
	
		async exec(bot, interaction) {
			const guildMusic = bot.guildData.get(interaction.guildId!)
			const amount = (interaction.options as any).getInteger("amount", false) || undefined
			await interaction.deferReply()
			const num = (await guildMusic.skip(amount)).length
			await interaction.editReply({embeds:[new EmbedBuilder({
				description: `⏩ Skipped ${num} track${num == 1 ? "" : "s"}`
			})]})
		}
	},


	"seek": {
		name: "seek",
		type: ApplicationCommandType.ChatInput,
		description: "Skips to the specified time in the currently playing track",
		options: [{
			name: "hour",
			description: "Hour",
			type: ApplicationCommandOptionType.Integer,
			required: true
		}, {
			name: "minute",
			description: "Minute",
			type: ApplicationCommandOptionType.Integer,
			required: true
		}, {
			name: "second",
			description: "Second",
			type: ApplicationCommandOptionType.Integer,
			required: true
		}],

		async exec(bot, interaction) {
			const guildMusic = bot.guildData.get(interaction.guildId!)
			if (guildMusic.queue[0].length == 0) {
				await interaction.reply({embeds:[new EmbedBuilder({
					description: `Seeking is disabled for live streams 🚫`,
					color: Colors.Red,
				})]})
				return
			}
			const hour = (interaction.options as any).getInteger("hour", true)
			const minute = (interaction.options as any).getInteger("minute", true)
			const second = (interaction.options as any).getInteger("second", true)
			const millis = second * 1000 + minute * 60000 + hour * 3600000
			guildMusic.pause()
			await new Promise((res)=>setTimeout(res, 300))
			guildMusic.position = millis
			guildMusic.resume()
			await interaction.reply({embeds:[new EmbedBuilder({
				description: `⏩ Skipped to ${new Date(millis).toISOString().substring(11, 19)}`
			})]})
		}
	},


	"queue": {
		name: "queue",
		type: ApplicationCommandType.ChatInput,
		description: "Shows the currently playing song and 10 next form the queue",
	
		async exec(bot, interaction) {
			const guildMusic = bot.guildData.get(interaction.guildId!)
			if (guildMusic.queue.length == 0) {
				interaction.reply({embeds: [new EmbedBuilder().setDescription("The queue is empty 💀")]})
			} else {
				let page = 0
				const toISO = (s:number) => new Date(s * 1000).toISOString().substring(11, 19)
				function buildEmbed() {
					const queueFields = []
					for (let i = page*10+1; i<page*10+11; i++) {
						const track = guildMusic.queue[i]
						if (!track) break
						queueFields.push({
							name: `#${i} ${track.title}`.slice(0, 256), 
							value: `[${toISO(track.length)}] [${track.author}] [[link]](${track.url})`.slice(0, 1024),
							inline: false,
						})
					}
					const nowPlaying = guildMusic.queue[0]
					let positionString = ""
					for (let i = 0; i < 10; i++) {
						if (Math.floor((guildMusic.position/(nowPlaying.length*1000)*10)) == i) positionString += "●"
						else positionString += "▬"
					}
					return new EmbedBuilder()
						.setAuthor({name: "Now playing", iconURL: "https://media.discordapp.net/attachments/1018067891435876444/1135173424868753428/vinyl.png"})
						.setDescription(`[${nowPlaying.title}](${nowPlaying.url}) by ${nowPlaying.author}`.slice(0, 3000) + 
						`\n${toISO(guildMusic.position/1000)} ${positionString} ${toISO(nowPlaying.length)}` + 
						(guildMusic.queue.length > 1 ? `\n\n**Next up:**` : ""))
						.setThumbnail(nowPlaying.thumbnail_url)
						.addFields(queueFields)
				}
				const actionRow = new ActionRowBuilder<ButtonBuilder>()
					.addComponents(new ButtonBuilder()
						.setCustomId("back")
						.setEmoji("⏪")
						.setStyle(ButtonStyle.Secondary))
					.addComponents(new ButtonBuilder()
						.setCustomId("next")
						.setEmoji("⏩")
						.setStyle(ButtonStyle.Secondary))
				const message = await interaction.reply({embeds: [buildEmbed()], components: guildMusic.queue.length > 11 ? [actionRow] : []})
				const collector = message.createMessageComponentCollector({componentType: ComponentType.Button, time: 60000})
				collector.on("collect", (compInteraction) => {
					if (!compInteraction.isButton()) return
					if (compInteraction.customId == "back" && page > 0) {
						page--
						compInteraction.update({embeds: [buildEmbed()]})
						return
					} else if (compInteraction.customId == "next" && (page+1)*10 < guildMusic.queue.length-1) {
						page++
						compInteraction.update({embeds: [buildEmbed()]})
						return
					}
					compInteraction.update({})
				})
				collector.once("end", () => {
					interaction.editReply({components: []})
				})
			}
		},
	},


	"clear": {
		name: "clear",
		type: ApplicationCommandType.ChatInput,
		description: "Removes all tracks from the queue",
	
		async exec(bot, interaction) {
			const guildMusic = bot.guildData.get(interaction.guildId!)
			guildMusic.clear()
			await interaction.reply({embeds:[new EmbedBuilder({
				description: "🧹 Cleared the queue"
			})]})
		},
	},


	"shuffle": {
		name: "shuffle",
		type: ApplicationCommandType.ChatInput,
		description: "Randomizes the queue",
	
		async exec(bot, interaction) {
			const guildMusic = bot.guildData.get(interaction.guildId!)
			if (guildMusic.queue.length > 2) {
				guildMusic.queue = [guildMusic.queue[0], ...guildMusic.queue.slice(1).sort(() => 0.5 - Math.random())]
				await interaction.reply({embeds:[new EmbedBuilder({
					description: "Shuffled the queue 🔀"
				})]})
			} else {
				await interaction.reply({embeds:[new EmbedBuilder({
					description: "Not enough tracks to shuffle. 🤦‍♂️",
					color: Colors.Red,
				})]})
			}
		},
	},


	"remove": {
		name: "remove",
		type: ApplicationCommandType.ChatInput,
		description: "Removes 1 or more tracks from the queue (both ends included)",
		options: [{
			name: "from",
			description: "Position to remove tracks from",
			type: ApplicationCommandOptionType.Integer,
			required: true,
		}, {
			name: "to",
			description: "Position to remove tracks until (default: from+1)",
			type: ApplicationCommandOptionType.Integer,
			required: false,
		}],
	
		async exec(bot, interaction) {
			const guildMusic = bot.guildData.get(interaction.guildId!)
			await interaction.deferReply()
			const from = (interaction.options as any).getInteger("from", true)
			const to = (interaction.options as any).getInteger("to", false) || (from+1)
			const removed = await guildMusic.remove(from, to)
			await interaction.editReply({embeds:[new EmbedBuilder({
				description: `Removed ${removed} tracks 🗑`
			})]})
		},
	},


	"resume": {
		name: "resume",
		type: ApplicationCommandType.ChatInput,
		description: "Resumes playback",
	
		async exec(bot, interaction) {
			const guildMusic = bot.guildData.get(interaction.guildId!)
			await guildMusic.resume()
			await interaction.reply({embeds:[new EmbedBuilder({
				description: "Resuming playback ▶"
			})]})
		},
	},


	"pause": {
		name: "pause",
		type: ApplicationCommandType.ChatInput,
		description: "Pauses the currently plaing track",
	
		async exec(bot, interaction) {
			const guildMusic = bot.guildData.get(interaction.guildId!)
			guildMusic.pause()
			await interaction.reply({embeds:[new EmbedBuilder({
				description: "Pausing playback ⏸"
			})]})
		},
	},


	"ping": {
		name: "ping",
		type: ApplicationCommandType.ChatInput,
		description: "Replies with the bot's latency",
		
		async exec(bot, interaction) {
			await interaction.reply({embeds:[new EmbedBuilder({
				fields: [
					{ name: "💓 Hearthbeat", value: `   ${bot.ws.ping}ms`, inline: true },
					{ name: "⏱ Latency", value: `   ${Date.now() - interaction.createdTimestamp}ms`, inline: true }
				]
			})]})
		},
	},


	"reset": {
		name: "reset",
		type: ApplicationCommandType.ChatInput,
		description: "Try this command if the bot doesn't work",
		
		async exec(bot, interaction) {
			const guildMusic = bot.guildData.get(interaction.guildId)
			guildMusic.destroy()
			await new Promise((res) => setTimeout(res, 300))
			bot.guildData.delete(interaction.guildId)
			await interaction.reply({embeds:[new EmbedBuilder({description: "The bot has been reset ⚙"})]})
		},
	},
}