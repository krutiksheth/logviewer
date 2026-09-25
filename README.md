# Log Viewer

A fast, open-source desktop application for viewing and analysing structured log files. Built with Electron, React, and TypeScript.

> **Open Source** — MIT licensed. Contributions welcome.

---

## Features

- **Multi-format support** — auto-detects log4net and Serilog formats; easily extensible to others
- **Level filtering** — toggle FATAL / ERROR / WARN / INFO / DEBUG / TRACE independently, with per-level entry counts
- **Full-text search** — instant filter across all log entries
- **Stack trace expansion** — click any entry to expand / collapse its attached stack trace
- **Drag & drop** — drop a `.log` or `.txt` file directly onto the window
- **Paste mode** — paste raw log text without saving to disk first
- **Virtualised list** — handles large files smoothly using TanStack Virtual (dynamic row heights)
- **Dark theme** — easy on the eyes during long debugging sessions

---

## Screenshots

_Coming soon._

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm 9 or later

### Install dependencies

```bash
npm install
```

### Run in development

```bash
npm run dev
```

Opens an Electron window with hot-reload via electron-vite.

### Production build

```bash
npm run build
```

Output goes to `out/`.

### Package as distributable

```bash
npm run package
```

Creates platform-specific installers via electron-builder in the `dist/` directory.

---

## Usage

| Action | How |
|---|---|
| Open a file | Click **Open File** or press `Ctrl+O` |
| Paste log text | Click **Paste** and enter text in the modal |
| Drag & drop | Drop any `.log` / `.txt` file onto the window |
| Filter by level | Click the level pills (FATAL, ERROR, WARN, …) in the toolbar |
| Show all levels | Click **ALL** |
| Search | Type in the search box (top right) |
| Expand stack trace | Click any log entry row |

---

## Supported Log Formats

### log4net

Pattern-based XML or plain-text log4net output. Parsed from the standard
`%date %thread %level %logger %message %exception` layout.

### Serilog

Structured text output from Serilog's default console/file sinks.

### Adding a new format

1. Create `src/renderer/src/parsers/<format>.ts` implementing the `LogParser` interface:

```ts
export interface LogParser {
  name: string
  canParse(content: string): boolean
  parse(content: string): LogEntry[]
}
```

2. Register it in the `parsers[]` array in `src/renderer/src/parsers/index.ts`.

`detectAndParse()` will automatically try each registered parser and use the first one whose `canParse()` returns `true`.

---

## Project Structure

```
src/
  main/index.ts          — Electron main process: file dialog + file read IPC handlers
  preload/index.ts       — contextBridge: exposes window.api.{openFile, readFile}
  preload/index.d.ts     — TypeScript types for window.api
  renderer/
    index.html
    src/
      App.tsx            — Root state: entries, level filters, search, drag/drop
      index.css          — Dark-theme CSS (custom properties, no framework)
      parsers/
        types.ts         — LogEntry, LogLevel, LogParser interfaces
        log4net.ts       — log4net parser
        index.ts         — detectAndParse() auto-detection
      components/
        Toolbar.tsx      — File open/paste buttons, level filter pills, search input
        LogViewer.tsx    — Virtualised log list + status bar
        LogEntry.tsx     — Collapsible row with stack trace support
        DropZone.tsx     — Full-window drag-and-drop overlay
        PasteModal.tsx   — Paste textarea modal
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 33 |
| Build / dev server | electron-vite 2 (Vite 5) |
| UI | React 18 + TypeScript 5 |
| Virtual list | @tanstack/react-virtual v3 |
| Styling | Plain CSS with custom properties |
| Packaging | electron-builder |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes
4. Open a pull request

Please keep pull requests focused — one feature or fix per PR. For larger changes, open an issue first to discuss the approach.

---

## License

[MIT](LICENSE)
