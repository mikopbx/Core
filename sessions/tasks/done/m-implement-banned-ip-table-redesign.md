---
name: m-implement-banned-ip-table-redesign
branch: feature/banned-ip-table-redesign
status: completed
created: 2026-03-17
---

# Redesign Banned IP Table for Compact Display

## Problem/Goal

The banned IP table on the Fail2Ban page (`Fail2Ban/IndexTabs/tabBanned.volt`) displays ban reasons as full-text strings with dates inline, which bloats row height when an IP has multiple bans. The table lacks "ban date" and "expires" columns.

**Current state:**
- 3 columns: IP, Reason, Unban button
- Reason column contains verbose text like:
  `Ошибки авторизации AMI или AJAM - 3/16/2026, 10:47:43 AM`
  `Ошибки авторизации SIP (public) - 3/16/2026, 10:47:43 AM`
  Multiple reasons joined with `<br>`, making rows very tall

**Desired state:**
- 5 columns: IP, Tags (reasons), Ban Date, Expires, Unban button
- Reason column shows compact colored tags (labels) instead of full text
- Hovering a tag shows full description in a popup tooltip
- "Ban Date" column shows when the IP was banned
- "Expires" column shows when the ban expires

## Tag Mapping

Short tag labels derived from jail names:

| Jail | Tag | Color | Full tooltip |
|------|-----|-------|--------------|
| `asterisk_ami_v2` | AMI | orange | globalTranslate.f2b_Jail_asterisk_ami_v2 |
| `asterisk_error_v2` | SIP | blue | globalTranslate.f2b_Jail_asterisk_error_v2 |
| `asterisk_public_v2` | SIP | blue | globalTranslate.f2b_Jail_asterisk_public_v2 |
| `asterisk_security_log_v2` | SIP | blue | globalTranslate.f2b_Jail_asterisk_security_log_v2 |
| `asterisk_v2` | SIP | blue | globalTranslate.f2b_Jail_asterisk_v2 |
| `asterisk_iax_v2` | IAX | teal | globalTranslate.f2b_Jail_asterisk_iax_v2 |
| `dropbear_v2` | SSH | grey | globalTranslate.f2b_Jail_dropbear_v2 |
| `mikopbx-exploit-scanner_v2` | SCAN | red | globalTranslate.f2b_Jail_mikopbx-exploit-scanner_v2 |
| `mikopbx-nginx-errors_v2` | NGINX | purple | globalTranslate.f2b_Jail_mikopbx-nginx-errors_v2 |
| `mikopbx-www_v2` | WEB | olive | globalTranslate.f2b_Jail_mikopbx-www_v2 |

Multiple tags per IP shown side by side. Each tag is a Fomantic UI `ui mini label` with popup tooltip showing full description.

## Success Criteria
- [x] Volt template updated with 5 columns: IP, Tags, Ban Date, Expires, Unban
- [x] JavaScript `cbGetBannedIpList` builds rows with tag labels instead of verbose text
- [x] Each tag has popup tooltip with full jail description from `globalTranslate`
- [x] Tag-to-jail mapping implemented with appropriate colors
- [x] "Ban Date" column displays earliest `timeofban` for the IP, formatted as DD.MM.YYYY HH:MM
- [x] "Expires" column displays latest `timeunban` for the IP, formatted as DD.MM.YYYY HH:MM
- [x] DataTable columns config updated (5 columns, sortable Ban Date and Expires)
- [x] Table remains compact and readable with multiple bans per IP
- [x] Translation keys added for new column headers (`f2b_BanDate`, `f2b_Expires`) — all 29 languages
- [x] Transpiled JS updated via babel-compiler
- [x] Unknown jail names gracefully fall back to a generic grey tag

## Affected Files

### Must modify
1. `src/AdminCabinet/Views/Fail2Ban/IndexTabs/tabBanned.volt` — add 2 new `<th>` columns
2. `sites/admin-cabinet/assets/js/src/Fail2Ban/fail-to-ban-index.js` — tag rendering, new columns, DataTable config
3. `src/Common/Messages/ru/NetworkSecurity.php` — new translation keys
4. `src/Common/Messages/en/NetworkSecurity.php` — new translation keys

### Must regenerate
5. `sites/admin-cabinet/assets/js/pbx/Fail2Ban/fail-to-ban-index.js` — babel transpile

### No backend changes needed
- `GetBannedIpsAction.php` already returns `timeofban` and `timeunban` per ban entry
- API response structure is sufficient

## Context Manifest

### Key files (read)
- `sites/admin-cabinet/assets/js/src/Fail2Ban/fail-to-ban-index.js:297-356` — current `cbGetBannedIpList` callback
- `src/AdminCabinet/Views/Fail2Ban/IndexTabs/tabBanned.volt` — current 3-column template
- `src/PBXCoreREST/Lib/Firewall/GetBannedIpsAction.php:73-126` — API response structure
- `src/Common/Messages/ru/NetworkSecurity.php:24-35` — jail translation keys

### API response structure (from GetBannedIpsAction)
```json
{
  "104.131.177.14": {
    "country": "us",
    "countryName": "United States",
    "bans": [
      {
        "jail": "mikopbx-exploit-scanner_v2",
        "timeofban": 1742133693,
        "timeunban": 1742220093,
        "v": "2"
      }
    ]
  }
}
```

## User Notes
- Tag colors and short labels are proposals — user may adjust during implementation
- For IPs with multiple SIP bans (different jails like public, security_log, error), show one SIP tag but tooltip lists all specific jails
- Consider: if same jail banned the IP multiple times, show single tag (deduplicate)

## Work Log
- [2026-03-17] Task created with full analysis of current implementation
