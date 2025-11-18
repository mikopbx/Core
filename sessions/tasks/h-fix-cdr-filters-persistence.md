---
name: h-fix-cdr-filters-persistence
branch: fix/h-fix-cdr-filters-persistence
status: pending
created: 2025-11-18
---

# Fix CDR Filters Persistence

## Problem/Goal
The Call Detail Records page (/admin-cabinet/call-detail-records/index/) currently resets all filters and settings when:
- User switches between pages (pagination)
- User changes the time period filter
- User refreshes the page with F5

The expected behavior is:
- Filters and settings should persist across pagination
- Filters and settings should persist across F5 refresh
- Filters should ONLY reset when navigating to the page with the `#reset-cache` hash

## Success Criteria
- [ ] Calendar (date range) values persist and are restored correctly
- [ ] Search field content persists and is restored
- [ ] Current page selection in DataTable pagination persists
- [ ] Filters persist when switching between pages in the DataTable
- [ ] Filters persist when changing the time period and refreshing
- [ ] Filters persist across F5 page refresh
- [ ] Filters reset only when the URL contains `#reset-cache` hash
- [ ] Filters do NOT persist after user logout/login (session-based only)
- [ ] All existing CDR functionality continues to work correctly

## Context Manifest

### How CDR Page Currently Works: Complete Data Flow

The Call Detail Records (CDR) page is a **REST API v3-based DataTables implementation** that has been fully migrated from the old server-side controller approach to a modern client-side REST API architecture. Understanding this architecture is critical because all filter state must be managed entirely in JavaScript.

#### Page Load and Initialization Flow

When a user navigates to `/admin-cabinet/call-detail-records/index/`, here's the complete sequence:

1. **Controller Does Nothing** - `CallDetailRecordsController::indexAction()` (at `/Users/nb/PhpstormProjects/mikopbx/Core/src/AdminCabinet/Controllers/CallDetailRecordsController.php`) is completely empty. It only renders the Volt template and exits. This is intentional - all data operations happen via REST API.

2. **View Renders Static HTML** - The Volt template at `/Users/nb/PhpstormProjects/mikopbx/Core/src/AdminCabinet/Views/CallDetailRecords/index.volt` creates:
   - Date range picker input (`#date-range-selector`)
   - Global search field (`#globalsearch`)
   - Search helper dropdown (`#search-cdr-input`)
   - Page length dropdown (`#page-length-select`)
   - DataTable container (`#cdr-table`)
   - Empty database placeholder (hidden initially)

3. **JavaScript Module Loads** - The main file `/Users/nb/PhpstormProjects/mikopbx/Core/sites/admin-cabinet/assets/js/src/CallDetailRecords/call-detail-records-index.js` initializes via `$(document).ready()`.

4. **Metadata Request (Prevents Double Loading)** - Instead of immediately initializing the DataTable, `callDetailRecords.initialize()` first calls `fetchLatestCDRDate()` which:
   - Uses `CdrAPI.getMetadata()` (defined in `/Users/nb/PhpstormProjects/mikopbx/Core/sites/admin-cabinet/assets/js/src/PbxAPI/cdr-api.js`)
   - Calls REST API endpoint: `GET /pbxcore/api/v3/cdr:getMetadata?limit=100`
   - Returns ONLY metadata (earliest/latest dates from last 100 records, hasRecords flag)
   - **WHY**: This lightweight request determines if the database has any records at all, avoiding a heavy data request if the DB is empty

5. **Conditional Initialization Based on Metadata**:
   - **If `hasRecords === false`**: Shows placeholder message, **never initializes DataTable**
   - **If `hasRecords === true`**: Calls `initializeDateRangeSelector()` with date range from metadata, then calls `initializeDataTableAndHandlers()`

#### Date Range Selector Implementation (daterangepicker Plugin)

The date picker is implemented using the **daterangepicker jQuery plugin** (NOT a custom implementation):

```javascript
// In initializeDateRangeSelector(startDate, endDate)
callDetailRecords.$dateRangeSelector.daterangepicker(options, callback);
```

Key configuration:
- **Initial Range**: Uses `startDate`/`endDate` from metadata (covering last 100 records)
- **Preset Ranges**: Today, Yesterday, Last Week, Last 30 Days, This Month, Last Month
- **Max Date**: Current date (can't select future dates)
- **Callback**: `cbDateRangeSelectorOnSelect()` which calls `applyFilter()` to redraw DataTable

**Critical Detail**: Date values are stored INSIDE the daterangepicker plugin instance via `$dateRangeSelector.data('daterangepicker')`. They are NOT stored in a separate JavaScript variable. This is accessed during every DataTable AJAX request:

```javascript
// Inside ajax.data function
const dateRangePicker = callDetailRecords.$dateRangeSelector.data('daterangepicker');
if (dateRangePicker) {
    const startDate = dateRangePicker.startDate;
    const endDate = dateRangePicker.endDate;
    params.dateFrom = startDate.format('YYYY-MM-DD');
    params.dateTo = endDate.endOf('day').format('YYYY-MM-DD HH:mm:ss');
}
```

#### DataTable Initialization and Configuration

The DataTable is initialized with these critical settings:

```javascript
callDetailRecords.$cdrTable.dataTable({
    serverSide: true,        // All data comes from REST API
    processing: true,        // Show processing indicator
    paging: true,            // Enable pagination
    sDom: 'rtip',            // DOM: processing, table, info, pagination (NO filter/length)
    pageLength: callDetailRecords.getPageLength(),  // From localStorage
    // NO stateSave: true - THIS IS THE PROBLEM
});
```

**Critical Missing Feature**: Unlike the Extensions page (`/Users/nb/PhpstormProjects/mikopbx/Core/sites/admin-cabinet/assets/js/src/Extensions/extensions-index.js` line 199), the CDR DataTable does NOT have `stateSave: true` enabled. The Extensions page uses DataTables' built-in state saving which automatically persists:
- Current page number
- Search value
- Sort order
- Page length

This state is stored in **localStorage** with key format: `DataTables_{tableId}_{url}` (e.g., `DataTables_extensions-table_/admin-cabinet/extensions/index/`).

#### AJAX Data Request Flow

Every time the DataTable needs data (initial load, pagination, search), it calls:

```javascript
ajax: {
    url: '/pbxcore/api/v3/cdr',
    type: 'GET',
    data: function(d) {
        // d contains DataTables request params (start, length, draw, search, etc.)

        // 1. ALWAYS read dates from daterangepicker instance
        const dateRangePicker = callDetailRecords.$dateRangeSelector.data('daterangepicker');
        params.dateFrom = startDate.format('YYYY-MM-DD');
        params.dateTo = endDate.endOf('day').format('YYYY-MM-DD HH:mm:ss');

        // 2. Process search keyword (with prefixes: src:, dst:, did:, linkedid:)
        const searchKeyword = d.search.value || '';
        // ... parse prefixes and set params.src_num, params.dst_num, etc.

        // 3. Pagination params
        params.limit = d.length;
        params.offset = d.start;
        params.sort = 'start';
        params.order = 'DESC';
        params.grouped = true;  // Always return grouped records

        return params;
    },
    beforeSend: function(xhr) {
        // Add JWT Bearer token (managed by TokenManager)
        xhr.setRequestHeader('Authorization', `Bearer ${TokenManager.accessToken}`);
    }
}
```

The REST API backend is at `/Users/nb/PhpstormProjects/mikopbx/Core/src/PBXCoreREST/Lib/Cdr/GetListAction.php`.

#### Current Filter State Management (The Problem)

Currently, filter state is managed as follows:

1. **Date Range**: Stored ONLY in daterangepicker plugin instance (NOT persistent)
2. **Search Text**: Stored ONLY in DataTables internal state (NOT persistent without stateSave)
3. **Page Number**: Stored ONLY in DataTables internal state (NOT persistent without stateSave)
4. **Page Length**: **IS persistent** via `localStorage.getItem('cdrTablePageLength')` (lines 219, 312-327, 636-638)

**What Happens on Page Events**:
- **F5 Refresh**: All state lost except page length - DataTable reinitializes from scratch
- **Pagination Click**: DataTable stays alive, current page changes but search/dates remain in memory
- **Date Change**: Triggers `cbDateRangeSelectorOnSelect()` which calls `applyFilter()` - dates change in daterangepicker, DataTable reloads with new dates
- **Search Input**: Triggers debounced `applyFilter(text)` which calls `dataTable.search(text).draw()` - search term stored in DataTable memory

#### How Extensions Page Solves This (The Reference Pattern)

The Extensions page (`extensions-index.js`) demonstrates the correct pattern:

1. **Enables DataTables stateSave**:
```javascript
extensionsIndex.$extensionsList.DataTable({
    stateSave: true,  // LINE 199
});
```

2. **Hash-based Cache Reset**:
```javascript
// LINE 189-191: Check hash BEFORE initializing DataTable
if (window.location.hash === "#reset-cache") {
    localStorage.removeItem('DataTables_extensions-table_/admin-cabinet/extensions/index/');
}

// LINE 136-141: Handle reset link click
$(`a[href='${globalRootUrl}extensions/index/#reset-cache']`).on('click', function(e) {
    e.preventDefault();
    extensionsIndex.$extensionsList.DataTable().state.clear();
    window.location.hash = '#reset-cache';
    window.location.reload();
});
```

3. **Restore Search from State**:
```javascript
// LINE 464-468: After DataTable initialized
const state = extensionsIndex.dataTable.state.loaded();
if (state && state.search) {
    extensionsIndex.$globalSearch.val(state.search.search);
}
```

**Critical localStorage Key Pattern**: DataTables generates keys like:
- `DataTables_extensions-table_/admin-cabinet/extensions/index/`
- Format: `DataTables_{tableId}_{urlPath}`

For CDR, this would be: `DataTables_cdr-table_/admin-cabinet/call-detail-records/index/`

#### Session vs Browser Session Handling

**Important Distinction**:
- **Browser Session** = sessionStorage (clears on tab close)
- **User Login Session** = JWT tokens managed by TokenManager (stored in httpOnly cookie + memory)

The CDR page should use **sessionStorage** (NOT localStorage) because:
1. Filters should persist during browser session (F5 refresh)
2. Filters should NOT persist after logout/login (different user might have different access)
3. Filters should clear when browser tab closes (fresh start next time)

**TokenManager Architecture** (from `token-manager.js`):
- Access token (JWT, 15 min) stored in **memory** (NOT localStorage - XSS protection)
- Refresh token (30 days) stored in **httpOnly cookie** (automatically managed)
- All AJAX requests automatically include `Authorization: Bearer` header
- Silent refresh before token expiration
- Logout clears tokens and redirects to `/session/end` which clears cookie server-side

**When User Logs Out**:
- `TokenManager.logout()` is called
- Redirects to `/session/end` → `SessionController::endAction()` clears httpOnly cookie
- **sessionStorage is automatically cleared by browser**
- User is redirected to login page

This means sessionStorage-based filter persistence will automatically reset on logout.

#### Search Field Implementation Details

The search field has a helper dropdown (`#search-cdr-input`) using Semantic UI Search component:

```javascript
callDetailRecords.$searchCDRInput.search({
    source: [
        { title: 'Search by Source Number', value: 'src:' },
        { title: 'Search by Destination Number', value: 'dst:' },
        { title: 'Search by DID', value: 'did:' },
        { title: 'Search by LinkedID', value: 'linkedid:' },
        { title: 'Search by Custom Phrase', value: '' },
    ],
    onSelect: function(result) {
        callDetailRecords.$globalSearch.val(result.value);
    }
});
```

Search is debounced (500ms delay) and triggers on:
- Enter key (keyCode 13)
- Backspace (keyCode 8)
- Empty value (clear search)

The actual search value is stored in `callDetailRecords.$globalSearch.val()` and passed to DataTable via `dataTable.search(text).draw()`.

### For New Feature Implementation: Filter Persistence with sessionStorage

Since we're implementing filter persistence that should survive F5 refresh but NOT survive logout, we need to:

#### 1. Use sessionStorage Instead of DataTables stateSave

DataTables' built-in `stateSave` uses **localStorage** which persists across logout. We need **sessionStorage** for security and UX reasons.

Create custom state management:
```javascript
// Storage key pattern (session-based, not localStorage)
const STORAGE_KEY = 'cdr_filters_state';

// What to persist
const state = {
    dateFrom: '2024-01-01',      // From daterangepicker
    dateTo: '2024-12-31',        // From daterangepicker
    searchText: 'src:201',       // From #globalsearch input
    currentPage: 0,              // From DataTable page.info().page
    pageLength: 25               // Already persisted separately in localStorage
};

// Save to sessionStorage
sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));

// Load from sessionStorage
const savedState = sessionStorage.getItem(STORAGE_KEY);
if (savedState) {
    const state = JSON.parse(savedState);
    // Restore filters...
}
```

#### 2. Modify Date Range Initialization

Current flow:
1. Fetch metadata → get earliest/latest dates
2. Initialize daterangepicker with those dates
3. Initialize DataTable

New flow:
1. **Check sessionStorage FIRST**
2. If saved state exists AND NOT #reset-cache hash:
   - Use saved dateFrom/dateTo instead of metadata dates
   - Restore search text
   - Restore page number (after DataTable initialized)
3. If no saved state OR #reset-cache hash:
   - Fetch metadata as usual
   - Clear sessionStorage

#### 3. Save State on Every Filter Change

Hook into these events:
- `cbDateRangeSelectorOnSelect()` - date range changed
- Search input keyup/change - search text changed
- DataTable `draw` event - page changed
- Page length dropdown change - already handled, keep in localStorage

#### 4. Handle #reset-cache Hash

Before any initialization:
```javascript
initialize() {
    // Check for reset hash FIRST
    if (window.location.hash === '#reset-cache') {
        sessionStorage.removeItem('cdr_filters_state');
        localStorage.removeItem('cdrTablePageLength');
        // Clear hash to prevent repeated clears
        history.replaceState(null, null, ' ');
    }

    // Then proceed with normal initialization...
}
```

#### 5. Restore Filters After Initialization

After DataTable is created:
1. Restore daterangepicker dates
2. Restore search text in input field
3. Trigger DataTable search: `dataTable.search(savedText)`
4. Navigate to saved page: `dataTable.page(savedPage).draw()`

**Critical Timing**: Must wait for DataTable to be fully initialized before calling `.page()` or `.search()`.

### Technical Reference Details

#### File Locations

**Frontend (JavaScript)**:
- Main CDR page logic: `/Users/nb/PhpstormProjects/mikopbx/Core/sites/admin-cabinet/assets/js/src/CallDetailRecords/call-detail-records-index.js`
- Transpiled output: `/Users/nb/PhpstormProjects/mikopbx/Core/sites/admin-cabinet/assets/js/pbx/CallDetailRecords/call-detail-records-index.js`
- CDR API client: `/Users/nb/PhpstormProjects/mikopbx/Core/sites/admin-cabinet/assets/js/src/PbxAPI/cdr-api.js`

**Backend (PHP)**:
- Controller: `/Users/nb/PhpstormProjects/mikopbx/Core/src/AdminCabinet/Controllers/CallDetailRecordsController.php`
- View template: `/Users/nb/PhpstormProjects/mikopbx/Core/src/AdminCabinet/Views/CallDetailRecords/index.volt`
- REST API: `/Users/nb/PhpstormProjects/mikopbx/Core/src/PBXCoreREST/Lib/Cdr/GetListAction.php`
- Filter form (legacy, not used): `/Users/nb/PhpstormProjects/mikopbx/Core/src/AdminCabinet/Forms/CallDetailRecordsFilterForm.php`

#### Key JavaScript Objects and Methods

**callDetailRecords module**:
- `initialize()` - Entry point, calls fetchLatestCDRDate()
- `fetchLatestCDRDate()` - Gets metadata from API
- `initializeDateRangeSelector(startDate, endDate)` - Sets up daterangepicker
- `initializeDataTableAndHandlers()` - Creates DataTable and event handlers
- `cbDateRangeSelectorOnSelect(start, end, label)` - Date range change callback
- `applyFilter(text)` - Applies search filter and redraws DataTable
- `getPageLength()` - Gets page length from localStorage or calculates
- `calculatePageLength()` - Calculates optimal page length based on window height

**jQuery Selectors**:
- `$cdrTable` = `$('#cdr-table')` - DataTable element
- `$globalSearch` = `$('#globalsearch')` - Search input field
- `$dateRangeSelector` = `$('#date-range-selector')` - Date picker input
- `$searchCDRInput` = `$('#search-cdr-input')` - Search helper dropdown
- `$pageLengthSelector` = `$('#page-length-select')` - Page length dropdown

**DataTable API Methods**:
- `callDetailRecords.dataTable.search(text)` - Set search value
- `callDetailRecords.dataTable.draw()` - Redraw table (triggers AJAX)
- `callDetailRecords.dataTable.page.info()` - Get page info (current page, total pages, etc.)
- `callDetailRecords.dataTable.page(pageNumber)` - Navigate to page
- `callDetailRecords.dataTable.page.len(length)` - Set page length

**daterangepicker API**:
- Access instance: `callDetailRecords.$dateRangeSelector.data('daterangepicker')`
- Properties: `startDate`, `endDate` (moment objects)
- Methods: `setStartDate(date)`, `setEndDate(date)`

#### Storage Patterns in Codebase

**localStorage** (persists across logout):
- `cdrTablePageLength` - Page length preference
- `extensionsTablePageLength` - Extensions page length
- `DataTables_extensions-table_/admin-cabinet/extensions/index/` - Extensions DataTable state

**sessionStorage** (clears on logout/tab close):
- Used in `/Users/nb/PhpstormProjects/mikopbx/Core/sites/admin-cabinet/assets/js/src/Advice/advice-worker.js` for caching advice data:
  ```javascript
  sessionStorage.getItem(adviceWorker.storageKeyBellState)
  sessionStorage.getItem(adviceWorker.storageKeyRawAdvice)
  ```

**Pattern to Follow**:
```javascript
// Error handling for sessionStorage
try {
    const rawData = sessionStorage.getItem(storageKey);
    if (rawData) {
        const data = JSON.parse(rawData);
        // Use data...
    }
} catch (error) {
    console.error('Failed to parse sessionStorage data:', error);
    sessionStorage.removeItem(storageKey); // Clear corrupted data
}

// Save with try-catch
try {
    sessionStorage.setItem(storageKey, JSON.stringify(state));
} catch (error) {
    console.error('Failed to save to sessionStorage:', error);
}
```

#### Hash-based Reset Implementation Pattern

From Extensions page (the gold standard):

```javascript
// 1. Check hash BEFORE DataTable initialization
if (window.location.hash === "#reset-cache") {
    // Clear state
    sessionStorage.removeItem('cdr_filters_state');
    localStorage.removeItem('cdrTablePageLength');
}

// 2. Create reset link handler (if needed in UI)
$(`a[href='${globalRootUrl}call-detail-records/index/#reset-cache']`).on('click', function(e) {
    e.preventDefault();
    sessionStorage.removeItem('cdr_filters_state');
    localStorage.removeItem('cdrTablePageLength');
    window.location.hash = '#reset-cache';
    window.location.reload();
});
```

**Important**: Clear the hash after handling to prevent repeated resets:
```javascript
if (window.location.hash === '#reset-cache') {
    // Clear storage...

    // Remove hash from URL without page reload
    history.replaceState(null, null, window.location.pathname);
}
```

#### REST API Request Format

**Endpoint**: `GET /pbxcore/api/v3/cdr`

**Query Parameters**:
- `dateFrom` - Start date (YYYY-MM-DD)
- `dateTo` - End date (YYYY-MM-DD HH:mm:ss)
- `search` - Full-text search (searches src_num, dst_num, did)
- `src_num` - Filter by source number (when using `src:` prefix)
- `dst_num` - Filter by destination number (when using `dst:` prefix)
- `did` - Filter by DID (when using `did:` prefix)
- `linkedid` - Filter by linkedid (when using `linkedid:` prefix, ignores dates)
- `limit` - Page size (e.g., 25)
- `offset` - Offset for pagination (page * limit)
- `sort` - Sort field (always 'start')
- `order` - Sort direction (always 'DESC')
- `grouped` - Return grouped records (always true for WebUI)

**Response Format**:
```json
{
    "result": true,
    "data": {
        "records": [ /* array of CDR records */ ],
        "pagination": {
            "total": 1234,
            "limit": 25,
            "offset": 0
        }
    }
}
```

#### DataTable Draw Event and Timing

The `draw` event fires AFTER DataTable has rendered rows:

```javascript
callDetailRecords.dataTable.on('draw', () => {
    // Remove loading indicator
    callDetailRecords.$globalSearch.closest('div').removeClass('loading');

    // GOOD PLACE TO SAVE STATE
    // All filters are applied, pagination is updated, draw is complete
});
```

This is the ideal place to save filter state to sessionStorage because:
1. DataTable has finished rendering
2. Page info is accurate: `dataTable.page.info()` returns correct current page
3. Search value is applied: `dataTable.search()` returns current search
4. Dates are already read from daterangepicker during AJAX request

### Configuration Requirements

**Dependencies** (already loaded):
- jQuery DataTables (server-side processing mode)
- daterangepicker plugin (date range selector)
- moment.js (date manipulation)
- Semantic UI (dropdowns, search component)
- TokenManager (JWT authentication)

**Browser Compatibility**:
- sessionStorage API (supported in all modern browsers)
- JSON.parse/stringify (built-in)
- window.location.hash (standard)

**Security Considerations**:
1. **Never store JWT tokens in sessionStorage** - TokenManager already handles this correctly (memory + httpOnly cookie)
2. **sessionStorage is domain-specific** - filters only accessible from same origin
3. **XSS protection** - Always parse JSON with try-catch to prevent code injection
4. **No sensitive data** - Filters are just search terms and dates, no user credentials

### Edge Cases and Error Handling

**What could go wrong**:

1. **Corrupted sessionStorage data** - Invalid JSON
   - Solution: Wrap `JSON.parse()` in try-catch, clear bad data

2. **Date range outside database range** - Saved dates are 2024-01-01 to 2024-12-31, but database only has 2024-06-01 to 2024-12-31
   - Solution: Always allow saved dates, API will return empty results if no matches

3. **Page number out of range** - Saved page 10, but after filter change only 3 pages exist
   - Solution: DataTables automatically corrects to valid page

4. **Search text contains special characters** - User searched for `"src:201"` (with quotes)
   - Solution: DataTables handles encoding, no special escaping needed

5. **User clicks #reset-cache twice** - Should be idempotent
   - Solution: Always check if storage exists before removing

6. **Browser doesn't support sessionStorage** - Very old browser
   - Solution: Feature detection with fallback:
     ```javascript
     if (typeof sessionStorage === 'undefined') {
         // Fallback: don't persist filters
         return;
     }
     ```

7. **Empty database scenario** - No records at all
   - Current: Shows placeholder, DataTable never initialized
   - New: Should still clear sessionStorage on #reset-cache

### Implementation Checklist

To implement filter persistence, you need to:

1. ✅ Add `saveFiltersState()` method - saves current state to sessionStorage
2. ✅ Add `loadFiltersState()` method - loads and returns state from sessionStorage
3. ✅ Add `clearFiltersState()` method - removes state from sessionStorage
4. ✅ Modify `initialize()` - check for #reset-cache hash first
5. ✅ Modify `fetchLatestCDRDate()` - check for saved state before using metadata dates
6. ✅ Modify `initializeDateRangeSelector()` - accept optional saved dates
7. ✅ Add call to `loadFiltersState()` after DataTable initialization
8. ✅ Restore search text to input field
9. ✅ Restore search to DataTable
10. ✅ Restore page number to DataTable
11. ✅ Hook `draw` event to save state
12. ✅ Hook `cbDateRangeSelectorOnSelect` to save state
13. ✅ Hook search input to save state (debounced)
14. ✅ Test F5 refresh - filters should persist
15. ✅ Test pagination - page number should persist
16. ✅ Test date change - new dates should persist
17. ✅ Test search - search text should persist
18. ✅ Test #reset-cache - all filters should clear
19. ✅ Test logout - sessionStorage should clear automatically
20. ✅ Test empty database - should not error

### Why This Approach is Correct

**Alternatives Considered**:

1. ❌ **Use DataTables stateSave** - Problem: Uses localStorage, persists across logout
2. ❌ **Use URL query parameters** - Problem: Ugly URLs, breaks browser back button
3. ❌ **Server-side session** - Problem: Requires PHP changes, more complex
4. ✅ **sessionStorage** - Perfect fit: Survives F5, clears on logout, client-side only

**Design Decisions**:

- **Why sessionStorage not localStorage**: Security and UX - different users shouldn't see each other's filters
- **Why not use DataTables stateSave**: It uses localStorage, we need sessionStorage
- **Why save on draw event**: Ensures all state is accurate and applied
- **Why check hash before init**: Prevents loading stale state before clearing it
- **Why keep pageLength in localStorage**: User preference (like font size), should persist across sessions

## User Notes
<!-- Any specific notes or requirements from the developer -->

## Work Log
<!-- Updated as work progresses -->
- [YYYY-MM-DD] Started task, initial research
