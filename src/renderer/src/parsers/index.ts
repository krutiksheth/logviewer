import { LogEntry, LogParser } from './types'
import { log4netParser } from './log4net'

const parsers: LogParser[] = [log4netParser]

export function detectAndParse(content: string): { parser: string; entries: LogEntry[] } {
  const matched = parsers.find((p) => p.canParse(content))
  if (matched) {
    return { parser: matched.name, entries: matched.parse(content) }
  }
  // Fallback: one entry per non-empty line
  const entries: LogEntry[] = content
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((line, i) => ({
      id: i,
      timestamp: '',
      date: '',
      time: '',
      thread: '',
      level: 'UNKNOWN' as const,
      logger: '',
      context: '',
      message: line,
      stackTrace: '',
      hasStackTrace: false
    }))
  return { parser: 'plain text', entries }
}
