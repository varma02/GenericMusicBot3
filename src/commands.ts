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
					description: "I'm not connected to a voice channel",
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
						{ name: "Position", value: "#" + guildMusic.queue.length.toString(), inline: true },
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
					description: "I'm not connected to a voice channel",
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
			const hour = (interaction.options as any).getInteger("hour", true)
			const minute = (interaction.options as any).getInteger("minute", true)
			const second = (interaction.options as any).getInteger("second", true)
			const millis = second * 1000 + minute * 60000 + hour * 3600000
			guildMusic.pause()
			await new Promise((res)=>setTimeout(res, 300))
			guildMusic.position = millis
			guildMusic.resume()
			await interaction.reply({embeds:[new EmbedBuilder({
				description: `⏩ Skipped to ${hour}:${minute}:${second}`
			})]})
		}
	},


	"queue": {
		name: "queue",
		type: ApplicationCommandType.ChatInput,
		description: "Shows 10 tracks from the queue",
	
		async exec(bot, interaction) {
			const guildMusic = bot.guildData.get(interaction.guildId!)
			if (guildMusic.queue.length > 0) {
				const fields: any[] = []
				for (const index in guildMusic.queue.slice(0, 10)) {
					const track = guildMusic.queue[index]
					fields.push({
						name: `#${index} ${track.title}`,
						value: `[${new Date(track.length * 1000).toISOString().substring(11, 19)}] [${track.author}] [[link]](${track.url})`,
					})
				}
				
				const msg = await interaction.reply({embeds:[new EmbedBuilder({
					title: "Queue from #0 to #9",
					fields: fields,
				})], components: [new ActionRowBuilder<ButtonBuilder>().addComponents([
					new ButtonBuilder()
					.setCustomId("bc")
					.setStyle(ButtonStyle.Primary)
					.setLabel("<"),
					new ButtonBuilder()
					.setCustomId("fw")
					.setStyle(ButtonStyle.Primary)
					.setLabel(">"),
				])], fetchReply: true})
				
				const coll = interaction.channel!.createMessageComponentCollector({componentType: ComponentType.Button, time: 60000, message: msg})
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
								await ci.update({embeds:[new EmbedBuilder({
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
								await ci.update({embeds:[new EmbedBuilder({
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
				await interaction.reply({embeds:[new EmbedBuilder({
					description: "The queue is empty 💀",
				})]})
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
			guildMusic.clear()
			await new Promise((res) => setTimeout(res, 300))
			bot.guildData.delete(interaction.guildId)
			await interaction.reply({embeds:[new EmbedBuilder({description: "The bot has been reset ⚙"})]})
		},
	},
}