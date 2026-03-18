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

## Preset Values (draft)

| Параметр | Слабая | Нормальная | Усиленная | Параноя |
|----------|--------|------------|-----------|---------|
| maxretry | 10 | 5 | 3 | 1 |
| FindTime (мин) | 30 | 180 (3ч) | 360 (6ч) | 720 (12ч) |
| BanTime (мин) | 60 | 10080 (7д) | 43200 (30д) | 86400 (60д) |
## User Notes
- MaxReqSec (PBXFirewallMaxReqSec) остаётся отдельным слайдером, не входит в пресеты
- Вторая связанная задача: прогрессивная эскалация банов (10мин → 12ч → 24ч → 3дня → навсегда) — будет отдельным таском
- Известный баг: whitelist IP попадают под hashlimit до проверки whitelist (IptablesConf.php:157-176) — отдельный фикс

## Context Manifest
<!-- Added by context-gathering agent -->

## Work Log
- [2026-03-18] Task created
