import { useState } from 'react'
import { LogEntry as LogEntryType } from '../parsers/types'

interface Props {
  entry: LogEntryType
  searchQuery: string
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function Highlighted({ text, query }: { text: string; query: string }): JSX.Element {
  if (!query || !text) return <>{text}</>
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="hl">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

export default function LogEntry({ entry, searchQuery }: Props): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const hasDetail = entry.hasStackTrace

  return (
    <div
      className={`log-entry lvl-${entry.level}${hasDetail ? ' expandable' : ''}`}
      onClick={() => hasDetail && setExpanded((x) => !x)}
    >
      <div className="entry-row">
        <span className="entry-ts">{entry.timestamp.replace(',', '.')}</span>
        <span className="entry-thread">[{entry.thread || '—'}]</span>
        <span className={`entry-badge lvl-${entry.level}`}>{entry.level}</span>
        <span className="entry-logger" title={entry.logger}>
          {entry.logger}
        </span>
        <span className="entry-msg">
          <Highlighted text={entry.message} query={searchQuery} />
        </span>
        {hasDetail && (
          <span className="entry-chevron" aria-hidden>
            {expanded ? '▲' : '▼'}
          </span>
        )}
      </div>
      {expanded && (
        <div className="entry-body">
          <pre className="entry-stack">
            <Highlighted text={entry.stackTrace} query={searchQuery} />
          </pre>
        </div>
      )}
    </div>
  )
}
