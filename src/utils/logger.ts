type Meta = Record<string, unknown>

function log(level: string, msg: string, meta?: Meta) {
  if (process.env.LOG_LEVEL === 'silent') return
  const entry = { time: new Date().toISOString(), level, msg, ...meta }
  level === 'error'
    ? console.error(JSON.stringify(entry))
    : console.log(JSON.stringify(entry))
}

export const logger = {
  info:  (msg: string, meta?: Meta) => log('info',  msg, meta),
  error: (msg: string, meta?: Meta) => log('error', msg, meta),
  warn:  (msg: string, meta?: Meta) => log('warn',  msg, meta),
  debug: (msg: string, meta?: Meta) => log('debug', msg, meta),
}