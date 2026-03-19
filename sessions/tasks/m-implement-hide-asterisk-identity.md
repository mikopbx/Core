---
name: m-implement-hide-asterisk-identity
branch: feature/hide-asterisk-identity
status: pending
created: 2026-03-19
---

# Hide Asterisk server identity from external interfaces

## Problem/Goal
Атакующие используют fingerprinting для определения что SIP-сервер — Asterisk, и подбирают специфические эксплойты. Нужно скрыть все маркеры идентификации во внешних интерфейсах.

## Fingerprinting Points

| # | Интерфейс | Что отдаёт | Где hardcoded |
|---|-----------|-----------|---------------|
| 1 | SIP User-Agent/Server | `Asterisk PBX 22.7.0` | pjsip.conf → конфиг |
| 2 | SDP origin | Asterisk-специфичный формат | pjsip.conf → конфиг |
| 3 | AMI banner (порт 5038) | `Asterisk Call Manager/11.0.0` | `main/manager.c` |
| 4 | AJAM HTTP (порт 8088) | `Server: Asterisk/22.7.0` + HTML branding | `main/http.c` |
| 5 | SIP OPTIONS response | User-Agent + Allow header | pjsip.conf → конфиг |
| 6 | SIP Allow header | Набор методов характерный для Asterisk | Исследовать |

## Proposed Changes

### 1. SIP User-Agent (конфиг MikoPBX — без патча Asterisk)
Файл: `src/Core/Asterisk/Configs/SIPConf.php`
```
[global]
user_agent = PBX
```

### 2. Патч исходников Asterisk при сборке (T2 SDE)
Создать patch-файл для сборочной системы:

**main/manager.c** — AMI banner:
```diff
- "Asterisk Call Manager/%s\r\n"
+ "PBX Call Manager/%s\r\n"
```

**main/http.c** — HTTP Server header + httpstatus page:
```diff
- "Asterisk/%s"
+ "PBX"
```
Убрать версию из Server header. Заменить HTML branding в httpstatus.

### 3. Опционально: SDP origin, Allow header
Исследовать при реализации — может потребовать дополнительных патчей.

## Notes
- AMI/AJAM слушают на `0.0.0.0` — нужен для внешних интеграций (CRM, модули)
- Баннеры hardcoded в C-коде Asterisk — нет конфигурационных опций
- Нужен patch-файл для T2 SDE сборочной системы

## Success Criteria
- [ ] SIP User-Agent header не содержит "Asterisk"
- [ ] SIP Server header не содержит "Asterisk"
- [ ] AMI banner не содержит "Asterisk"
- [ ] AJAM HTTP не содержит "Asterisk" и не отдаёт версию
- [ ] SIP OPTIONS response не позволяет определить Asterisk
- [ ] Существующие SIP-провайдеры и телефоны продолжают работать

## Context Manifest
<!-- Added by context-gathering agent -->

## Work Log
- [2026-03-19] Task created
