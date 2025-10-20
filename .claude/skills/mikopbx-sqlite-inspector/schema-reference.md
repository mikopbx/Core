# MikoPBX Database Schema Quick Reference

This file provides a condensed reference for all major tables and their relationships.

## Table Naming Convention

All MikoPBX tables use the `m_` prefix (except CDR tables):
- Configuration tables: `m_Extensions`, `m_Users`, `m_Providers`, etc.
- CDR tables: `cdr_general`, `cdr` (no prefix)

## Entity Relationship Diagram (Text)

```
m_Users ──(1:N)──> m_Extensions <──(1:1)── m_Sip ──(N:1)──> m_NetworkFilters
                        │
                        ├──(1:1)──> m_CallQueues ──(1:N)──> m_CallQueueMembers
                        ├──(1:1)──> m_ConferenceRooms
                        └──(1:1)──> m_IvrMenu ──(1:N)──> m_IvrMenuActions

m_Providers ──(1:N)──> m_IncomingRoutingTable ──(N:1)──> m_Extensions
     │
     └──(1:N)──> m_OutgoingRoutingTable

m_Providers <──(1:1)── m_Sip / m_Iax

m_NetworkFilters <──(1:N)── m_FirewallRules
```

## Table Reference

### Core Tables

| Table | Primary Key | Description | Row Count Typical |
|-------|-------------|-------------|-------------------|
| m_Extensions | number | Central hub for all phone numbers | 10-500 |
| m_Users | id | User accounts | 5-100 |
| m_Sip | id | SIP account configs | 10-500 |
| m_Providers | uniqid | SIP/IAX trunks | 1-20 |

### Routing Tables

| Table | Primary Key | Description | Row Count Typical |
|-------|-------------|-------------|-------------------|
| m_IncomingRoutingTable | id | DID routing rules | 1-100 |
| m_OutgoingRoutingTable | id | Outbound routing rules | 1-50 |

### Call Features

| Table | Primary Key | Description | Row Count Typical |
|-------|-------------|-------------|-------------------|
| m_CallQueues | uniqid | Call queue configs | 0-20 |
| m_CallQueueMembers | id | Queue member assignments | 0-200 |
| m_ConferenceRooms | uniqid | Conference room configs | 0-20 |
| m_IvrMenu | uniqid | IVR menu configs | 0-20 |
| m_IvrMenuActions | id | IVR digit actions | 0-200 |

### Security Tables

| Table | Primary Key | Description | Row Count Typical |
|-------|-------------|-------------|-------------------|
| m_NetworkFilters | id | IP allow/deny rules | 0-50 |
| m_FirewallRules | id | Service firewall rules | 5-100 |
| m_Fail2BanRules | id | Intrusion prevention | 1-10 |

### Settings & Files

| Table | Primary Key | Description | Row Count Typical |
|-------|-------------|-------------|-------------------|
| m_PbxSettings | key | Key-value config store | 50-200 |
| m_SoundFiles | id | Audio file registry | 10-100 |
| m_CustomFiles | id | Config file overrides | 0-50 |

### CDR Tables

| Table | Primary Key | Description | Row Count Typical |
|-------|-------------|-------------|-------------------|
| cdr_general | id | Permanent call history | 1000-1000000 |
| cdr | id | Active/temp call records | 0-100 |

## Field Types Reference

### Common Field Patterns

| Pattern | Type | Description | Example |
|---------|------|-------------|---------|
| id | INTEGER PRIMARY KEY | Auto-increment ID | 1, 2, 3 |
| uniqid | TEXT PRIMARY KEY | Unique identifier | SIP-PROVIDER-1234567890 |
| number | TEXT | Extension number (2-8 digits) | 100, 1001 |
| type | TEXT | Enum value | SIP, IAX, QUEUE |
| disabled | TEXT | Boolean as "0"/"1" | "0" = active, "1" = disabled |

### Boolean Fields in SQLite

MikoPBX uses TEXT type for booleans:
- `"0"` = false/no/disabled
- `"1"` = true/yes/enabled

Examples:
- `disabled = "0"` means active
- `show_in_phonebook = "1"` means visible
- `local_network = "1"` means is local network

## Complete Table Schemas

### m_Extensions

```sql
CREATE TABLE m_Extensions (
    number TEXT PRIMARY KEY,          -- Extension number (2-8 digits)
    type TEXT,                        -- SIP|EXTERNAL|QUEUE|CONFERENCE|DIALPLAN APPLICATION|IVR MENU
    callerid TEXT,                    -- Display name
    userid INTEGER,                   -- FK to m_Users.id
    show_in_phonebook TEXT,           -- "0" or "1"
    is_general_user_number TEXT,      -- "0" or "1" (primary ext)
    public_access TEXT                -- "0" or "1"
);
```

**Key relationships:**
- `userid` → `m_Users.id`
- `number` ← `m_Sip.extension` (1:1 for SIP type)
- `number` ← `m_CallQueues.extension` (1:1 for QUEUE type)
- `number` ← `m_ConferenceRooms.extension` (1:1 for CONFERENCE type)
- `number` ← `m_IvrMenu.extension` (1:1 for IVR MENU type)

### m_Users

```sql
CREATE TABLE m_Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,                -- User email (unique)
    username TEXT,                    -- Display name
    language TEXT,                    -- UI language (en, ru, etc.)
    avatar TEXT                       -- Avatar file path
);
```

**Key relationships:**
- `id` ← `m_Extensions.userid` (1:N)

### m_Sip

```sql
CREATE TABLE m_Sip (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extension TEXT UNIQUE,            -- FK to m_Extensions.number OR NULL for providers
    uniqid TEXT UNIQUE,               -- For providers (FK to m_Providers.uniqid)
    secret TEXT,                      -- SIP password
    transport TEXT,                   -- udp|tcp|tls
    host TEXT,                        -- For providers: hostname/IP
    username TEXT,                    -- For providers: auth username
    port TEXT,                        -- For providers: SIP port
    networkfilterid INTEGER,          -- FK to m_NetworkFilters.id
    manualattributes TEXT,            -- Custom SIP headers
    disabled TEXT                     -- "0" or "1"
);
```

**Key relationships:**
- `extension` → `m_Extensions.number` (for extensions)
- `uniqid` → `m_Providers.uniqid` (for providers)
- `networkfilterid` → `m_NetworkFilters.id`

### m_Providers

```sql
CREATE TABLE m_Providers (
    uniqid TEXT PRIMARY KEY,          -- Unique identifier
    type TEXT,                        -- SIP or IAX
    description TEXT,                 -- Provider name
    host TEXT,                        -- Provider hostname/IP
    disabled TEXT,                    -- "0" or "1"
    noregister TEXT                   -- "0" or "1"
);
```

**Key relationships:**
- `uniqid` ← `m_Sip.uniqid` or `m_Iax.uniqid` (1:1)
- `uniqid` ← `m_IncomingRoutingTable.provider` (1:N)
- `uniqid` ← `m_OutgoingRoutingTable.providerid` (1:N)

### m_IncomingRoutingTable

```sql
CREATE TABLE m_IncomingRoutingTable (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT,                      -- DID pattern (can have wildcards)
    provider TEXT,                    -- FK to m_Providers.uniqid
    extension TEXT,                   -- FK to m_Extensions.number
    action TEXT,                      -- extension|hangup|busy|voicemail
    priority INTEGER,                 -- 0-9999 (lower = higher priority)
    timeout INTEGER                   -- Ring timeout in seconds
);
```

**Key relationships:**
- `provider` → `m_Providers.uniqid`
- `extension` → `m_Extensions.number`

**Business rules:**
- Lower priority number = higher priority (0 is highest)
- If `action` = 'extension', then `extension` must be valid
- Unique priorities per provider recommended

### m_OutgoingRoutingTable

```sql
CREATE TABLE m_OutgoingRoutingTable (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    providerid TEXT,                  -- FK to m_Providers.uniqid
    numberbeginswith TEXT,            -- Pattern to match (e.g., "1", "00")
    restnumbers INTEGER,              -- Remaining digits (-1 = any)
    trimfrombegin INTEGER,            -- Digits to strip from beginning
    prepend TEXT,                     -- Prefix to add
    priority INTEGER                  -- 0-9999 (lower = higher priority)
);
```

**Key relationships:**
- `providerid` → `m_Providers.uniqid`

**Business rules:**
- Lower priority = higher priority (0 is highest)
- Routes evaluated in priority order

### m_CallQueues

```sql
CREATE TABLE m_CallQueues (
    uniqid TEXT PRIMARY KEY,
    name TEXT,                        -- Queue name
    extension TEXT,                   -- FK to m_Extensions.number
    strategy TEXT,                    -- ringall|leastrecent|random|rrmemory
    seconds_to_ring_each_member INTEGER,
    timeout_extension TEXT,           -- Overflow destination
    timeout_to_redirect_to_extension INTEGER
);
```

**Key relationships:**
- `extension` → `m_Extensions.number` (must be type=QUEUE)
- `uniqid` ← `m_CallQueueMembers.queue` (1:N)

### m_CallQueueMembers

```sql
CREATE TABLE m_CallQueueMembers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    queue TEXT,                       -- FK to m_CallQueues.uniqid
    extension TEXT,                   -- FK to m_Extensions.number
    priority INTEGER                  -- Member priority (lower = higher)
);
```

**Key relationships:**
- `queue` → `m_CallQueues.uniqid`
- `extension` → `m_Extensions.number`

### m_ConferenceRooms

```sql
CREATE TABLE m_ConferenceRooms (
    uniqid TEXT PRIMARY KEY,
    name TEXT,                        -- Conference name
    extension TEXT,                   -- FK to m_Extensions.number
    pinCode TEXT                      -- Access PIN
);
```

**Key relationships:**
- `extension` → `m_Extensions.number` (must be type=CONFERENCE)

### m_IvrMenu

```sql
CREATE TABLE m_IvrMenu (
    uniqid TEXT PRIMARY KEY,
    name TEXT,                        -- IVR menu name
    extension TEXT,                   -- FK to m_Extensions.number
    audio_message_id TEXT,            -- FK to m_SoundFiles.id
    timeout_extension TEXT,           -- Timeout destination
    number_of_repeat INTEGER          -- How many times to repeat
);
```

**Key relationships:**
- `extension` → `m_Extensions.number` (must be type=IVR MENU)
- `audio_message_id` → `m_SoundFiles.id`
- `uniqid` ← `m_IvrMenuActions.ivr_menu_id` (1:N)

### m_IvrMenuActions

```sql
CREATE TABLE m_IvrMenuActions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ivr_menu_id TEXT,                 -- FK to m_IvrMenu.uniqid
    digits TEXT,                      -- 0-9|*|#|timeout
    extension TEXT                    -- FK to m_Extensions.number
);
```

**Key relationships:**
- `ivr_menu_id` → `m_IvrMenu.uniqid`
- `extension` → `m_Extensions.number`

### m_NetworkFilters

```sql
CREATE TABLE m_NetworkFilters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT,                 -- Filter description
    permit TEXT,                      -- Allowed IPs/CIDRs (comma-separated)
    deny TEXT,                        -- Blocked IPs/CIDRs (comma-separated)
    local_network TEXT                -- "0" or "1"
);
```

**Key relationships:**
- `id` ← `m_Sip.networkfilterid` (1:N)
- `id` ← `m_FirewallRules.networkfilterid` (1:N)

### m_FirewallRules

```sql
CREATE TABLE m_FirewallRules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,                    -- SIP|WEB|SSH|AMI|ICMP|CTI
    networkfilterid INTEGER,          -- FK to m_NetworkFilters.id
    action TEXT,                      -- allow|block
    description TEXT
);
```

**Key relationships:**
- `networkfilterid` → `m_NetworkFilters.id`

### m_Fail2BanRules

```sql
CREATE TABLE m_Fail2BanRules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    maxretry INTEGER,                 -- Max failed attempts (default: 5)
    findtime INTEGER,                 -- Time window in seconds (default: 1800)
    bantime INTEGER,                  -- Ban duration in seconds (default: 86400)
    whitelist TEXT                    -- IPs to never ban (comma-separated)
);
```

### m_PbxSettings

```sql
CREATE TABLE m_PbxSettings (
    key TEXT PRIMARY KEY,             -- Setting name
    value TEXT                        -- Setting value
);
```

**Important keys:**
- `PBXVersion` - System version (e.g., "2024.1.0")
- `PBXLanguage` - Default language
- `WebAdminLogin` - Admin username
- `PBXTimezone` - System timezone
- `SSHPassword` - SSH access password

### m_SoundFiles

```sql
CREATE TABLE m_SoundFiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,                        -- File display name
    path TEXT,                        -- Filesystem path
    category TEXT                     -- moh|custom
);
```

### m_CustomFiles

```sql
CREATE TABLE m_CustomFiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filepath TEXT,                    -- Path to file being customized
    content TEXT,                     -- Custom content
    mode TEXT,                        -- append|override|script
    changed TEXT                      -- "0" or "1"
);
```

### cdr_general (and cdr)

```sql
CREATE TABLE cdr_general (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start TEXT,                       -- Call start timestamp
    answer TEXT,                      -- Call answer timestamp
    endtime TEXT,                     -- Call end timestamp
    src_chan TEXT,                    -- Source channel
    src_num TEXT,                     -- Caller number
    dst_chan TEXT,                    -- Destination channel
    dst_num TEXT,                     -- Called number
    linkedid TEXT,                    -- Unique call ID
    did TEXT,                         -- DID used
    disposition TEXT,                 -- ANSWERED|NO ANSWER|BUSY|FAILED
    duration INTEGER,                 -- Total duration (seconds)
    billsec INTEGER,                  -- Billable duration (seconds)
    recordingfile TEXT,               -- Path to recording
    from_account TEXT,
    to_account TEXT,
    dialstatus TEXT,
    appname TEXT,
    transfer TEXT,
    is_app TEXT,
    UNIQUEID TEXT,
    verbose_call_id TEXT,
    src_call_id TEXT,
    dst_call_id TEXT
);
```

**Active calls:** In `cdr` table, `endtime IS NULL` indicates active call

## Indexes

Common indexes to speed up queries:

```sql
-- Extensions
CREATE INDEX idx_extensions_userid ON m_Extensions(userid);
CREATE INDEX idx_extensions_type ON m_Extensions(type);

-- Routing
CREATE INDEX idx_incoming_provider ON m_IncomingRoutingTable(provider);
CREATE INDEX idx_incoming_priority ON m_IncomingRoutingTable(priority);
CREATE INDEX idx_outgoing_provider ON m_OutgoingRoutingTable(providerid);
CREATE INDEX idx_outgoing_priority ON m_OutgoingRoutingTable(priority);

-- CDR
CREATE INDEX idx_cdr_start ON cdr_general(start);
CREATE INDEX idx_cdr_src ON cdr_general(src_num);
CREATE INDEX idx_cdr_dst ON cdr_general(dst_num);
CREATE INDEX idx_cdr_did ON cdr_general(did);
CREATE INDEX idx_cdr_linkedid ON cdr_general(linkedid);
```

## Common JOIN Patterns

### Extension with User and SIP Account

```sql
SELECT
  e.number,
  e.callerid,
  e.type,
  u.username,
  u.email,
  s.secret,
  s.transport
FROM m_Extensions e
LEFT JOIN m_Users u ON e.userid = u.id
LEFT JOIN m_Sip s ON e.number = s.extension
WHERE e.number = '100';
```

### Provider with SIP Config and Routes

```sql
SELECT
  p.description,
  p.host,
  s.username,
  s.port,
  COUNT(DISTINCT ir.id) as incoming_routes,
  COUNT(DISTINCT ort.id) as outbound_routes
FROM m_Providers p
LEFT JOIN m_Sip s ON p.uniqid = s.uniqid
LEFT JOIN m_IncomingRoutingTable ir ON p.uniqid = ir.provider
LEFT JOIN m_OutgoingRoutingTable ort ON p.uniqid = ort.providerid
WHERE p.uniqid = 'PROVIDER_ID'
GROUP BY p.uniqid;
```

### Queue with Members and Member Details

```sql
SELECT
  cq.name,
  cq.strategy,
  e.number,
  e.callerid,
  cqm.priority
FROM m_CallQueues cq
LEFT JOIN m_CallQueueMembers cqm ON cq.uniqid = cqm.queue
LEFT JOIN m_Extensions e ON cqm.extension = e.number
WHERE cq.uniqid = 'QUEUE_ID'
ORDER BY cqm.priority;
```

### SIP Account with Network Filter

```sql
SELECT
  s.extension,
  s.transport,
  nf.permit,
  nf.deny,
  nf.description
FROM m_Sip s
LEFT JOIN m_NetworkFilters nf ON s.networkfilterid = nf.id
WHERE s.extension = '100';
```

## Data Integrity Rules

### Must Always Be True

1. **Extension Types**: Every `m_Extensions.type` must be one of the valid enum values
2. **SIP Accounts**: Every SIP extension must have a record in `m_Sip`
3. **Foreign Keys**: All foreign key references must point to existing records
4. **Primary Extensions**: Each user can have only one `is_general_user_number='1'`
5. **Unique Extensions**: Extension numbers must be unique across all types
6. **Provider Types**: Providers can only be 'SIP' or 'IAX'

### Validation Queries

```sql
-- Check for orphaned SIP accounts
SELECT COUNT(*) FROM m_Sip s
LEFT JOIN m_Extensions e ON s.extension = e.number
WHERE s.extension IS NOT NULL AND e.number IS NULL;
-- Should return 0

-- Check for SIP extensions without accounts
SELECT COUNT(*) FROM m_Extensions e
LEFT JOIN m_Sip s ON e.number = s.extension
WHERE e.type = 'SIP' AND s.extension IS NULL;
-- Should return 0

-- Check for invalid extension types
SELECT COUNT(*) FROM m_Extensions
WHERE type NOT IN ('SIP','EXTERNAL','QUEUE','CONFERENCE','DIALPLAN APPLICATION','IVR MENU');
-- Should return 0

-- Check for multiple primary extensions per user
SELECT userid, COUNT(*) as count FROM m_Extensions
WHERE is_general_user_number = '1'
GROUP BY userid
HAVING count > 1;
-- Should return 0 rows
```

## SQLite-Specific Notes

### Boolean Handling

SQLite doesn't have a native boolean type. MikoPBX uses TEXT:
```sql
-- Correct
WHERE disabled = '0'
WHERE show_in_phonebook = '1'

-- Incorrect
WHERE disabled = 0     -- Won't work, 0 != '0' in SQLite
WHERE disabled = false  -- Won't work
```

### NULL vs Empty String

```sql
-- Check for NULL or empty
WHERE field IS NULL OR field = ''

-- Check for value
WHERE field IS NOT NULL AND field != ''
```

### Date/Time Functions

```sql
-- Today's calls
WHERE DATE(start) = DATE('now')

-- Last 7 days
WHERE start >= datetime('now', '-7 days')

-- This month
WHERE start >= datetime('now', 'start of month')
```

### String Concatenation

```sql
-- Use || operator
SELECT number || ' - ' || callerid as full_name FROM m_Extensions
```

### LIKE Patterns

```sql
-- Case-insensitive by default in SQLite
WHERE callerid LIKE '%john%'

-- Starts with
WHERE number LIKE '10%'

-- Exact length
WHERE number LIKE '___'  -- Exactly 3 digits
```
