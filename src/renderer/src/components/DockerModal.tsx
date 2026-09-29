import { useState, useEffect } from 'react'

interface Props {
  onClose: () => void
  onStart: (containerId: string, containerName: string) => void
}

export default function DockerModal({ onClose, onStart }: Props): JSX.Element {
  const [containers, setContainers] = useState<DockerContainer[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchContainers = async (): Promise<void> => {
    setLoading(true)
    setFetchError(null)
    setSelected(null)
    const result = await window.api.listContainers()
    if (result.success) {
      setContainers(result.containers ?? [])
    } else {
      setFetchError(result.error ?? 'Failed to list containers')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchContainers()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && selected) {
        const c = containers.find((c) => c.id === selected)
        if (c) onStart(c.id, c.name)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected, containers, onClose, onStart])

  const handleStart = (): void => {
    if (!selected) return
    const c = containers.find((c) => c.id === selected)
    if (c) onStart(c.id, c.name)
  }

  const renderBody = (): JSX.Element => {
    if (loading) {
      return <div className="docker-modal-state">Fetching containers&hellip;</div>
    }
    if (fetchError) {
      return (
        <div className="docker-modal-state docker-modal-error">
          <span>{fetchError}</span>
          <button className="btn-secondary" onClick={fetchContainers}>
            Retry
          </button>
        </div>
      )
    }
    if (containers.length === 0) {
      return (
        <div className="docker-modal-state">
          <span>No running containers found.</span>
          <button className="btn-secondary" onClick={fetchContainers}>
            Refresh
          </button>
        </div>
      )
    }
    return (
      <ul className="docker-container-list">
        {containers.map((c) => (
          <li
            key={c.id}
            className={`docker-container-item${selected === c.id ? ' selected' : ''}`}
            onClick={() => setSelected(c.id)}
          >
            <div className="docker-container-name">{c.name}</div>
            <div className="docker-container-image">{c.image}</div>
            <div className="docker-container-status">{c.status}</div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Select Docker Container</span>
          <button className="modal-close" onClick={onClose} title="Close (Esc)">
            &times;
          </button>
        </div>
        <div className="modal-body docker-modal-body">{renderBody()}</div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleStart} disabled={!selected}>
            Start Streaming
          </button>
        </div>
      </div>
    </div>
  )
}
