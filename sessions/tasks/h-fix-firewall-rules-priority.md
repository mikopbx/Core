---
name: h-fix-firewall-rules-priority
branch: fix/firewall-rules-priority
status: pending
created: 2026-03-16
---

# Fix firewall rules priority order and add drag-drop reordering

## Problem/Goal

GeoIP module blocking is ineffective because the `0.0.0.0/0` (Internet) network filter rule generates ACCEPT rules **above** module rules (like GeoIP ipset DROP). Traffic is accepted before reaching the module's block rules.

Current iptables order (broken):
1. ESTABLISHED/RELATED
2. User subnet rules (miko, MTS, etc.) — mixed with 0.0.0.0/0
3. **0.0.0.0/0 ACCEPT** — opens ports for everyone
4. Module rules (GeoIP ipset DROP) — too late, traffic already accepted
5. Final DROP

Required order:
1. ESTABLISHED/RELATED
2. User subnet rules (drag-drop priority between them)
3. Module rules (`onAfterIptablesReload`)
4. `0.0.0.0/0` ACCEPT — lowest priority, last before final DROP
5. Final DROP

Changes needed:
- Add `priority` field to `m_NetworkFilters` model/table
- `IptablesConf` generates rules respecting priority, with `0.0.0.0/0` always last
- UI drag-drop reordering for user subnets on firewall page
- Migration to add `priority` column and set initial values

## Success Criteria
- [ ] `m_NetworkFilters` has `priority` integer field
- [ ] Migration adds column and sets `0.0.0.0/0` to lowest priority
- [ ] `IptablesConf` generates iptables rules in priority order: user subnets → module hooks → 0.0.0.0/0 → final DROP
- [ ] GeoIP ipset DROP rules appear BEFORE 0.0.0.0/0 ACCEPT in iptables
- [ ] Firewall UI has drag-drop reordering for network filter priority
- [ ] `changePriority` API endpoint works for NetworkFilters

## User Notes
- `0.0.0.0/0` is a system rule that cannot be deleted
- User rules should have higher priority than module rules
- Module rules should have higher priority than `0.0.0.0/0`
- No priority ordering needed between modules themselves
- Drag-drop: higher position = higher priority (like iptables)

## Context Manifest
<!-- Added by context-gathering agent -->

## Work Log
- [2026-03-16] Task created from production issue on boffart.miko.ru
