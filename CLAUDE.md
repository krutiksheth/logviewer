# Log Viewer — Project Intelligence

## Documentation rule
**Always use Context7 MCP** when referencing any library, framework, or API in this project.
Steps: `resolve-library-id` → pick best match → `query-docs` per concept.
Applies to: Electron, electron-vite, React, TanStack Virtual, TypeScript, Node.js fs, electron-builder, Vite.

## Stack
| Layer | Technology |
|---|---|
| Desktop shell | Electron 33 |
| Build / dev server | electron-vite 2 (Vite 5 under the hood) |
| UI | React 18 + TypeScript 5 |
| Virtual list | @tanstack/react-virtual v3 |
| Styling | Plain CSS with custom properties (no framework) |
| Packaging | electron-builder |

## Project structure
```
src/
  main/index.ts          — Electron main: IPC handlers (dialog:openFile, file:read)
  preload/index.ts       — contextBridge → exposes window.api.{openFile, readFile}
  preload/index.d.ts     — window.api type declarations
  renderer/
    index.html
    src/
      App.tsx            — top-level state: entries, activeLevels, searchQuery, drag/drop
      index.css          — dark-theme CSS (CSS custom properties, no Tailwind)
      parsers/
        types.ts         — LogEntry, LogLevel, LogParser interfaces
        log4net.ts       — log4net parser (implements LogParser)
        index.ts         — detectAndParse(): auto-detects format from parsers[]
      components/
        Toolbar.tsx      — Open/Paste buttons, level filter pills, search box
        LogViewer.tsx    — TanStack Virtual list + status bar
        LogEntry.tsx     — collapsible row; click to expand stack trace
        DropZone.tsx     — full-window drag overlay
        PasteModal.tsx   — paste textarea modal
```

## Key conventions

### Adding a new log format (e.g. serilog)
1. Create `src/renderer/src/parsers/serilog.ts` implementing `LogParser`
2. Register it in the `parsers[]` array in `parsers/index.ts`
3. `detectAndParse()` auto-picks the first parser whose `canParse()` returns true

### IPC pattern
- Main process: `ipcMain.handle('channel', handler)` in `src/main/index.ts`
- Preload: `ipcRenderer.invoke('channel', args)` wrapped in `src/preload/index.ts`
- Renderer: `window.api.methodName()` — type-safe via `src/preload/index.d.ts`

### Line-ending safety
Always split log content with `/\r?\n/` — Windows files use `\r\n`; JavaScript's `.` metachar
does not match `\r`, so `(.*)$` will fail to match lines ending with `\r`.

### TanStack Virtual — dynamic row heights
Use `ref={virtualizer.measureElement}` + `data-index={virtualItem.index}` on each item's
outer div. ResizeObserver automatically picks up height changes (e.g. expand/collapse).
Use `getItemKey: (i) => entries[i]?.id` so React unmounts/remounts correctly after filtering.

### Level filter state
`activeLevels` is a `Set<LogLevel>`. "ALL" button always resets to full set — never toggles
to empty (that would hide all entries). Individual level buttons independently toggle.

### CSS class naming
Entry-level classes use `lvl-{LEVEL}` prefix (e.g. `lvl-ERROR`, `lvl-WARN`).
Behaviour-driven classes use descriptive names (`expandable`, `active`, `state-error`).

## Dev commands
```bash
npm run dev      # start electron-vite dev server + Electron window
npm run build    # production build → out/
npm run package  # build + electron-builder → distributable
```
