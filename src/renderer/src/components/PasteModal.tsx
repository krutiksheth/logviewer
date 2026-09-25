import { useState, useEffect, useRef } from 'react'

interface Props {
  onClose: () => void
  onSubmit: (content: string) => void
}

export default function PasteModal({ onClose, onSubmit }: Props): JSX.Element {
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.ctrlKey && e.key === 'Enter' && content.trim()) onSubmit(content)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [content, onClose, onSubmit])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Paste Log Content</span>
          <button className="modal-close" onClick={onClose} title="Close (Esc)">
            &times;
          </button>
        </div>
        <div className="modal-body">
          <textarea
            ref={textareaRef}
            className="modal-textarea"
            placeholder="Paste log content here&#8230;  (Ctrl+Enter to parse)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => content.trim() && onSubmit(content)}
            disabled={!content.trim()}
          >
            Parse Logs
          </button>
        </div>
      </div>
    </div>
  )
}
