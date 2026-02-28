# SystemDiagnostic Module

Log viewer with SVG timeline, network packet capture, and system information viewer for MikoPBX.

## File Inventory

```
SystemDiagnostic/
├── CLAUDE.md                                        # This file
├── system-diagnostic-index.js                       # Main entry point / tab controller
├── system-diagnostic-index-showlogs.js              # Log viewer tab (file selection, filtering, loading)
├── system-diagnostic-index-showlogs-worker.js       # Auto-refresh worker for log viewer
├── system-diagnostic-index-logcapture.js            # Network packet capture tab (tcpdump UI)
├── system-diagnostic-index-logscapture-worker.js    # Archive packing progress poller
├── system-diagnostic-index-sysinfo.js               # System information viewer tab
├── system-diagnostic-svg-timeline.js                # SVGTimeline - Grafana-style timeline with range selection
├── system-diagnostic-infinite-scroll.js             # Bidirectional infinite scroll for ACE editor
└── system-diagnostic-time-slider.js                 # Fomantic UI range slider for time navigation
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Frontend (JavaScript)                           │
├─────────────────────────┬───────────────────────────────────────────────┤
│ system-diagnostic-      │ Main controller: Fomantic UI tab menu,       │
│ index.js                │ default tab 'show-log', container removal    │
├─────────────────────────┼───────────────────────────────────────────────┤
│ system-diagnostic-      │ Log viewer: file selection (tree dropdown),  │
│ index-showlogs.js       │ time filtering, log level, text filters,     │
│ (systemDiagnosticLogs)  │ quick period buttons, URL filter init        │
├─────────────────────────┼───────────────────────────────────────────────┤
│ system-diagnostic-      │ Auto-refresh: polls updateLogFromServer()    │
│ index-showlogs-         │ every 3 seconds, can be started/stopped      │
│ worker.js               │                                              │
├─────────────────────────┼───────────────────────────────────────────────┤
│ system-diagnostic-      │ Packet capture UI: start/stop/download       │
│ index-logcapture.js     │ buttons, server-side state management via    │
│ (systemDiagnosticCapture)│ SyslogAPI.getCaptureStatus                  │
├─────────────────────────┼───────────────────────────────────────────────┤
│ system-diagnostic-      │ Archive poller: checks SyslogAPI.            │
│ index-logscapture-      │ downloadArchive every 3s, shows progress %,  │
│ worker.js               │ triggers download when READY, error threshold│
│ (archivePackingCheckWorker)│ of 50                                     │
├─────────────────────────┼───────────────────────────────────────────────┤
│ system-diagnostic-      │ System info viewer: lazy-loads via           │
│ index-sysinfo.js        │ SysinfoAPI.getInfo, ACE editor (Julia mode,  │
│ (systemDiagnosticSysyinfo)│ Monokai theme), read-only display          │
├─────────────────────────┼───────────────────────────────────────────────┤
│ system-diagnostic-      │ SVGTimeline: Grafana-style timeline with     │
│ svg-timeline.js         │ range selection, truncated zones, drag       │
│                         │ handles, no-data zones, now marker           │
├─────────────────────────┼───────────────────────────────────────────────┤
│ system-diagnostic-      │ InfiniteScroll: bidirectional scroll for ACE │
│ infinite-scroll.js      │ editor, 10% threshold, time-based chunks,   │
│                         │ buffer trimming at 5000 max lines            │
├─────────────────────────┼───────────────────────────────────────────────┤
│ system-diagnostic-      │ TimeSlider: Fomantic UI range slider,        │
│ time-slider.js          │ debounced change (500ms), 6 time labels,    │
│                         │ server timezone formatting                   │
└─────────────────────────┴───────────────────────────────────────────────┘
                              ↓ SyslogAPI / SysinfoAPI
┌─────────────────────────────────────────────────────────────────────────┐
│                      Backend (PHP REST API)                             │
│               src/PBXCoreREST/Lib/SysLogs/                              │
├─────────────────────────────────────────────────────────────────────────┤
│ GetLogFromFileAction   - Time filtering, pagination, latest            │
│ LogTimestampParser     - Multi-format timestamp parsing                │
│ StartCaptureAction     - Start tcpdump packet capture                  │
│ StopCaptureAction      - Stop tcpdump packet capture                   │
│ DownloadArchiveAction  - Pack and download capture archive             │
│ GetCaptureStatusAction - Server-side capture state management          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Three Tabs

1. **show-log** (default) - Log file viewer with timeline, filters, and infinite scroll
2. **capture** - Network packet capture (tcpdump) with start/stop/download
3. **show-sysinfo** - System information viewer (lazy-loaded, read-only ACE editor)

## Key Concepts

### Rotated Log Files
- Pattern: `/\.\d+($|\.gz$)|\.gz$/` (`.0`, `.1`, `.gz`, `.0.gz`)
- No auto-refresh (static content)
- Use `currentTimeRange.end` instead of `Date.now()`

### Timeline Ranges
- `fullRange` - Entire log file time boundaries
- `visibleRange` - What user sees on timeline (controlled by period buttons)
- `selectedRange` - Data loading window (always 1/4 of visibleRange)

### Truncated Zones
- `latest=true` → `tail` → truncation from LEFT (oldest entries cut)
- `latest=false` → `head` → truncation from RIGHT (newest entries cut)
- Click on zone loads missing data for that period

### `latest` Parameter Strategy
- **Handle drag (left or right)**: Always `latest=true` — user expects to see the most recent log entries regardless of which handle they drag. Truncation (if any) appears on the LEFT side.
- **Truncated zone click (left)**: `latest=true` — reload the missing older part
- **Truncated zone click (right)**: `latest=false` — reload the missing newer part
- **Initial load**: `latest=true` — show tail of the log
- **Period buttons**: trigger `onRangeChange` → `latest=true`

**Why always `latest=true` for handle drag:**
If `latest=false` were used when dragging the left handle leftward, the API reads from the beginning (head). When data exceeds the 5000-line limit, the newest entries get truncated, causing a `timeline-truncated` zone to appear on the RIGHT side. This is confusing because the user expands the range but loses visibility of recent data.

### Log Viewer Features (showlogs)
- `filterConditions` array for cascading contains/notContains filters
- `lastKnownDataEnd` for anchoring refresh to real data timestamps (prevents empty ranges for idle logs)
- `isInitializing` flag to prevent duplicate API calls
- `initializeFilterFromUrl()` for pre-filling filter from URL query parameter (`#file=asterisk%2Fverbose`)
- Quick period buttons and "Now" button handling
- Log level dropdown with `DynamicDropdownBuilder`
- Custom tree-based dropdown menu for file selection

### Packet Capture (logcapture)
- Uses **server-side state** via `SyslogAPI.getCaptureStatus` (not sessionStorage)
- Callbacks: `cbAfterStartCapture`, `cbAfterStopCapture`, `cbAfterDownloadCapture`
- `resetCaptureState()` called by the worker after download completes
- Archive packing worker polls every 3 seconds with error threshold of 50

### API Parameters
```javascript
{
  filename: 'fail2ban/fail2ban.log',
  dateFrom: 1770541346,  // Unix timestamp
  dateTo: 1770553623,
  lines: 5000,           // Max lines limit
  latest: true           // true=newest first (tail), false=oldest first (head)
}
```

## Babel Compilation
```bash
docker run --rm -v "$(pwd):/workspace" -w /app \
  ghcr.io/mikopbx/babel-compiler:latest \
  "/workspace/sites/admin-cabinet/assets/js/src/SystemDiagnostic/FILE.js"
```

## SVG Timeline Dynamic Elements

The timeline SVG dynamic layer contains these elements (in order):
1. `timeline-no-data` (left) — zone before first data point
2. `timeline-no-data` (right) — zone after last data point (with popup "Нет данных за этот период")
3. `timeline-truncated` (left) — truncated zone when `latest=true` (oldest data cut)
4. `timeline-truncated` (right) — truncated zone when `latest=false` (newest data cut)
5. `timeline-now` — current time marker line
6. `timeline-boundary` (left) — actual data start boundary
7. `timeline-boundary` (right) — actual data end boundary
8. `timeline-selection` — purple selected range
9. `timeline-handle` (left) — draggable left handle
10. `timeline-handle` (right) — draggable right handle

### Key State Flow
```
Handle drag → onRangeChange(start, end, 'left'|'right')
  → loadLogByTimeRange(start, end, latest=true)
    → API call with dateFrom/dateTo/latest
      → updateFromServerResponse(actualRange, requestedStart, requestedEnd)
        → sets truncation zones based on truncated_direction
        → preserves visibleRange if extended beyond data
        → render()
```

## Debugging
Console logs available:
- `[onTruncatedZoneClick]` - Truncated zone click params
- `[loadLogByTimeRange]` - Request/response details
- `[updateFromServerResponse]` - Timeline state updates
- `[updateDynamicElements]` - noDataRight visibility checks
- `[updateDataBoundary]` - actual data end boundary updates
