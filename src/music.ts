import { DiscordGatewayAdapterCreator, entersState, getVoiceConnection, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice"
import { ChildProcessWithoutNullStreams, spawn as spawnChildProcess } from "child_process"
import { CommandInteraction, Message, EmbedBuilder, TextBasedChannel } from "discord.js"

export type Track = {
  title: string,
  author: string,
  author_url: string,
  url: string,
  thumbnail_url: string,
  length: number,
}

export default class GuildData extends Map<string, GuildMusic> {
  get(gid: string): GuildMusic {
    const sget = super.get(gid)
    if (sget){
      return sget
    } else {
      const data = new GuildMusic(gid)
      this.set(gid, data)
      return data
    }
  }
}

class GuildMusic {

  readonly thumbnail_404 = "https://http.cat/404.jpg"
  readonly userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:107.0) Gecko/20100101 Firefox/107.0"
  private ffmpeg?: ChildProcessWithoutNullStreams
  readonly guildId: string
  public voiceChannelId?: string
  public announceChannel?: TextBasedChannel
  public prevNowPlaying?: Message
  public queue: Track[] = []
  public position: number = 0
  public status: 'Idle' | 'Playing' | 'Paused' = 'Idle'
  

  constructor(guildId: string) {
    this.guildId = guildId
  }

  join(channelId: string, adapterCreator: DiscordGatewayAdapterCreator) {
    const conn = joinVoiceChannel({
      adapterCreator: adapterCreator,
      guildId: this.guildId,
      channelId: channelId,
      selfDeaf: true,
      selfMute: false,
    })
    conn.on(VoiceConnectionStatus.Disconnected, async (_oldState, _newState) => {
      try {
        await Promise.race([
          entersState(conn, VoiceConnectionStatus.Signalling, 5000),
          entersState(conn, VoiceConnectionStatus.Connecting, 5000),
        ])
      } catch (error) {
        this.pause()
        conn.destroy()
        this.voiceChannelId = undefined
        console.debug("Left voice channel %s in guild %s", channelId, this.guildId)
      }
    })
    console.debug("Joined voice channel %s in guild %s", channelId, this.guildId)
  }

  leave() {
    this.pause()
    const conn = getVoiceConnection(this.guildId)
    if (conn) { conn.disconnect() }
    this.voiceChannelId = undefined
  }

  async destroy() {
    const conn = getVoiceConnection(this.guildId)
    if (conn) { conn.destroy() }
    this.voiceChannelId = undefined
    this.clear()
    this.ffmpeg = undefined
    if (this.prevNowPlaying) {
      try { await this.prevNowPlaying.delete() }
      catch {}
    }
    console.debug("Destroyed in guild %s", this.guildId)
  }

  /**
   * Makes sure that the bot is connected to a voice channel.
   * SHOULD BE RUN BEFORE ANY MUSIC COMMAND
   * @param interaction Command interaction, contains user voice data
   * @param force Force connection if already connected (default:false)
   * @returns Boolean value
   */
  ensureVoice(interaction?:CommandInteraction, force=false): boolean {
    if (this.voiceChannelId) {
      return true
    } else if (interaction || (interaction && force)) {
      const userVoice = interaction.guild!.members.resolve(interaction.user)!.voice
      if (userVoice && userVoice.channelId) {
        this.join(userVoice.channelId, interaction.guild.voiceAdapterCreator)
        this.announceChannel = interaction.channel!
        console.debug("The bot is currently in %d voice channels", interaction.client.voice.adapters.size)
        return true
      }
    }
    return false
  }

  clear(): void {
    this.queue = []
    this.position = 0
    this.status = "Idle"
    if (this.ffmpeg) { this.ffmpeg.kill() }
    this.ffmpeg = undefined
  }

  async get_playlist_metadata(url: string): Promise<void | Track[]> {
    try { new URL(url) }
    catch { return }
    const ytdlp = spawnChildProcess("yt-dlp", [
      "--print", "extractor",
      "--print", "webpage_url",
      "--print", "title",
      "--print", "channel",
      "--print", "channel_url",
      "--print", "duration",
      "--print", "thumbnail",
      "--yes-playlist",
      "--flat-playlist",
      url,
    ], {stdio: 'pipe'})
    let raw_data = ""
    ytdlp.stdout.on("data", (data) => {raw_data += data})
    await new Promise((res) => { ytdlp.on('exit', (code) => { res(code) }) })
    const data = raw_data.trim().split("\n")
    const response: Track[] = []
    for (let index = 0; index < data.length; index += 7) {
      let thumbnail = data[index+6]
			try { new URL(data[index+6]) }
			catch { thumbnail = this.thumbnail_404 }
      response.push({
        url: data[index+1],
        title: data[index+2],
        author: data[index+3],
        author_url: data[index+4],
        length: parseInt(data[index+5]),
        thumbnail_url: thumbnail,
      })
    }
    return response
  }

  async get_track_metadata(query: string): Promise<void | Track> {
    try { new URL(query) }
    catch { query = "ytsearch1:" + query }
    const ytdlp = spawnChildProcess("yt-dlp", [
      "--print", "extractor",
      "--print", "webpage_url",
      "--print", "title",
      "--print", "channel",
      "--print", "channel_url",
      "--print", "duration",
      "--print", "thumbnail",
      "--no-playlist",
      "--flat-playlist",
      "-f", "ba", 
      query,
    ], {stdio: 'pipe'})
    let raw_data = ""
    ytdlp.stdout.on("data", (data) => {raw_data += data})
    await new Promise((res) => { ytdlp.on('exit', (code) => { res(code) }) })
    if (raw_data) {
			const data = raw_data.trim().split("\n")
			let thumbnail = data[6]
			try { new URL(data[6]) }
			catch { thumbnail = this.thumbnail_404 }

      return {
        url: data[1],
        title: data[2],
        author: data[3],
        author_url: data[4],
        length: parseInt(data[5]),
        thumbnail_url: thumbnail,
      } as Track
    }
  }

  async remove(from:number, to:number): Promise<number> {
    if (from < 0 || to < 1 || from >= to) {
      return 0
    }
    const deleted = this.queue.splice(from, (to - from)+1)
    if (from == 0) {
      this.status = "Paused"
      await this.play()
    }
    return deleted.length
  }

  async addTracks(...tracks:Track[]) {
    this.queue.push(...tracks)
    if (this.status == "Idle") {
      this.play()
    }
  }

  async skip(amount:number = 1): Promise<Track[]> {
    const skipped = this.queue.splice(0, amount)
    this.status = "Paused"
    await this.play()
    return skipped
  }

  pause() {
    if (this.status == "Playing") { this.status = "Paused" }
    if (this.ffmpeg) { this.ffmpeg.kill() }
    this.ffmpeg = undefined
  }

  async resume() {
    if (this.status == "Paused") {
      await this.play(this.position)
    }
  }

  async play(position: number = 0) {
    if (this.ffmpeg) {this.ffmpeg.kill()}
    this.ffmpeg = undefined
    this.position = position
    const track = this.queue[0]
    if (!track) { 
      this.status = "Idle"
      return false 
    }
    
    const ytdlp = spawnChildProcess("yt-dlp", [
      "--print", "url", 
      "-f", "ba", 
      track.url,
    ], {stdio: 'pipe'})
    let url = ""
    ytdlp.stdout.on("data", (data) => { url += data })
		ytdlp.stderr.on("data", (err) => console.debug("YT-DLP error in guild %s\n\t%s", this.guildId, err))
    await new Promise((res) => { ytdlp.on('exit', (code) => { res(code) }) })

    try { new URL(url) }
    catch {
      console.debug("Invalid stream URL in guild %s at track %s", this.guildId, track.url)
      return
    }

    this.ffmpeg = spawnChildProcess("ffmpeg", [
      "-loglevel", "error", // stop logging
      "-vn", // No video
      "-re", // Read at native speed
      "-ss", `${position}ms`, // The start time in millis
      "-reconnect", "1", "-multiple_requests", "1", // Reconnect
      "-user_agent", this.userAgent, // pls don't ban me
      "-i", url, // Set input to stream URL
      "-acodec", "libopus", // Get an opus stream
      "-ar", "48000", // Sample rate 48kHz
      "-ac", "2", // 2 Audio channels
      "-sample_fmt", "s16", 
      "-b:a", "64k", // set bitrate to 64kbps
      "-vbr", "on", // Enable variable bitrate
      "-compression_level", "8", // duh
      "-map", "0:a", // Sopy without re-encoding
      "-f", "fifo", // Start fist in first out buffer
      "-fifo_format", "data", // Output raw opus packets
      "-fifo_size", "1000000", // Set buffer size to 1000 kilobytes
      "-" // Output to stdout
    ], {stdio: "pipe"})
    this.ffmpeg.stdout.on("data", chunk => {
      const conn = getVoiceConnection(this.guildId)
      if (conn) { conn.playOpusPacket(chunk) }
      this.position += 20
    })
    this.ffmpeg.stderr.on("data", (err) => console.debug("FFMPEG error in guild %s\n\t%s", this.guildId, err))
    
    this.status = "Playing"
    if (this.announceChannel) {
      if (this.prevNowPlaying) {
        this.prevNowPlaying.delete().catch(() => {})
      }
      this.prevNowPlaying = await this.announceChannel.send({embeds:[new EmbedBuilder({
        description: `🎶 Now playing: [${track.title}](${track.url})`
      })]})
    }

    this.ffmpeg.on("exit", (code) => {
      console.debug("FFMPEG exited with code %d in guild %s", code, this.guildId)
      if (this.announceChannel) {
        if (this.prevNowPlaying) {
          this.prevNowPlaying.delete().catch(() => {})
        }
      }
      if (this.status != "Paused") {
        this.queue.shift()
        this.play()
      }
    })
  }
}