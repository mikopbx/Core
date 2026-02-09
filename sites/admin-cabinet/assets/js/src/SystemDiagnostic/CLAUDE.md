# SystemDiagnostic Module

Log viewer with SVG timeline for MikoPBX system logs.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (JavaScript)                     │
├──────────────────────┬──────────────────────────────────────┤
│ system-diagnostic-   │ Main controller: file selection,     │
│ index-showlogs.js    │ log loading, filter handling         │
├──────────────────────┼──────────────────────────────────────┤
│ system-diagnostic-   │ SVGTimeline - Grafana-style timeline │
│ svg-timeline.js      │ with range selection, truncated zones│
└──────────────────────┴──────────────────────────────────────┘
                              ↓ SyslogAPI
┌─────────────────────────────────────────────────────────────┐
│                   Backend (PHP REST API)                     │
│            src/PBXCoreREST/Lib/SysLogs/                      │
├─────────────────────────────────────────────────────────────┤
│ GetLogFromFileAction - Time filtering, pagination, latest   │
│ LogTimestampParser   - Multi-format timestamp parsing       │
└─────────────────────────────────────────────────────────────┘
```

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
