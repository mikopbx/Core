# Common SQL Query Patterns

Practical SQL query patterns for MikoPBX database verification and analysis.

## Quick Reference Queries

### Extension Queries

```sql
-- All SIP extensions
SELECT * FROM m_Extensions WHERE type = 'SIP';

-- Extensions for specific user
SELECT e.* FROM m_Extensions e WHERE e.userid = 'USER_ID';

-- Extensions with their users
SELECT e.number, e.callerid, u.username, u.email
FROM m_Extensions e
LEFT JOIN m_Users u ON e.userid = u.id;

-- Find extension by partial name
SELECT number, callerid, type
FROM m_Extensions
WHERE callerid LIKE '%John%';
```

---

### SIP Account Queries

```sql
-- SIP accounts with network filters
SELECT s.extension, s.secret, s.transport, nf.permit, nf.deny
FROM m_Sip s
LEFT JOIN m_NetworkFilters nf ON s.networkfilterid = nf.id;

-- Check SIP account for extension
SELECT * FROM m_Sip WHERE extension = '100';

-- All SIP accounts with UDP transport
SELECT extension, secret FROM m_Sip WHERE transport = 'udp';
```

---

### User Queries

```sql
-- Users with their extensions
SELECT u.id, u.username, u.email,
       GROUP_CONCAT(e.number) as extensions
FROM m_Users u
LEFT JOIN m_Extensions e ON u.id = e.userid
GROUP BY u.id;

-- Find user by email
SELECT * FROM m_Users WHERE email = 'user@example.com';
```

---

### Provider Queries

```sql
-- Active SIP providers
SELECT * FROM m_Providers
WHERE type = 'SIP' AND disabled = '0';

-- Provider with routing rules count
SELECT p.description, p.host,
       (SELECT COUNT(*) FROM m_IncomingRoutingTable WHERE provider = p.uniqid) as incoming_rules,
       (SELECT COUNT(*) FROM m_OutgoingRoutingTable WHERE providerid = p.uniqid) as outbound_rules
FROM m_Providers p;

-- All disabled providers
SELECT uniqid, description, type FROM m_Providers WHERE disabled = '1';
```

---

### Routing Queries

```sql
-- All incoming routes ordered by priority
SELECT ir.number, ir.provider, ir.extension, ir.action, ir.priority,
       p.description as provider_name
FROM m_IncomingRoutingTable ir
LEFT JOIN m_Providers p ON ir.provider = p.uniqid
ORDER BY ir.priority;

-- Routes for specific provider
SELECT * FROM m_IncomingRoutingTable WHERE provider = 'PROVIDER_UNIQID';

-- Outbound routes by priority
SELECT or.numberbeginswith, or.restnumbers, or.trimfrombegin, or.prepend,
       p.description as provider_name, or.priority
FROM m_OutgoingRoutingTable or
LEFT JOIN m_Providers p ON or.providerid = p.uniqid
ORDER BY or.priority;
```

---

### Call Feature Queries

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

-- IVR menu with actions
SELECT im.name, im.extension,
       ima.digits, ima.extension as destination
FROM m_IvrMenu im
LEFT JOIN m_IvrMenuActions ima ON im.uniqid = ima.ivr_menu_id
WHERE im.uniqid = 'IVR_UNIQID'
ORDER BY ima.digits;

-- All conference rooms
SELECT uniqid, name, extension, pinCode
FROM m_ConferenceRooms;
```

---

### Security Queries

```sql
-- SIP accounts with IP restrictions
SELECT s.extension, s.secret, nf.permit, nf.deny, nf.description
FROM m_Sip s
LEFT JOIN m_NetworkFilters nf ON s.networkfilterid = nf.id
WHERE s.networkfilterid IS NOT NULL;

-- Firewall rules with network filters
SELECT fr.category, fr.action, fr.description,
       nf.permit, nf.deny
FROM m_FirewallRules fr
LEFT JOIN m_NetworkFilters nf ON fr.networkfilterid = nf.id
ORDER BY fr.category;

-- Fail2ban whitelist
SELECT whitelist FROM m_Fail2BanRules;
```

---

### CDR Queries

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

-- Active calls right now
SELECT src_num, dst_num, start, duration
FROM cdr
WHERE endtime IS NULL OR endtime = '';

-- Failed calls in last hour
SELECT start, src_num, dst_num, disposition
FROM cdr_general
WHERE start > datetime('now', '-1 hour')
  AND disposition != 'ANSWERED'
ORDER BY start DESC;
```

---

## Advanced Composite Queries

### Complete Extension Profile

Get all information about an extension in one query:

```sql
SELECT
  e.number,
  e.type,
  e.callerid,
  u.username,
  u.email,
  s.secret as sip_password,
  s.transport,
  nf.permit as ip_permit,
  nf.deny as ip_deny
FROM m_Extensions e
LEFT JOIN m_Users u ON e.userid = u.id
LEFT JOIN m_Sip s ON e.number = s.extension
LEFT JOIN m_NetworkFilters nf ON s.networkfilterid = nf.id
WHERE e.number = '100';
```

---

### Provider Routing Summary

Get complete routing information for all providers:

```sql
SELECT
  p.description,
  p.host,
  p.type,
  COUNT(DISTINCT ir.id) as incoming_routes,
  COUNT(DISTINCT ort.id) as outbound_routes
FROM m_Providers p
LEFT JOIN m_IncomingRoutingTable ir ON p.uniqid = ir.provider
LEFT JOIN m_OutgoingRoutingTable ort ON p.uniqid = ort.providerid
GROUP BY p.uniqid;
```

---

### Queue with Full Member Details

Get queue configuration with complete member information:

```sql
SELECT
  cq.name as queue_name,
  cq.extension as queue_ext,
  cq.strategy,
  e.number as member_ext,
  e.callerid as member_name,
  s.secret as member_sip_pass,
  cqm.priority as member_priority
FROM m_CallQueues cq
LEFT JOIN m_CallQueueMembers cqm ON cq.uniqid = cqm.queue
LEFT JOIN m_Extensions e ON cqm.extension = e.number
LEFT JOIN m_Sip s ON e.number = s.extension
WHERE cq.uniqid = 'QUEUE_ID'
ORDER BY cqm.priority;
```

---

## Data Validation Queries

### Validate Enum Values

```sql
-- Check extension types are valid
SELECT DISTINCT type FROM m_Extensions;
-- Should only return: SIP, EXTERNAL, QUEUE, CONFERENCE, DIALPLAN APPLICATION, IVR MENU

-- Check provider types
SELECT DISTINCT type FROM m_Providers;
-- Should only return: SIP, IAX

-- Check incoming route actions
SELECT DISTINCT action FROM m_IncomingRoutingTable;
-- Should only return: extension, hangup, busy, voicemail

-- Check SIP transports
SELECT DISTINCT transport FROM m_Sip;
-- Should only return: udp, tcp, tls

-- Check firewall categories
SELECT DISTINCT category FROM m_FirewallRules;
-- Should only return: SIP, WEB, SSH, AMI, ICMP, CTI
```

---

### Validate Required Fields

```sql
-- Extensions with missing callerid
SELECT number, type FROM m_Extensions
WHERE callerid IS NULL OR callerid = '';

-- SIP accounts without password
SELECT extension FROM m_Sip
WHERE secret IS NULL OR secret = '';

-- Providers without host
SELECT uniqid, description FROM m_Providers
WHERE host IS NULL OR host = '';

-- Users without email
SELECT id, username FROM m_Users
WHERE email IS NULL OR email = '';

-- Network filters without permit/deny
SELECT id, description FROM m_NetworkFilters
WHERE (permit IS NULL OR permit = '')
  AND (deny IS NULL OR deny = '');
```

---

### Validate Data Ranges

```sql
-- Check extension number format (should be 2-8 digits)
SELECT number FROM m_Extensions
WHERE LENGTH(number) < 2 OR LENGTH(number) > 8;

-- Check priority values (should be 0-9999)
SELECT id, priority FROM m_IncomingRoutingTable
WHERE priority < 0 OR priority > 9999;

-- Check outbound route priorities
SELECT id, priority FROM m_OutgoingRoutingTable
WHERE priority < 0 OR priority > 9999;

-- Check queue member priorities
SELECT queue, extension, priority FROM m_CallQueueMembers
WHERE priority < 0 OR priority > 99;
```

---

## Data Consistency Queries

### Find Orphaned Records

```sql
-- Orphaned SIP accounts (no matching extension)
SELECT s.extension FROM m_Sip s
LEFT JOIN m_Extensions e ON s.extension = e.number
WHERE e.number IS NULL;

-- Extensions without SIP accounts (for SIP type)
SELECT e.number FROM m_Extensions e
LEFT JOIN m_Sip s ON e.number = s.extension
WHERE e.type='SIP' AND s.extension IS NULL;

-- Routing rules pointing to non-existent extensions
SELECT ir.number, ir.extension FROM m_IncomingRoutingTable ir
LEFT JOIN m_Extensions e ON ir.extension = e.number
WHERE ir.action='extension' AND e.number IS NULL;

-- Queue members pointing to non-existent extensions
SELECT cqm.queue, cqm.extension FROM m_CallQueueMembers cqm
LEFT JOIN m_Extensions e ON cqm.extension = e.number
WHERE e.number IS NULL;

-- IVR actions pointing to non-existent extensions
SELECT ima.ivr_menu_id, ima.digits, ima.extension
FROM m_IvrMenuActions ima
LEFT JOIN m_Extensions e ON ima.extension = e.number
WHERE e.number IS NULL;

-- Routing rules with non-existent providers
SELECT ir.id, ir.number, ir.provider
FROM m_IncomingRoutingTable ir
LEFT JOIN m_Providers p ON ir.provider = p.uniqid
WHERE p.uniqid IS NULL;

-- Network filter references that don't exist
SELECT s.extension, s.networkfilterid
FROM m_Sip s
LEFT JOIN m_NetworkFilters nf ON s.networkfilterid = nf.id
WHERE s.networkfilterid IS NOT NULL AND nf.id IS NULL;
```

---

### Find Duplicate Records

```sql
-- Duplicate extension numbers (should never happen - PRIMARY KEY)
SELECT number, COUNT(*) as count
FROM m_Extensions
GROUP BY number
HAVING count > 1;

-- Duplicate user emails (should never happen - UNIQUE)
SELECT email, COUNT(*) as count
FROM m_Users
GROUP BY email
HAVING count > 1;

-- Multiple general user numbers for same user (business rule)
SELECT userid, COUNT(*) as count
FROM m_Extensions
WHERE is_general_user_number = '1'
GROUP BY userid
HAVING count > 1;
```

---

## Settings Queries

```sql
-- Get specific setting
SELECT value FROM m_PbxSettings WHERE key = 'PBXVersion';

-- All language-related settings
SELECT * FROM m_PbxSettings WHERE key LIKE '%Language%';

-- All security settings
SELECT * FROM m_PbxSettings
WHERE key IN ('SSHPassword', 'WebAdminLogin', 'WebAdminPassword');

-- System information
SELECT
  (SELECT value FROM m_PbxSettings WHERE key = 'PBXVersion') as version,
  (SELECT value FROM m_PbxSettings WHERE key = 'PBXLanguage') as language,
  (SELECT value FROM m_PbxSettings WHERE key = 'PBXTimezone') as timezone;
```

---

## File Queries

```sql
-- All custom sound files
SELECT * FROM m_SoundFiles WHERE category = 'custom';

-- Music on hold files
SELECT * FROM m_SoundFiles WHERE category = 'moh';

-- Modified custom files
SELECT filepath, mode FROM m_CustomFiles WHERE changed = '1';

-- All custom file overrides
SELECT filepath, mode, LENGTH(content) as size
FROM m_CustomFiles;
```

---

## Statistics Queries

```sql
-- Count entities by type
SELECT
  (SELECT COUNT(*) FROM m_Extensions) as total_extensions,
  (SELECT COUNT(*) FROM m_Extensions WHERE type='SIP') as sip_extensions,
  (SELECT COUNT(*) FROM m_CallQueues) as queues,
  (SELECT COUNT(*) FROM m_ConferenceRooms) as conferences,
  (SELECT COUNT(*) FROM m_IvrMenu) as ivr_menus;

-- Count users and extensions
SELECT
  (SELECT COUNT(*) FROM m_Users) as total_users,
  (SELECT COUNT(DISTINCT userid) FROM m_Extensions WHERE userid IS NOT NULL) as users_with_extensions;

-- Count routing rules
SELECT
  (SELECT COUNT(*) FROM m_IncomingRoutingTable) as incoming_routes,
  (SELECT COUNT(*) FROM m_OutgoingRoutingTable) as outbound_routes;

-- Provider statistics
SELECT
  COUNT(*) as total_providers,
  SUM(CASE WHEN type='SIP' THEN 1 ELSE 0 END) as sip_providers,
  SUM(CASE WHEN type='IAX' THEN 1 ELSE 0 END) as iax_providers,
  SUM(CASE WHEN disabled='1' THEN 1 ELSE 0 END) as disabled_providers
FROM m_Providers;
```

---

## CDR Statistics

```sql
-- Call statistics for today
SELECT
  COUNT(*) as total_calls,
  SUM(CASE WHEN disposition='ANSWERED' THEN 1 ELSE 0 END) as answered,
  SUM(CASE WHEN disposition='NO ANSWER' THEN 1 ELSE 0 END) as no_answer,
  SUM(CASE WHEN disposition='BUSY' THEN 1 ELSE 0 END) as busy,
  SUM(billsec) as total_talk_time_sec
FROM cdr_general
WHERE DATE(start) = DATE('now');

-- Top 10 callers by number of calls
SELECT src_num, COUNT(*) as call_count
FROM cdr_general
WHERE DATE(start) >= DATE('now', '-7 days')
GROUP BY src_num
ORDER BY call_count DESC
LIMIT 10;

-- Average call duration by extension
SELECT
  src_num,
  COUNT(*) as calls,
  AVG(billsec) as avg_duration,
  SUM(billsec) as total_duration
FROM cdr_general
WHERE disposition = 'ANSWERED'
  AND DATE(start) >= DATE('now', '-30 days')
GROUP BY src_num
ORDER BY calls DESC;

-- Calls by hour of day
SELECT
  strftime('%H', start) as hour,
  COUNT(*) as call_count
FROM cdr_general
WHERE DATE(start) >= DATE('now', '-7 days')
GROUP BY hour
ORDER BY hour;
```

---

## Export Queries

```sql
-- Extension directory export
SELECT
  e.number,
  e.callerid,
  e.type,
  u.email
FROM m_Extensions e
LEFT JOIN m_Users u ON e.userid = u.id
WHERE e.show_in_phonebook = '1'
ORDER BY e.callerid;

-- Provider configuration export
SELECT
  description,
  type,
  host,
  disabled
FROM m_Providers
ORDER BY description;

-- Call queue configuration export
SELECT
  cq.name,
  cq.extension,
  cq.strategy,
  GROUP_CONCAT(cqm.extension || ':' || cqm.priority) as members
FROM m_CallQueues cq
LEFT JOIN m_CallQueueMembers cqm ON cq.uniqid = cqm.queue
GROUP BY cq.uniqid;
```

---

## Query Output Formatting

### Column Mode
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions LIMIT 5" \
  -header -column
```

### JSON Output
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions LIMIT 5" \
  -json
```

### CSV Export
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions" \
  -csv -header > extensions.csv
```

### HTML Table
```bash
docker exec <container_id> sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_Extensions LIMIT 10" \
  -html > extensions.html
```

---

## Performance Tips

1. **Use indexes** - Extension numbers and IDs are indexed
2. **Limit results** - Use `LIMIT` for large tables (especially CDR)
3. **Filter early** - Apply `WHERE` before `JOIN` when possible
4. **Avoid SELECT *** - Specify columns you need
5. **Use prepared statements** - For repeated queries with different parameters

---

## See Also

- [Schema Reference](schema-reference.md) - Complete table definitions
- [Verification Scenarios](verification-scenarios.md) - Step-by-step verification workflows
