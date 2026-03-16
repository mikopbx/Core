---
name: h-fix-fail2ban-chains-after-firewall-reload
branch: fix/fail2ban-chains-after-firewall-reload
status: completed
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
- [x] Firewall reload does not destroy fail2ban chains
- [x] No "Invariant check failed" errors in fail2ban log after firewall reload
- [x] Banned IPs remain banned after firewall reload
- [x] fail2ban unban operations work correctly after firewall reload

## User Notes
- Options to explore: restart fail2ban after firewall reload, save/restore f2b chains around flush, use dedicated chain for MikoPBX rules instead of flushing INPUT
- Server for testing: serber@boffart.miko.ru

## Context Manifest

### Key Files Modified
- `src/Core/System/Configs/IptablesConf.php` -- `dropAllRules()`, `reloadFirewall()`, `waitForFail2banStop()`
- `src/Core/Workers/Libs/WorkerModelsEvents/Actions/ReloadFirewallAction.php` -- Removed redundant fail2ban restart
- `src/PBXCoreREST/Lib/SystemManagementProcessor.php` (`SystemActions`) -- Updated `reloadFirewall` API action

### Root Cause
`iptables -F INPUT` in `dropAllRules()` flushed all INPUT chain rules including fail2ban jump rules to `f2b-*` chains. Fail2ban's periodic `actioncheck` detected missing chains and triggered "Invariant check failed" errors. The fix stops fail2ban before the flush and restarts it after new rules are applied.

## Work Log

### 2026-03-17

#### Completed
- Created task from fail2ban errors observed on boffart.miko.ru
- Implemented Approach 1: stop fail2ban before iptables flush, restart after
- Added `waitForFail2banStop()` method to `IptablesConf` -- waits up to 5 seconds for fail2ban process to exit
- Modified `reloadFirewall()` to stop fail2ban before `applyConfig()` and restart after
- Removed redundant `$fail2ban->reStart()` from `ReloadFirewallAction::execute()` (now handled inside `reloadFirewall()`)
- Removed redundant `$fail2ban->reStart()` from `SystemActions::reloadFirewall()` (same consolidation)
- Removed no-op `iptables -X INPUT` and `ip6tables -X INPUT` commands from `dropAllRules()`
- Committed as `823c347f2`

#### Decisions
- Chose Approach 1 (stop/restart fail2ban around flush) over Approach 2 (dedicated MIKOPBX chain) for simplicity and lower risk
- Consolidated fail2ban restart into `reloadFirewall()` to eliminate duplicate restarts across callers
- Brief unprotected window during flush is acceptable; fail2ban restores bans from its SQLite DB on restart
