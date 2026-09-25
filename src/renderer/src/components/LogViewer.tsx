import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { LogEntry as LogEntryType } from '../parsers/types'
import LogEntry from './LogEntry'

interface Props {
  entries: LogEntryType[]
  totalCount: number
  isLoading: boolean
  error: string | null
  searchQuery: string
  filePath: string | null
  parserName: string
}

export default function LogViewer({
  entries,
  totalCount,
  isLoading,
  error,
  searchQuery,
  filePath,
  parserName
}: Props): JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 10,
    getItemKey: (index) => entries[index]?.id ?? index
  })

  const renderContent = (): JSX.Element => {
    if (isLoading) {
      return <div className="state-overlay">Parsing log file&hellip;</div>
    }
    if (error) {
      return <div className="state-overlay state-error">{error}</div>
    }
    if (totalCount === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">&#128196;</div>
          <div className="empty-title">No log file loaded</div>
          <div className="empty-hint">
            Open a file with Ctrl+O, drag &amp; drop a .log file here,
            <br />
            or paste log content using the toolbar.
          </div>
        </div>
      )
    }
    if (entries.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">&#128269;</div>
          <div className="empty-title">No matching entries</div>
          <div className="empty-hint">Adjust level filters or clear the search query.</div>
        </div>
      )
    }
    return (
      <div ref={parentRef} className="log-scroll">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => (
            <div
              key={virtualItem.key}
              ref={virtualizer.measureElement}
              data-index={virtualItem.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`
              }}
            >
              <LogEntry entry={entries[virtualItem.index]} searchQuery={searchQuery} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="content-area">
      {renderContent()}
      <div className="statusbar">
        <span className="statusbar-file">
          {filePath ?? (totalCount > 0 ? 'Pasted content' : 'No file loaded')}
        </span>
        {totalCount > 0 && (
          <span className="statusbar-counts">
            {entries.length < totalCount
              ? `${entries.length.toLocaleString()} of ${totalCount.toLocaleString()} entries`
              : `${totalCount.toLocaleString()} entries`}
            {parserName && <span className="statusbar-parser">&nbsp;&middot;&nbsp;{parserName}</span>}
          </span>
        )}
      </div>
    </div>
  )
}
