# SystemDiagnostic (admin UI: log viewer, packet capture, sysinfo)

Backend for `SyslogAPI`/`SysinfoAPI` lives in `src/PBXCoreREST/Lib/SysLogs/`
(`GetLogFromFileAction` does time filtering/pagination, `LogTimestampParser` the formats).

## Loading and build
- Files are plain globals loaded as separate `<script>` tags in the order fixed by
  `AssetProvider::makeSystemDiagnosticAssets()`. A new file is invisible until added there.
- `system-diagnostic-infinite-scroll.js` is registered nowhere and referenced by nothing;
  do not build on it. `TimeSlider` is loaded but only used to mirror
  `serverTimezoneOffset`; `SVGTimeline` is the live time control.
- Transpile with the `babel-compiler` skill (target `core`); output lands in
  `sites/admin-cabinet/assets/js/pbx/SystemDiagnostic/`.

## Log viewer invariants (showlogs + svg-timeline)
- `latest` flag of the API call: handle drag and initial load always `true` (tail);
  clicking a truncated zone uses `true` for the left zone, `false` for the right one.
  Never send `latest=false` on drag: the head is read, the 5000-line cap cuts the newest
  entries and a truncated zone appears on the right, hiding recent data.
- `selectedRange` (data window) is always 1/4 of `visibleRange`, centered;
  `visibleRange` may extend beyond `fullRange` to keep that ratio.
- Request `lines` is clamped to 100..5000 client-side.
- Rotated files (`isRotatedLogFile`, matches `.N`, `.gz`, `.N.gz`) are static: auto-refresh
  is forced off and the range end is `currentTimeRange.end`, not `Date.now()`.
- Auto-refresh anchors on `lastKnownDataEnd` (timestamp of the last line actually
  returned), not on wall-clock time, so idle logs do not produce empty ranges.
- Deep links: `#file=<encoded path>` selects the file; `?filter=` pre-fills filters as a
  JSON array of `{type, value}` or a legacy `&`-separated list of contains-terms.

## Packet capture
- Capture state is server-side (`SyslogAPI.getCaptureStatus`); do not reintroduce
  `sessionStorage`. The archive worker polls every 3 s, gives up after 50 errors and calls
  `systemDiagnosticCapture.resetCaptureState()` on both success and failure.
