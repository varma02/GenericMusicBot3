import { entersState, getVoiceConnection, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice"
import { ChildProcessWithoutNullStreams, spawn as spawnChildProcess } from "child_process"
import { CommandInteraction, Message, MessageEmbed, TextBasedChannel } from "discord.js"
import prism from "prism-media"
import { Bot } from "../bot"
import log from "./logger"

class CustomEncoder extends prism.opus.Encoder {
  public setBitrate(bitrate: number): void {
    (this.encoder.applyEncoderCTL || this.encoder.encoderCTL)
      .apply(this.encoder, [4002, Math.min(96e3, Math.max(8e3, bitrate))]);
  }
}

/**
 * @param length Track length in seconds
 */
export type Track = {
  title: string,
  author: string,
  author_url: string,
  url: string,
  thumbnail_url: string,
  length: number,
}

export default class Music {

  readonly userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:107.0) Gecko/20100101 Firefox/107.0"

  readonly guildId: string
  readonly bot: Bot
  public voiceChannelId?: string
  public announceChannel?: TextBasedChannel
  public prevNowPlaying?: Message
  public queue: Track[] = []
  public position: number = 0
  public status: 'Idle' | 'Playing' | 'Paused' = 'Idle'
  private ffmpeg?: ChildProcessWithoutNullStreams
  private encoder: prism.opus.Encoder
  

  constructor(guildId: string, bot: Bot) {
    this.guildId = guildId
    this.bot = bot

    this.encoder = new CustomEncoder({channels: 2, rate: 48000, frameSize: 960})
  
    this.encoder.on('data', (packet) => {
      const conn = getVoiceConnection(this.guildId)
      if (conn) { conn.playOpusPacket(packet) }
      this.position += 20
    })
  }

  join(channelId: string) {
    const conn = joinVoiceChannel({
      adapterCreator: this.bot.guilds.resolve(this.guildId)!.voiceAdapterCreator,
      guildId: this.guildId,
      channelId: channelId,
      selfDeaf: true,
      selfMute: false,
    })
    conn.on(VoiceConnectionStatus.Disconnected, async (_oldState, _newState) => {
      try {
        await Promise.race([
          entersState(conn, VoiceConnectionStatus.Signalling, 5_000),
          entersState(conn, VoiceConnectionStatus.Connecting, 5_000),
        ])
        // Seems to be reconnecting to a new channel - ignore disconnect
      } catch (error) {
        // Seems to be a real disconnect which SHOULDN'T be recovered from
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
  ensureVoice(interaction?:CommandInteraction, force:boolean=false): boolean {
    if (this.voiceChannelId && !force) {
      return true
    } else if ((interaction && !this.voiceChannelId) || (interaction && force)) {
      const userVoice = interaction.guild!.members.resolve(interaction.user)!.voice
      if (userVoice && userVoice.channelId) {
        this.join(userVoice.channelId)
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
        thumbnail_url: "https://na.na",
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
    const data = raw_data.split("\n")
    if (raw_data) {
      return {
        author: data[3],
        author_url: data[4],
        title: data[2],
        length: parseInt(data[5]),
        thumbnail_url: "https://na.na",
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
      await this.play(0, this.position)
    }
  }

  async play(queuePosition: number = 0, position: number = 0) {
    if (this.ffmpeg) {this.ffmpeg.kill()}
    this.ffmpeg = undefined
    this.position = position
    const track = this.queue[queuePosition]
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
    await new Promise((res, rej) => { ytdlp.on('exit', (code) => { res(code) }) })

    try { new URL(url) }
    catch {
      log("warn", "Invalid url provided to Music#play()")
      return
    }

    this.ffmpeg = spawnChildProcess("ffmpeg", [
      "-loglevel", "error",
      "-vn", // No video
      "-re", // Read at native speed
      "-ss", `${position}ms`, // The start time in ms
      "-reconnect", "1", "-multiple_requests", "1", // Reconnect
      "-user_agent", this.userAgent,
      "-i", url, // Set input to stream URL
      "-acodec", "pcm_s16le", // Get a pcm stream
      "-bufsize", "1984k",
      "-ar", "48000", // Sample rate: 48kHz
      "-ac", "2", // 2 Audio channels
      "-f", "s16le", // Output raw pcm packets
      "-" // Output to stdout
    ], {stdio: "pipe"})
    this.ffmpeg.stdout.on("data", chunk => this.encoder.write(chunk))
    this.ffmpeg.stderr.on("data", (err) => log("debug", err))
    
    this.status = "Playing"
    if (this.announceChannel) {
      if (this.prevNowPlaying) {
        this.prevNowPlaying.delete().catch(() => {})
      }
      this.prevNowPlaying = await this.announceChannel.send({embeds:[new MessageEmbed({
        description: `🎶 Now playing: [${track.title}](${track.url})`
      })]})
    }
    this.ffmpeg.on("exit", (code) => {
      log("debug", `FFMPEG exited with code: ${code}`)
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