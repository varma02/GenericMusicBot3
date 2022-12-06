type loglevels = 'debug' | 'info' | 'warn' | 'error'

const colors = {
  info: `\x1b[97m`,
  warn: `\x1b[93m`,
  debug: `\x1b[90m`,
  error: `\x1b[91m`,
  clear: `\x1b[0m`,
}

export default function log(level:loglevels, message:any) {
  console.log(`[${Date.now()}] ${colors[level]}[${level.toUpperCase()}] ${message}${colors.clear}`)
}