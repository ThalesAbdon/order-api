type Level = 'debug' | 'info' | 'warn' | 'error'
type Meta = Record<string, unknown>

const LEVEL_PRIORITY: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

function shouldLog(level: Level) {
  const envLevel = process.env.LOG_LEVEL
  if (envLevel === 'silent') return false
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[(envLevel as Level) || 'info']
}

function safeStringify(obj: unknown) {
  try {
    return JSON.stringify(obj)
  } catch {
    return '{"error":"log stringify failed"}'
  }
}

function log(level: Level, msg: string, meta?: Meta) {
  if (!shouldLog(level)) return

  const entry = {
    time: new Date().toISOString(),
    level,
    msg,
    ...meta,
  }

  const output = safeStringify(entry)

  level === 'error'
    ? console.error(output)
    : console.log(output)
}

export const logger = {
  info:  (msg: string, meta?: Meta) => log('info', msg, meta),
  warn:  (msg: string, meta?: Meta) => log('warn', msg, meta),
  error: (msg: string, meta?: Meta) => log('error', msg, meta),
  debug: (msg: string, meta?: Meta) => log('debug', msg, meta),
}