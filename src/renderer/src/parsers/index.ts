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

export function detectParser(lines: string[]): LogParser | null {
  const sample = lines.join('\n')
  return parsers.find((p) => p.canParse(sample)) ?? null
}

export function parseLines(
  lines: string[],
  parser: LogParser | null,
  idOffset: number
): LogEntry[] {
  if (!lines.length) return []
  if (parser) {
    const raw = parser.parse(lines.join('\n'))
    raw.forEach((e, i) => {
      e.id = idOffset + i
    })
    return raw
  }
  return lines
    .filter((l) => l.trim())
    .map((line, i) => ({
      id: idOffset + i,
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
}
