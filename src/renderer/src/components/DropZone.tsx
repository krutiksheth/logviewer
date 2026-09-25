export default function DropZone(): JSX.Element {
  return (
    <div className="drop-overlay">
      <div className="drop-box">
        <span className="drop-icon">&#128193;</span>
        <span className="drop-text">Drop log file to open</span>
      </div>
    </div>
  )
}
