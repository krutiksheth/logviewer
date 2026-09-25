export type LogLevel = 'FATAL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE' | 'UNKNOWN'

export interface LogEntry {
  id: number
  timestamp: string
  date: string
  time: string
  thread: string
  level: LogLevel
  logger: string
  context: string
  message: string
  stackTrace: string
  hasStackTrace: boolean
}

export interface LogParser {
  name: string
  canParse(content: string): boolean
  parse(content: string): LogEntry[]
}
