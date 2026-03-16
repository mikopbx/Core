---
name: h-fix-fail2ban-chains-after-firewall-reload
branch: fix/fail2ban-chains-after-firewall-reload
status: pending
created: 2026-03-17
---

# Fix fail2ban chains destroyed by firewall reload

## Problem/Goal

When `IptablesConf::reloadFirewall()` runs `iptables -F INPUT`, it destroys fail2ban chains (`f2b-ASTERISK`, `f2b-ASTERISK_AMI`, `f2b-ASTERISK_PUBLIC`, `f2b-EXPLOIT_SCANNER`). After this, fail2ban encounters:

1. "Invariant check failed" — chain grep returns empty
2. "No chain/target/match by that name" — unban from deleted chain
3. Forced "Reban" — fail2ban tries to restore environment

This was always present but became more frequent after adding drag-drop priority reordering (each drag → `NetworkFilters::save()` → `WorkerModelsEvents` → `reloadFirewall()` → chains destroyed).

Error log pattern:
```
fail2ban.utils    ERROR -- exec: iptables -w -n -L INPUT | grep -q 'f2b-ASTERISK[ \t]'
fail2ban.utils    ERROR -- returned 1
fail2ban.CommandAction ERROR Invariant check failed. Trying to restore a sane environment
```

## Success Criteria
- [ ] Firewall reload does not destroy fail2ban chains
- [ ] No "Invariant check failed" errors in fail2ban log after firewall reload
- [ ] Banned IPs remain banned after firewall reload
- [ ] fail2ban unban operations work correctly after firewall reload

## User Notes
- Options to explore: restart fail2ban after firewall reload, save/restore f2b chains around flush, use dedicated chain for MikoPBX rules instead of flushing INPUT
- Server for testing: serber@boffart.miko.ru

## Context Manifest
<!-- Added by context-gathering agent -->

## Work Log
- [2026-03-17] Task created from fail2ban errors observed on boffart.miko.ru
