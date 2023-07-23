import { ActivityType, Client } from "discord.js"

export class Bot extends Client {
	constructor() {
		console.debug("Constructing bot...")
		super({
			intents: ["Guilds", "GuildMembers", "GuildVoiceStates"],
			presence: {status: "idle", afk: true, activities: [{ name: "Loading simulator", type: ActivityType.Playing}]},
		})

		this.once("ready", async (client) => {
			client.user.setPresence({status: 'online', afk: false, activities: [{ type: ActivityType.Listening, name: 'Biden'}]})
			console.log(`Ready as ${client.user.username}`)
		})

		this.on("interactionCreate", async (interaction) => {
			if (interaction.isCommand()){
				interaction.reply("testing")
			}
		})
	}
}