import { LogEntry, LogLevel, LogParser } from './types'

// Matches: 2026-09-18 11:06:47,681 [6] ERROR MonitoringLogger [(null)] - message
const ENTRY_PATTERN =
  /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2},\d{3}) \[(\d+)\] (\w+)\s+(\S+) \[([^\]]*)\] - (.*)$/

function normalizeLevel(raw: string): LogLevel {
  const s = raw.toUpperCase()
  if (s === 'WARNING') return 'WARN'
  const known: LogLevel[] = ['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']
  return known.includes(s as LogLevel) ? (s as LogLevel) : 'UNKNOWN'
}

export const log4netParser: LogParser = {
  name: 'log4net',

  canParse(content: string): boolean {
    return content.split(/\r?\n/).slice(0, 20).some((line) => ENTRY_PATTERN.test(line))
  },

  parse(content: string): LogEntry[] {
    const lines = content.split(/\r?\n/)
    const entries: LogEntry[] = []
    let current: Omit<LogEntry, 'stackTrace' | 'hasStackTrace'> | null = null
    let stackLines: string[] = []
    let id = 0

    const flush = (): void => {
      if (!current) return
      const stackTrace = stackLines.join('\n').trimEnd()
      entries.push({ ...current, stackTrace, hasStackTrace: stackTrace.length > 0 })
    }

    for (const line of lines) {
      const m = ENTRY_PATTERN.exec(line)
      if (m) {
        flush()
        const [, date, time, thread, rawLevel, logger, context, message] = m
        current = {
          id: id++,
          timestamp: `${date} ${time}`,
          date,
          time,
          thread,
          level: normalizeLevel(rawLevel),
          logger,
          context,
          message
        }
        stackLines = []
      } else if (current && line.trimEnd()) {
        stackLines.push(line)
      }
    }

    flush()
    return entries
  }
}
