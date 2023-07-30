import { ActivityType, Client, Colors, EmbedBuilder, bold } from "discord.js"
import GuildData from "./music"
import { Commands } from "./commands"

export class Bot extends Client {

	public guildData: GuildData
	private readonly commands = Commands

	constructor() {
		console.debug("Constructing bot...")
		super({
			intents: ["Guilds", "GuildMembers", "GuildVoiceStates"],
			presence: {status: "idle", afk: true, activities: [{ name: "Loading simulator", type: ActivityType.Playing}]},
		})

		this.guildData = new GuildData()

		this.once("ready", async (client) => {
			if (process.env.DC_REGISTER == "1") {
        console.log('Registering commands...')
        await this.application!.commands.set(Object.values(this.commands) as any)
      }

			client.user.setPresence({status: 'online', afk: false, activities: [{ type: ActivityType.Listening, name: 'Biden'}]})
			console.log("Ready as %s", client.user.username)
		})
		
		this.on("interactionCreate", async (interaction) => {
			if (interaction.isCommand()){
				try {
					const cmd = this.commands[interaction.commandName]
					if (cmd) { await cmd.exec(this, interaction) }
					else {
						interaction.reply({embeds: [new EmbedBuilder({description:"Command not found 🤔", color: Colors.Red})]})
						console.warn("Command `%s` was not found. Guild: %s, %s", interaction.commandName, interaction.guild.name, interaction.guildId)
					}
				} catch (err) {
					console.warn("Unexpected error occured in command `%s`. Guild: %s, %s\n\t%s", interaction.commandName, interaction.guild.name, interaction.guildId, err)
				}
			}
		})
	}

	async destroy() {
    for (const obj of this.guildData.values()) {
      await obj.destroy()
    }
    super.destroy()
  }
}