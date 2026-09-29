import { LogLevel } from '../parsers/types'

const FILTER_LEVELS: LogLevel[] = ['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']

interface Props {
  onOpenFile: () => void
  onPaste: () => void
  activeLevels: Set<LogLevel>
  allLevels: LogLevel[]
  onToggleLevel: (level: LogLevel) => void
  onToggleAll: () => void
  searchQuery: string
  onSearchChange: (q: string) => void
  levelCounts: Record<string, number>
  onOpenDocker: () => void
  dockerStreaming: boolean
  dockerContainerName: string | null
  onStopDocker: () => void
  onClear: () => void
  hasLogs: boolean
}

export default function Toolbar({
  onOpenFile,
  onPaste,
  activeLevels,
  allLevels,
  onToggleLevel,
  onToggleAll,
  searchQuery,
  onSearchChange,
  levelCounts,
  onOpenDocker,
  dockerStreaming,
  dockerContainerName,
  onStopDocker,
  onClear,
  hasLogs
}: Props): JSX.Element {
  const allActive = activeLevels.size === allLevels.length

  return (
    <div className="toolbar">
      <span className="toolbar-title">LogViewer</span>
      <div className="toolbar-divider" />
      <button className="toolbar-btn" onClick={onOpenFile} title="Open log file (Ctrl+O)">
        <span>&#128193;</span> Open File
      </button>
      <button className="toolbar-btn" onClick={onPaste} title="Paste log content">
        <span>&#128203;</span> Paste
      </button>
      {!dockerStreaming ? (
        <button className="toolbar-btn" onClick={onOpenDocker} title="Stream Docker container logs">
          <span>&#x1F433;</span> Docker
        </button>
      ) : (
        <>
          <span className="docker-streaming-indicator" title={dockerContainerName ?? ''}>
            <span className="docker-pulse">&#9679;</span>
            {dockerContainerName}
          </span>
          <button className="toolbar-btn toolbar-btn-stop" onClick={onStopDocker} title="Stop streaming">
            &#9632; Stop
          </button>
        </>
      )}
      {hasLogs && (
        <button className="toolbar-btn toolbar-btn-clear" onClick={onClear} title="Clear all logs">
          &#10005; Clear
        </button>
      )}
      <div className="toolbar-divider" />
      <div className="level-filters">
        <button
          className={`level-btn level-ALL${allActive ? ' active' : ''}`}
          onClick={onToggleAll}
          title="Toggle all levels"
        >
          ALL
        </button>
        {FILTER_LEVELS.map((level) => {
          const count = levelCounts[level] ?? 0
          return (
            <button
              key={level}
              className={`level-btn level-${level}${activeLevels.has(level) ? ' active' : ''}`}
              onClick={() => onToggleLevel(level)}
              title={`${level}: ${count} entries`}
            >
              {level}
              {count > 0 && <span className="level-count">{count}</span>}
            </button>
          )
        })}
      </div>
      <div className="search-box">
        <span className="search-icon">&#128269;</span>
        <input
          className="search-input"
          type="text"
          placeholder="Search logs..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => onSearchChange('')} title="Clear search">
            &times;
          </button>
        )}
      </div>
    </div>
  )
}
