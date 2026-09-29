import { useState, useCallback, useEffect, useRef } from 'react'
import { LogEntry, LogLevel, LogParser } from './parsers/types'
import { detectAndParse, detectParser, parseLines } from './parsers'
import Toolbar from './components/Toolbar'
import LogViewer from './components/LogViewer'
import DropZone from './components/DropZone'
import PasteModal from './components/PasteModal'
import DockerModal from './components/DockerModal'

const ALL_LEVELS: LogLevel[] = ['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE', 'UNKNOWN']

function getLevelCounts(entries: LogEntry[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const e of entries) counts[e.level] = (counts[e.level] ?? 0) + 1
  return counts
}

export default function App(): JSX.Element {
  const [allEntries, setAllEntries] = useState<LogEntry[]>([])
  const [filePath, setFilePath] = useState<string | null>(null)
  const [parserName, setParserName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeLevels, setActiveLevels] = useState<Set<LogLevel>>(new Set(ALL_LEVELS))
  const [searchQuery, setSearchQuery] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [showPaste, setShowPaste] = useState(false)
  const [dockerStreaming, setDockerStreaming] = useState(false)
  const [dockerContainerName, setDockerContainerName] = useState<string | null>(null)
  const [showDockerModal, setShowDockerModal] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const dragCounter = useRef(0)

  // Streaming refs — survive re-renders without triggering them
  const nextIdRef = useRef(0)
  const detectedParserRef = useRef<LogParser | null>(null)
  const parserDetectedRef = useRef(false)
  const lineAccumulatorRef = useRef<string[]>([])

  const loadContent = useCallback((content: string, path: string | null) => {
    setIsLoading(true)
    setError(null)
    setTimeout(() => {
      try {
        const { parser, entries } = detectAndParse(content)
        setAllEntries(entries)
        setParserName(parser)
        setFilePath(path)
        setActiveLevels(new Set(ALL_LEVELS))
        setSearchQuery('')
        nextIdRef.current = entries.length
      } catch (e) {
        setError(`Parse error: ${(e as Error).message}`)
        setAllEntries([])
      } finally {
        setIsLoading(false)
      }
    }, 0)
  }, [])

  const handleOpenFile = useCallback(async () => {
    const path = await window.api.openFile()
    if (!path) return
    setIsLoading(true)
    const result = await window.api.readFile(path)
    if (!result.success || !result.content) {
      setError(result.error ?? 'Failed to read file')
      setIsLoading(false)
      return
    }
    loadContent(result.content, path)
  }, [loadContent])

  const handleFileDrop = useCallback(
    async (file: File) => {
      const path = (file as File & { path?: string }).path
      if (path) {
        setIsLoading(true)
        const result = await window.api.readFile(path)
        if (!result.success || !result.content) {
          setError(result.error ?? 'Failed to read file')
          setIsLoading(false)
          return
        }
        loadContent(result.content, path)
      } else {
        const reader = new FileReader()
        reader.onload = (e) => {
          if (typeof e.target?.result === 'string') loadContent(e.target.result, file.name)
        }
        reader.readAsText(file)
      }
    },
    [loadContent]
  )

  const handleStartDocker = useCallback(async (containerId: string, containerName: string) => {
    // Clean slate for streaming session
    setAllEntries([])
    setFilePath(null)
    setParserName('')
    setError(null)
    setActiveLevels(new Set(ALL_LEVELS))
    setSearchQuery('')
    nextIdRef.current = 0
    detectedParserRef.current = null
    parserDetectedRef.current = false
    lineAccumulatorRef.current = []

    const result = await window.api.startDockerStream(containerId)
    if (!result.success) {
      setError(result.error ?? 'Failed to start Docker stream')
      return
    }

    setDockerStreaming(true)
    setDockerContainerName(containerName)
    setShowDockerModal(false)

    window.api.onDockerLogLine((line) => {
      if (!parserDetectedRef.current) {
        lineAccumulatorRef.current.push(line)
        if (lineAccumulatorRef.current.length >= 20) {
          const detected = detectParser(lineAccumulatorRef.current)
          detectedParserRef.current = detected
          parserDetectedRef.current = true
          setParserName(detected?.name ?? 'plain text')
          const batch = parseLines(lineAccumulatorRef.current, detected, 0)
          nextIdRef.current = batch.length
          lineAccumulatorRef.current = []
          setAllEntries(batch)
        }
        return
      }
      const newEntries = parseLines([line], detectedParserRef.current, nextIdRef.current)
      nextIdRef.current += newEntries.length
      setAllEntries((prev) => [...prev, ...newEntries])
    })

    window.api.onDockerStreamEnd(() => {
      setDockerStreaming(false)
      setDockerContainerName(null)
      // Flush any accumulated lines that never reached the 20-line threshold
      if (!parserDetectedRef.current && lineAccumulatorRef.current.length > 0) {
        const detected = detectParser(lineAccumulatorRef.current)
        const batch = parseLines(lineAccumulatorRef.current, detected, 0)
        setAllEntries(batch)
        setParserName(detected?.name ?? 'plain text')
        lineAccumulatorRef.current = []
      }
    })
  }, [])

  const handleStopDocker = useCallback(async () => {
    await window.api.stopDockerStream()
    window.api.removeDockerLogListeners()
    setDockerStreaming(false)
    setDockerContainerName(null)
  }, [])

  const handleClear = useCallback(() => {
    setAllEntries([])
    setFilePath(null)
    setParserName('')
    setError(null)
    setSearchQuery('')
    setActiveLevels(new Set(ALL_LEVELS))
    nextIdRef.current = 0
    detectedParserRef.current = null
    parserDetectedRef.current = false
    lineAccumulatorRef.current = []
  }, [])

  useEffect(() => {
    return () => {
      window.api.removeDockerLogListeners()
    }
  }, [])

  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        dragCounter.current++
        setIsDragging(true)
      }
    }
    const onDragLeave = () => {
      dragCounter.current--
      if (dragCounter.current <= 0) {
        dragCounter.current = 0
        setIsDragging(false)
      }
    }
    const onDragOver = (e: DragEvent) => e.preventDefault()
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      dragCounter.current = 0
      setIsDragging(false)
      const file = e.dataTransfer?.files[0]
      if (file) handleFileDrop(file)
    }
    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [handleFileDrop])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault()
        handleOpenFile()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleOpenFile])

  const toggleLevel = useCallback((level: LogLevel) => {
    setActiveLevels((prev) => {
      const next = new Set(prev)
      if (next.has(level)) next.delete(level)
      else next.add(level)
      return next
    })
  }, [])

  const toggleAllLevels = useCallback(() => {
    setActiveLevels(new Set(ALL_LEVELS))
  }, [])

  const filteredEntries = allEntries.filter((entry) => {
    if (!activeLevels.has(entry.level)) return false
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      entry.message.toLowerCase().includes(q) ||
      entry.logger.toLowerCase().includes(q) ||
      entry.stackTrace.toLowerCase().includes(q) ||
      entry.timestamp.includes(q)
    )
  })

  return (
    <div className="app-root">
      <Toolbar
        onOpenFile={handleOpenFile}
        onPaste={() => setShowPaste(true)}
        activeLevels={activeLevels}
        allLevels={ALL_LEVELS}
        onToggleLevel={toggleLevel}
        onToggleAll={toggleAllLevels}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        levelCounts={getLevelCounts(allEntries)}
        onOpenDocker={() => setShowDockerModal(true)}
        dockerStreaming={dockerStreaming}
        dockerContainerName={dockerContainerName}
        onStopDocker={handleStopDocker}
        onClear={handleClear}
        hasLogs={allEntries.length > 0}
      />
      <LogViewer
        entries={filteredEntries}
        totalCount={allEntries.length}
        isLoading={isLoading}
        error={error}
        searchQuery={searchQuery}
        filePath={filePath}
        parserName={parserName}
        isStreaming={dockerStreaming}
        streamingContainerName={dockerContainerName}
        autoScroll={autoScroll}
        onToggleAutoScroll={() => setAutoScroll((v) => !v)}
      />
      {isDragging && <DropZone />}
      {showPaste && (
        <PasteModal
          onClose={() => setShowPaste(false)}
          onSubmit={(content) => {
            setShowPaste(false)
            loadContent(content, null)
          }}
        />
      )}
      {showDockerModal && (
        <DockerModal
          onClose={() => setShowDockerModal(false)}
          onStart={handleStartDocker}
        />
      )}
    </div>
  )
}
