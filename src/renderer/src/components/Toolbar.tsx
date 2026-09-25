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
  levelCounts
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
