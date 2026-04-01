---
name: m-implement-security-presets-slider
branch: feature/security-presets-slider
status: pending
created: 2026-03-18
---

# Security Presets Slider for Fail2Ban Settings

## Problem/Goal
На странице `/admin-cabinet/fail2-ban/index/` заменить ручную настройку параметров fail2ban на один слайдер с предустановленными профилями защиты. Каждый профиль автоматически задаёт оптимальные значения maxretry, FindTime, BanTime и PBXFirewallMaxReqSec.

## Success Criteria
- [ ] Слайдер с 4 степенями: Слабая / Нормальная / Усиленная / Параноя (под атакой)
- [ ] Каждый уровень автоматически задаёт: maxretry, FindTime, BanTime
- [ ] Значения сохраняются в PbxSettings и применяются к fail2ban конфигурации
- [ ] UI показывает текущие значения параметров для выбранного уровня
- [ ] Переключение уровня перегенерирует конфигурацию fail2ban
- [ ] Работает на существующей странице fail2ban без поломки текущего функционала
- [ ] MaxReqSec остаётся отдельным независимым слайдером

## Preset Values (approved 2026-04-01)

| Параметр | Слабая (default) | Нормальная | Усиленная | Паранойя |
|----------|-----------------|------------|-----------|----------|
| maxretry | 20 | 10 | 5 | 3 |
| FindTime | 600 (10 мин) | 3600 (1ч) | 21600 (6ч) | 86400 (24ч) |
| BanTime | 600 (10 мин) | 86400 (1д) | 604800 (7д) | 2592000 (30д) |
## User Notes
- MaxReqSec (PBXFirewallMaxReqSec) остаётся отдельным слайдером, не входит в пресеты
- Вторая связанная задача: прогрессивная эскалация банов (10мин → 12ч → 24ч → 3дня → навсегда) — будет отдельным таском
- Известный баг: whitelist IP попадают под hashlimit до проверки whitelist (IptablesConf.php:157-176) — отдельный фикс

## Context Manifest
<!-- Added by context-gathering agent -->

## Work Log
- [2026-03-18] Task created
