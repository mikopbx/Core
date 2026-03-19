---
name: m-implement-hide-asterisk-identity
branch: feature/hide-asterisk-identity
status: pending
created: 2026-03-19
---

# Hide Asterisk server identity from external interfaces

## Problem/Goal
Атакующие используют fingerprinting для определения что SIP-сервер — Asterisk, и подбирают специфические эксплойты. Нужно скрыть все маркеры идентификации Asterisk во внешних интерфейсах.

## Fingerprinting Points

### 1. SIP User-Agent / Server header
- Asterisk отправляет `User-Agent: Asterisk PBX 21.x.x` в SIP-ответах
- Настраивается через `pjsip.conf` → `[global]` → `user_agent=`
- Файл: `src/Core/Asterisk/Configs/SIPConf.php`

### 2. SDP origin line
- `o=- ... IN IP4` — формат может быть Asterisk-специфичным
- Настраивается через `sdp_owner` в PJSIP global

### 3. AMI banner
- При подключении к порту 5038: `Asterisk Call Manager/x.x`
- Настраивается через `manager.conf` → `channelvars=` (нет прямой опции скрытия)
- Файл: `src/Core/Asterisk/Configs/ManagerConf.php`

### 4. AJAM (HTTP AMI)
- HTTP-интерфейс AMI — заголовки могут содержать Asterisk identification
- Файл: `src/Core/Asterisk/Configs/HttpConf.php`

### 5. SIP 100 Trying / Allow header
- Набор поддерживаемых SIP-методов характерен для Asterisk
- Allow: INVITE, ACK, CANCEL, OPTIONS, BYE, REFER, SUBSCRIBE, NOTIFY, INFO, PUBLISH, MESSAGE

### 6. SIP OPTIONS response
- Ответ на OPTIONS probe содержит User-Agent и Server headers
- Основной способ fingerprinting сканерами (sipvicious, etc.)

## Proposed Changes

### User-Agent replacement
Заменить на нейтральное: `MikoPBX` (без версии)
```
[global]
user_agent = MikoPBX
```

### AMI banner
Исследовать возможность замены через `manager.conf` или compile-time option.
Если невозможно — ограничить доступ к AMI только localhost.

### AJAM
Проверить нужен ли внешний доступ. Если нет — привязать к 127.0.0.1.

## Success Criteria
- [ ] SIP User-Agent header не содержит "Asterisk"
- [ ] SIP Server header не содержит "Asterisk"
- [ ] AMI banner не содержит "Asterisk" или доступ ограничен localhost
- [ ] AJAM не доступен извне или не идентифицирует Asterisk
- [ ] SIP OPTIONS response не позволяет определить Asterisk
- [ ] Существующие SIP-провайдеры и телефоны продолжают работать

## Context Manifest
<!-- Added by context-gathering agent -->

## Work Log
- [2026-03-19] Task created
