---
name: h-implement-api-queue-backpressure
branch: feature/api-queue-backpressure
status: completed
created: 2026-04-03
---

# API Queue Backpressure — защита от перегрузки очереди запросов

## Problem/Goal

REST API MikoPBX использует Redis-очередь с 3 воркерами (WorkerApiCommands). При лавине запросов (модули, AJAX-polling, внешние клиенты) очередь растёт неограниченно — до 1000+ pending requests. Каждый запрос блокирует php-fpm воркер на 30 секунд ожидания ответа. При 20 php-fpm процессах система полностью блокируется.

**Инцидент 2026-04-03**: sip.miko.ru — очередь достигла 1058 запросов, веб-интерфейс полностью недоступен, потребовался reboot.

**Два механизма защиты:**

### A. Fast-fail (ранний отказ)
Перед добавлением запроса в очередь — проверить длину. Если >N → HTTP 503 мгновенно. PHP-fpm воркер освобождается сразу вместо 30 секунд ожидания.

### B. TTL на запросах (дроп протухших)
При извлечении запроса из очереди — проверить возраст. Если запрос старше 35 сек → пропустить (клиент уже получил timeout после 30 сек). Воркер не тратит время на бесполезную работу.

## Success Criteria

- [x] **Механизм A**: BaseController проверяет длину очереди перед rpush. При >50 возвращает HTTP 503 без ожидания
- [x] **Механизм B**: Все запросы содержат `created_at` timestamp. WorkerApiCommands дропает запросы старше 35 секунд
- [x] **Frontend**: AJAX обработчики ловят 503 и делают retry с exponential backoff (3 попытки: 1s/2s/4s)
- [x] **Response TTL**: Снижен с 3600 до 120 секунд (orphaned response keys не висят час)
- [x] **Конфигурируемость**: Пороги через PbxSettings (API_QUEUE_MAX_LENGTH, API_REQUEST_TTL)
- [x] **Backward compatible**: Запросы без created_at обрабатываются нормально (legacy)
- [x] **Логирование**: Dropped/rejected запросы логируются в syslog (LOG_NOTICE)

## Context Manifest

### Критические файлы

| Файл | Строки | Что менять |
|------|--------|------------|
| `src/PBXCoreREST/Controllers/BaseController.php` | 75, 78, 85-92 | **A**: проверка длины перед rpush + 503. **B step1**: добавить `created_at` в request message |
| `src/PBXCoreREST/Workers/WorkerApiCommands.php` | 50-63, 69, 83, 140, 205 | **B step2**: проверка staleness перед processJobDirect. Снизить REDIS_RESPONSE_TTL |
| `src/PBXCoreREST/Controllers/BaseRestController.php` | — | Routing к sendRequestToBackendWorker |
| `src/PBXCoreREST/Http/Request.php` | 111-113 | X-Processor-Timeout header (уже есть) |
| `src/Core/Workers/WorkerRedisBase.php` | — | Parent class WorkerApiCommands, heartbeat |

### Текущая архитектура (без backpressure)

```
HTTP → nginx → php-fpm → BaseController::sendRequestToBackendWorker()
  Line 75: request_id = uniqid(...)           ← НЕТ timestamp
  Line 78: redis->rpush(api:requests, ...)    ← безлимитно
  Line 85: lLen → warning if >20              ← только лог, запрос всё равно в очереди
  Line 138-206: polling redis->get(response)  ← php-fpm блокирован до 30 сек
  Line 218-226: timeout → "Request timeout"   ← php-fpm воркер потерян на 30 сек

WorkerApiCommands (3 инстанса):
  Line 140: blpop(api:requests, 5)            ← берёт без проверки возраста
  Line 205: processJobDirect(...)             ← обрабатывает даже протухший запрос
```

### Целевая архитектура

```
HTTP → nginx → php-fpm → BaseController::sendRequestToBackendWorker()
  request_id = uniqid(...)
  created_at = microtime(true)                ← NEW: timestamp
  queueLength = lLen(api:requests)
  if queueLength > 50:                        ← NEW: fast-fail
    return 503 Service Unavailable            ← php-fpm свободен мгновенно
  rpush(api:requests, ...)
  polling response...

WorkerApiCommands:
  blpop(api:requests, 5)
  requestAge = now - created_at
  if requestAge > 35:                         ← NEW: stale check
    log "Dropping stale request"
    sendResponse(error: timeout)              ← cleanup
    skip
  processJobDirect(...)                       ← только свежие запросы
```

### Конфигурация по умолчанию

| Параметр | Значение | Обоснование |
|----------|----------|-------------|
| maxTimeout (server) | 30 сек (min clamp) | BaseController:67 |
| maxProc (workers) | 3 | WorkerApiCommands:83 |
| REDIS_RESPONSE_TTL | 3600 → **120** сек | Orphaned keys не висят час |
| API_QUEUE_MAX_LENGTH | **50** | 3 воркера × ~15 сек обработки ≈ 45 запросов |
| API_REQUEST_TTL | **35** сек | Чуть больше client timeout (30 сек) |

### Frontend (503 handling)

Текущее состояние: AJAX handlers проверяют только 401/403, 503 не обрабатывается. Нужно добавить retry с backoff в базовый AJAX-обработчик. Ключевые файлы фронтенда для поиска паттерна — PbxApi или аналогичный центральный модуль API-вызовов.

### Edge Cases

1. **Race condition** в проверке длины очереди — допустимо (eventual consistency, worst case +1 запрос)
2. **Debug requests** (X-Debug-The-Request) ставят timeout 9999 — TTL check должен их пропускать
3. **Async requests** — 503 менее полезен (клиент не ждёт), но не даёт забить очередь
4. **Legacy requests** без created_at — обрабатывать нормально (backward compatible)
5. **Polling cost**: ~340 Redis GET за 30 сек на запрос. При 100 клиентах = 1133 ops/sec — Redis выдержит

## User Notes

- Обнаружено на production sip.miko.ru 2026-04-03 — очередь до 1058 requests, полный deadlock
- Причина инцидента: ModuleZabbixAgent5 + getStatsByProvider thundering herd
- Redis timeout 0→300 уже исправлен в коде (RedisConf.php)
- Связанные задачи: m-fix-zabbix-module-api-flooding.md, h-implement-module-crash-watchdog.md

## Work Log

### 2026-04-03

#### Completed
- Task created based on production incident analysis
- Added PbxSettings constants: API_QUEUE_MAX_LENGTH (default 50), API_REQUEST_TTL (default 35s)
- Implemented fast-fail (Mechanism A) in BaseController: queue length check before rpush, HTTP 503 if overloaded, created_at timestamp on every request
- Implemented stale request drop (Mechanism B) in WorkerApiCommands: isStaleRequest() checks request age, drops expired requests
- Reduced REDIS_RESPONSE_TTL from 3600 to 120 seconds, aligned metrics TTL
- Added 503 retry with exponential backoff (1s/2s/4s, 3 attempts) in PbxApiClient frontend via static callApi() wrapper
- All changes pass phpstan analysis

#### Decisions
- Async requests bypass TTL check (they don't have waiting clients)
- Debug requests (X-Debug-The-Request) bypass TTL check
- Legacy requests without created_at are processed normally (backward compatible)
- Stale requests are dropped silently without sendResponse (no one is listening)
- PbxSettings cached with 10s static TTL to avoid Redis round-trips on every request
