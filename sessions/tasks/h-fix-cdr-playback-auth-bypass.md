---
name: h-fix-cdr-playback-auth-bypass
branch: fix/cdr-playback-auth
status: pending
created: 2026-03-18
---

# Fix: CDR playback endpoint serves files without authentication

## Problem/Goal

Эндпоинт `/pbxcore/api/cdr/v2/playback?view=` отдаёт файлы (записи разговоров) напрямую через nginx alias, минуя PHP-аутентификацию. Переменная `session_check_required` установлена в nginx config, но `upstream_status -` в логах подтверждает что запрос обслуживается nginx напрямую — проверка сессии не происходит.

### Текущая ситуация
- `213.244.98.29` скачивал `cdr.db` и бэкапы **без авторизации** (python-requests, без cookies/JWT)
- `session_check_required = '1'` установлен, но lua/auth проверка не блокирует неавторизованные запросы
- Файлы с запрещёнными расширениями (.db, .conf, etc.) уже заблокированы нашим whitelist фиксом
- Но **записи разговоров** (mp3, webm, wav) всё ещё доступны без авторизации

### Что нужно
1. Проверить почему `session_check_required` не работает для этого location
2. Обеспечить JWT/session проверку перед отдачей файлов
3. Запросы запрещённых расширений должны приводить к бану (fail2ban интеграция)

### Связанный контекст
- V3 API endpoint `GET /pbxcore/api/v3/cdr:playback?token=xxx` уже использует token-based auth
- V2 endpoint (`/cdr/v2/playback`) — legacy, используется SoundFiles volt templates и CDR JS
- Nginx config: `src/Core/System/RootFS/etc/nginx/mikopbx/locations/cdr-api.conf`
- Auth lua: проверить `unified-security.lua` — обрабатывает ли `session_check_required`

## Success Criteria
- [ ] `/cdr/v2/playback` требует аутентификацию (JWT cookie или session) для внешних IP
- [ ] Неавторизованные запросы к playback возвращают 401/403
- [ ] Запросы запрещённых расширений (.db, .conf, etc.) приводят к бану через fail2ban
- [ ] Существующий функционал CDR/SoundFiles в admin-cabinet не ломается
- [ ] localhost (127.0.0.1) запросы продолжают работать без авторизации

## Context Manifest
<!-- Added by context-gathering agent -->

## Work Log
- [2026-03-18] Task created. Whitelist path fix and extension blacklist already deployed.
