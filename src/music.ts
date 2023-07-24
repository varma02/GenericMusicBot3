import { DiscordGatewayAdapterCreator, entersState, getVoiceConnection, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice"
import { ChildProcessWithoutNullStreams, spawn as spawnChildProcess } from "child_process"
import { CommandInteraction, Message, EmbedBuilder, TextBasedChannel } from "discord.js"
import { opus } from "prism-media"

class CustomEncoder extends opus.Encoder {
  public setBitrate(bitrate: number): void {
    (this.encoder.applyEncoderCTL || this.encoder.encoderCTL)
      .apply(this.encoder, [4002, Math.min(96e3, Math.max(8e3, bitrate))]);
  }
}

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

  readonly userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:107.0) Gecko/20100101 Firefox/107.0"
  readonly guildId: string
  public voiceChannelId?: string
  public announceChannel?: TextBasedChannel
  public prevNowPlaying?: Message
  public queue: Track[] = []
  public position: number = 0
  public status: 'Idle' | 'Playing' | 'Paused' = 'Idle'
  private ffmpeg?: ChildProcessWithoutNullStreams
  private encoder: CustomEncoder
  

  constructor(guildId: string) {
    this.guildId = guildId
    this.encoder = new CustomEncoder({channels: 2, rate: 48000, frameSize: 960})
    this.encoder.on('data', (packet) => {
      const conn = getVoiceConnection(this.guildId)
      if (conn) { conn.playOpusPacket(packet) }
      this.position += 20
    })
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
      }
    })
    return conn
  }

  leave() {
    this.pause()
    const conn = getVoiceConnection(this.guildId)
    if (conn) { conn.disconnect() }
    this.voiceChannelId = undefined
  }

  async destroy() {
    const conn = getVoiceConnection(this.guildId)
    if (conn) {
      conn.destroy()
    }
    this.voiceChannelId = undefined
    this.clear()
    this.ffmpeg = undefined
    if (this.prevNowPlaying) {
      try { await this.prevNowPlaying.delete() }
      catch {}
    }
    this.encoder.destroy()
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
    this.setBitrate(64)
  }

  setBitrate(kbps: number): void {
    this.encoder.setBitrate(kbps * 1000)
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
      response.push({
        url: data[index+1],
        title: data[index+2],
        author: data[index+3],
        author_url: data[index+4],
        length: parseInt(data[index+5]),
        thumbnail_url: "https://http.cat/404.jpg",
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
			catch { thumbnail = "https://http.cat/404.jpg" }

      return {
        author: data[3],
        author_url: data[4],
        title: data[2],
        length: parseInt(data[5]),
        thumbnail_url: thumbnail,
        url: data[1]
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
		ytdlp.stderr.on("data", (err) => console.warn(`${err}`, {"guild": this.guildId, "track": this.queue[0].url}))
    await new Promise((res, rej) => { ytdlp.on('exit', (code) => { res(code) }) })

    try { new URL(url) }
    catch {
      console.error("Invalid url provided to Music#play()", {"guild": this.guildId, "track": this.queue[0].url})
      return
    }

    this.ffmpeg = spawnChildProcess("ffmpeg", [
      "-loglevel", "error", // stop logging
      "-vn", // No video
      "-re", // Read at native speed
      "-ss", `${position}ms`, // The start time in s
      "-reconnect", "1", "-multiple_requests", "1", // Reconnect
      "-user_agent", this.userAgent, // pls don't ban me
      "-i", url, // Set input to stream URL
      "-acodec", "pcm_s16le", // Get a pcm stream
      "-bufsize", "1984k", // Set buffer size
      "-ar", "48000", // Sample rate: 48kHz
      "-ac", "2", // 2 Audio channels
      "-f", "s16le", // Output raw pcm packets
      "-" // Output to stdout
    ], {stdio: "pipe"})
    this.ffmpeg.stdout.on("data", chunk => this.encoder.write(chunk))
    // this.ffmpeg.stderr.on("data", (err) => console.warn(`${err}`, {"guild": this.guildId, "track": this.queue[0].url}))
    
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
      //console.debug("debug", `FFMPEG exited with code: ${code}`)
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