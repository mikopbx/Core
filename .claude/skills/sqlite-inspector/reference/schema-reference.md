# MikoPBX Database Schema Reference

Complete reference for all MikoPBX SQLite database tables, columns, and relationships.

## Core Tables

### m_Extensions (Central Hub)

The extensions table is the central hub connecting all phone number entities in MikoPBX.

**Key columns:**
- `number` - Extension number (2-8 digits, PRIMARY KEY)
- `type` - Extension type: `SIP`, `EXTERNAL`, `QUEUE`, `CONFERENCE`, `DIALPLAN APPLICATION`, `IVR MENU`
- `callerid` - Display name
- `userid` - Foreign key to m_Users
- `show_in_phonebook` - "1" to display in phonebook
- `is_general_user_number` - "1" for primary user extension

**Common queries:**
```sql
-- All SIP extensions
SELECT * FROM m_Extensions WHERE type = 'SIP';

-- Extensions for specific user
SELECT e.* FROM m_Extensions e WHERE e.userid = 'USER_ID';

-- Extensions with their users
SELECT e.number, e.callerid, u.username, u.email
FROM m_Extensions e
LEFT JOIN m_Users u ON e.userid = u.id;
```

---

### m_Sip

SIP account configurations linked to extensions.

**Key columns:**
- `id` - Auto-increment PRIMARY KEY
- `extension` - Foreign key to m_Extensions.number (UNIQUE)
- `secret` - SIP password
- `transport` - Transport protocol: `udp`, `tcp`, `tls`
- `networkfilterid` - Foreign key to m_NetworkFilters
- `manualattributes` - Custom SIP headers

**Common queries:**
```sql
-- SIP accounts with network filters
SELECT s.extension, s.secret, s.transport, nf.permit, nf.deny
FROM m_Sip s
LEFT JOIN m_NetworkFilters nf ON s.networkfilterid = nf.id;

-- Check SIP account for extension
SELECT * FROM m_Sip WHERE extension = '100';
```

---

### m_Users

User accounts and profiles.

**Key columns:**
- `id` - Auto-increment PRIMARY KEY
- `email` - User email (UNIQUE)
- `username` - Display name
- `language` - UI language code
- `avatar` - Avatar file path

**Common queries:**
```sql
-- Users with their extensions
SELECT u.id, u.username, u.email,
       GROUP_CONCAT(e.number) as extensions
FROM m_Users u
LEFT JOIN m_Extensions e ON u.id = e.userid
GROUP BY u.id;
```

---

### m_Providers

SIP/IAX provider (trunk) configurations.

**Key columns:**
- `uniqid` - Unique identifier (PRIMARY KEY)
- `type` - Provider type: `SIP` or `IAX`
- `description` - Provider name
- `host` - Provider hostname/IP
- `disabled` - "1" if disabled

**Common queries:**
```sql
-- Active SIP providers
SELECT * FROM m_Providers
WHERE type = 'SIP' AND disabled = '0';

-- Provider with routing rules
SELECT p.description, p.host,
       (SELECT COUNT(*) FROM m_IncomingRoutingTable WHERE provider = p.uniqid) as incoming_rules,
       (SELECT COUNT(*) FROM m_OutboundRoutes WHERE providerid = p.uniqid) as outbound_rules
FROM m_Providers p;
```

---

## Routing Tables

### m_IncomingRoutingTable

DID/Incoming call routing rules.

**Key columns:**
- `id` - Auto-increment PRIMARY KEY
- `number` - DID pattern (can contain wildcards)
- `provider` - Foreign key to m_Providers.uniqid
- `extension` - Destination extension
- `action` - Action type: `extension`, `hangup`, `busy`, `voicemail`
- `priority` - Rule priority (0-9999, lower = higher priority)
- `timeout` - Ring timeout in seconds

**Common queries:**
```sql
-- All incoming routes ordered by priority
SELECT ir.number, ir.provider, ir.extension, ir.action, ir.priority,
       p.description as provider_name
FROM m_IncomingRoutingTable ir
LEFT JOIN m_Providers p ON ir.provider = p.uniqid
ORDER BY ir.priority;

-- Routes for specific provider
SELECT * FROM m_IncomingRoutingTable WHERE provider = 'PROVIDER_UNIQID';
```

---

### m_OutgoingRoutingTable

Outbound call routing rules.

**Key columns:**
- `id` - Auto-increment PRIMARY KEY
- `providerid` - Foreign key to m_Providers.uniqid
- `numberbeginswith` - Pattern to match (e.g., "1" for US, "00" for international)
- `restnumbers` - Number of remaining digits to match (-1 = any)
- `trimfrombegin` - Number of digits to strip from beginning
- `prepend` - Prefix to add before dialing
- `priority` - Rule order (0-9999, lower = higher priority)

**Common queries:**
```sql
-- Outbound routes by priority
SELECT or.numberbeginswith, or.restnumbers, or.trimfrombegin, or.prepend,
       p.description as provider_name, or.priority
FROM m_OutgoingRoutingTable or
LEFT JOIN m_Providers p ON or.providerid = p.uniqid
ORDER BY or.priority;
```

---

## Call Features

### m_CallQueues

Call queue configurations.

**Key columns:**
- `uniqid` - Unique identifier (PRIMARY KEY)
- `name` - Queue name
- `extension` - Queue extension number (Foreign key to m_Extensions.number)
- `strategy` - Ring strategy: `ringall`, `leastrecent`, `random`, `rrmemory`
- `seconds_to_ring_each_member` - Ring duration per member
- `timeout_extension` - Overflow destination
- `timeout_to_redirect_to_extension` - Timeout before overflow

**Related table:** `m_CallQueueMembers`
- `queue` - Foreign key to m_CallQueues.uniqid
- `extension` - Member extension (Foreign key to m_Extensions.number)
- `priority` - Member priority

**Common queries:**
```sql
-- Queue with members
SELECT cq.name, cq.extension, cq.strategy,
       e.number as member_extension, e.callerid as member_name,
       cqm.priority as member_priority
FROM m_CallQueues cq
LEFT JOIN m_CallQueueMembers cqm ON cq.uniqid = cqm.queue
LEFT JOIN m_Extensions e ON cqm.extension = e.number
WHERE cq.uniqid = 'QUEUE_UNIQID'
ORDER BY cqm.priority;
```

---

### m_ConferenceRooms

Conference room configurations.

**Key columns:**
- `uniqid` - Unique identifier (PRIMARY KEY)
- `name` - Conference name
- `extension` - Conference extension (Foreign key to m_Extensions.number)
- `pinCode` - Access PIN code

---

### m_IvrMenu & m_IvrMenuActions

Interactive Voice Response menus and digit actions.

**m_IvrMenu columns:**
- `uniqid` - Unique identifier (PRIMARY KEY)
- `name` - IVR menu name
- `extension` - IVR extension (Foreign key to m_Extensions.number)
- `audio_message_id` - Greeting sound file ID
- `timeout_extension` - Timeout destination
- `number_of_repeat` - How many times to repeat menu

**m_IvrMenuActions columns:**
- `id` - Auto-increment PRIMARY KEY
- `ivr_menu_id` - Foreign key to m_IvrMenu.uniqid
- `digits` - Pressed digit: `0-9`, `*`, `#`, `timeout`
- `extension` - Destination extension

**Common queries:**
```sql
-- IVR menu with actions
SELECT im.name, im.extension,
       ima.digits, ima.extension as destination
FROM m_IvrMenu im
LEFT JOIN m_IvrMenuActions ima ON im.uniqid = ima.ivr_menu_id
WHERE im.uniqid = 'IVR_UNIQID'
ORDER BY ima.digits;
```

---

## Security & Network

### m_NetworkFilters

IP-based access restrictions.

**Key columns:**
- `id` - Auto-increment PRIMARY KEY
- `description` - Filter description
- `permit` - Allowed IP/CIDR (can contain multiple comma-separated)
- `deny` - Blocked IP/CIDR
- `local_network` - "1" if this represents local network

**Common queries:**
```sql
-- SIP accounts with IP restrictions
SELECT s.extension, s.secret, nf.permit, nf.deny, nf.description
FROM m_Sip s
LEFT JOIN m_NetworkFilters nf ON s.networkfilterid = nf.id
WHERE s.networkfilterid IS NOT NULL;
```

---

### m_FirewallRules

Firewall access rules.

**Key columns:**
- `id` - Auto-increment PRIMARY KEY
- `category` - Service category: `SIP`, `WEB`, `SSH`, `AMI`, `ICMP`, `CTI`
- `networkfilterid` - Foreign key to m_NetworkFilters
- `action` - Action type: `allow` or `block`
- `description` - Rule description

**Common queries:**
```sql
-- Firewall rules with network filters
SELECT fr.category, fr.action, fr.description,
       nf.permit, nf.deny
FROM m_FirewallRules fr
LEFT JOIN m_NetworkFilters nf ON fr.networkfilterid = nf.id
ORDER BY fr.category;
```

---

### m_Fail2BanRules

Fail2ban intrusion prevention rules.

**Key columns:**
- `id` - Auto-increment PRIMARY KEY
- `maxretry` - Max failed attempts before ban (default: 5)
- `findtime` - Time window to count retries in seconds (default: 1800)
- `bantime` - Ban duration in seconds (default: 86400)
- `whitelist` - IPs to never ban (comma-separated)

---

## Settings & Files

### m_PbxSettings

Key-value configuration store.

**Key columns:**
- `key` - Setting name (PRIMARY KEY)
- `value` - Setting value

**Important keys:**
- `PBXVersion` - System version
- `PBXLanguage` - Default system language
- `WebAdminLogin` - Admin username
- `SSHPassword` - SSH password
- `PBXTimezone` - System timezone

**Common queries:**
```sql
-- Get specific setting
SELECT value FROM m_PbxSettings WHERE key = 'PBXVersion';

-- All language-related settings
SELECT * FROM m_PbxSettings WHERE key LIKE '%Language%';
```

---

### m_SoundFiles

Audio file registry.

**Key columns:**
- `id` - Auto-increment PRIMARY KEY
- `name` - File display name
- `path` - Filesystem path
- `category` - File category: `moh` (music on hold), `custom`

---

### m_CustomFiles

Custom configuration file overrides.

**Key columns:**
- `id` - Auto-increment PRIMARY KEY
- `filepath` - Path to file being customized
- `content` - Custom content
- `mode` - Override mode: `append`, `override`, `script`
- `changed` - "1" if modified since last apply

---

## CDR Tables

### cdr_general (Permanent Records)

Historical call detail records.

**Key columns:**
- `id` - Auto-increment PRIMARY KEY
- `start` - Call start timestamp
- `answer` - Call answer timestamp
- `endtime` - Call end timestamp
- `src_chan` - Source channel
- `src_num` - Caller number
- `dst_chan` - Destination channel
- `dst_num` - Called number
- `duration` - Total call duration (seconds)
- `billsec` - Billable duration (seconds)
- `disposition` - Call outcome: `ANSWERED`, `NO ANSWER`, `BUSY`, `FAILED`
- `recordingfile` - Path to call recording
- `did` - DID used for this call
- `linkedid` - Unique call identifier

**Common queries:**
```sql
-- Calls for specific extension
SELECT start, src_num, dst_num, duration, billsec, disposition
FROM cdr_general
WHERE src_num = '100' OR dst_num = '100'
ORDER BY start DESC
LIMIT 20;

-- Answered calls today
SELECT COUNT(*) as total_calls, SUM(billsec) as total_duration
FROM cdr_general
WHERE DATE(start) = DATE('now')
  AND disposition = 'ANSWERED';

-- Calls with recordings
SELECT * FROM cdr_general
WHERE recordingfile IS NOT NULL AND recordingfile != ''
ORDER BY start DESC;
```

---

### cdr (Temporary Active Calls)

Currently active calls.

**Same schema as cdr_general**, but records are:
- Inserted when call starts
- Updated during call
- Moved to `cdr_general` when call ends
- `endtime IS NULL` indicates active call

**Common queries:**
```sql
-- Active calls right now
SELECT src_num, dst_num, start, duration
FROM cdr
WHERE endtime IS NULL OR endtime = '';
```

---

## Foreign Key Relationships

### Primary Relationships

```
m_Users (id)
    ↓
m_Extensions (userid)
    ↓ (number)
    ├─→ m_Sip (extension)
    ├─→ m_CallQueueMembers (extension)
    ├─→ m_CallQueues (extension)
    ├─→ m_ConferenceRooms (extension)
    └─→ m_IvrMenu (extension)

m_NetworkFilters (id)
    ↓
    ├─→ m_Sip (networkfilterid)
    └─→ m_FirewallRules (networkfilterid)

m_Providers (uniqid)
    ↓
    ├─→ m_IncomingRoutingTable (provider)
    └─→ m_OutgoingRoutingTable (providerid)

m_CallQueues (uniqid)
    ↓
m_CallQueueMembers (queue)

m_IvrMenu (uniqid)
    ↓
m_IvrMenuActions (ivr_menu_id)
```

### Referential Integrity Rules

1. **Extensions are central** - Most entities reference m_Extensions
2. **Cascade deletes** - Deleting extension should delete SIP account, queue memberships, etc.
3. **Provider dependencies** - Cannot delete provider with active routing rules
4. **User dependencies** - Cannot delete user with assigned extensions

---

## Enum Values Reference

### m_Extensions.type
Valid values:
- `SIP` - SIP phone extension
- `EXTERNAL` - External number
- `QUEUE` - Call queue
- `CONFERENCE` - Conference room
- `DIALPLAN APPLICATION` - Custom application
- `IVR MENU` - IVR menu

### m_Providers.type
Valid values:
- `SIP` - SIP trunk
- `IAX` - IAX trunk

### m_IncomingRoutingTable.action
Valid values:
- `extension` - Route to extension
- `hangup` - Hang up call
- `busy` - Return busy signal
- `voicemail` - Send to voicemail

### m_CallQueues.strategy
Valid values:
- `ringall` - Ring all members simultaneously
- `leastrecent` - Ring member who answered least recently
- `random` - Random member selection
- `rrmemory` - Round-robin with memory

### m_Sip.transport
Valid values:
- `udp` - UDP transport
- `tcp` - TCP transport
- `tls` - TLS encrypted transport

### m_FirewallRules.category
Valid values:
- `SIP` - SIP protocol
- `WEB` - Web interface
- `SSH` - SSH access
- `AMI` - Asterisk Manager Interface
- `ICMP` - Ping
- `CTI` - Computer Telephony Integration

### m_CustomFiles.mode
Valid values:
- `append` - Append to file
- `override` - Replace file
- `script` - Execute as script

---

## Data Validation Rules

### Extension Numbers
- Length: 2-8 digits
- Format: Numeric only
- Must be unique

### Priorities
- Range: 0-9999
- Lower value = higher priority
- Used in routing tables and queue members

### Boolean Fields
- Values: "0" (false) or "1" (true)
- Stored as TEXT, not INTEGER
- Examples: disabled, show_in_phonebook, is_general_user_number

### IP/CIDR Format
- Single IP: `192.168.1.1`
- CIDR range: `192.168.1.0/24`
- Multiple: `192.168.1.1,10.0.0.0/8`
- Used in: permit, deny, whitelist

---

## Schema Inspection Commands

```bash
# Auto-detect container based on current worktree
CONTAINER_ID=$(./.claude/scripts/get-container-name.sh)

# Show table structure
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db ".schema m_Extensions"

# List all tables
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db ".tables"

# Show all indexes
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db ".indexes"

# Get table info
docker exec $CONTAINER_ID sqlite3 /cf/conf/mikopbx.db "PRAGMA table_info(m_Extensions)"
```

---

## Additional Resources

For complete model documentation with PHP code references, see:
`/Users/nb/PhpstormProjects/mikopbx/Core/src/Common/Models/CLAUDE.md`
