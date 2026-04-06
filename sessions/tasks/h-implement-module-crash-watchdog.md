---
name: h-implement-module-crash-watchdog
branch: feature/module-crash-watchdog
status: pending
created: 2026-04-03
---

# Module Crash Watchdog — автоотключение сбойных модулей

## Problem/Goal

Модули MikoPBX могут вызывать runtime-ошибки в своих воркерах (например, отсутствующий класс, uncaught exception). Текущий механизм авто-отключения (`PbxExtensionUtils::validateEnabledModules`) проверяет только загрузку конфиг-класса при старте системы и не ловит runtime-ошибки воркеров.

В результате модуль с crash-loop (как ModuleSoftphoneBackend с `Class "Cesargb\Log\Rotation" not found`) бесконечно перезапускается WorkerSafeScriptsCore каждые ~6 секунд, тратя CPU, забивая логи и потенциально влияя на стабильность API-очереди.

**Нужен механизм**, который:
- Отслеживает crash-count модульных воркеров
- При превышении порога — автоматически отключает модуль
- Логирует причину отключения для администратора

## Success Criteria
- [ ] WorkerBase при crash записывает информацию о падении (module ID, exception message, timestamp) в Redis
- [ ] Расширение WorkerSafeScriptsCore (или отдельный воркер) отслеживает crash-count модульных воркеров
- [ ] Порог отключения: 100 ошибок с момента последнего запуска модуля, или 100 ошибок за последние 30 минут если модуль запущен давно
- [ ] При превышении порога модуль автоматически отключается с причиной `DISABLED_BY_CRASH_LOOP`
- [ ] Системные воркеры (не модульные) НЕ затрагиваются этим механизмом
- [ ] Логика идентификации «чей это воркер» корректно определяет модуль по namespace воркера
- [ ] Администратор видит причину отключения в веб-интерфейсе

## Context Manifest

### Critical Files (must read before implementation)

| File | Why | Key Lines |
|------|-----|-----------|
| `src/Core/Workers/WorkerBase.php` | Hook crash recording into `startWorker()` catch block; `shutdownHandler()` for fatal errors | 296-304 (catch), 420-433 (shutdown) |
| `src/Core/Workers/Cron/WorkerSafeScriptsCore.php` | Add crash-count check before restart; module workers collected via `hookModulesMethod(GET_MODULE_WORKERS)` | 362-365 (worker list), 445-483 (beanstalk check), 467-470 (restart logic) |
| `src/Modules/PbxExtensionState.php` | Add `DISABLED_BY_CRASH_LOOP` constant; `disableModule()` is the canonical disable method | 261-320 (disable), constants at top |
| `src/Modules/PbxExtensionUtils.php` | `forceDisableModule()` — safe disable with try/catch/finally fallback; `disableBadModule()` extracts module ID from path | 233-255 (forceDisable), 347-447 (validateEnabledModules) |
| `src/Common/Models/PbxExtensionModules.php` | Model with `disabled`, `disableReason`, `disableReasonText` fields; `afterSave()` triggers provider recreation | Model fields |
| `src/AdminCabinet/Views/PbxExtensionModules/indexTabs/installedTab.volt` | UI shows disable reason icons — add `DisabledByCrashLoop` block | Checks `disableReason` for icon display |
| `src/PBXCoreREST/Lib/Modules/DisableModuleAction.php` | REST API disable action using `PbxExtensionState::disableModule()` with mutex | 46-92 |
| `src/Common/Providers/PBXConfModulesProvider.php` | Hook system — `hookModulesMethod(GET_MODULE_WORKERS)` returns module worker list | 94-120 |
| `src/Core/System/Processes.php` | `processPHPWorker()` — how worker processes are spawned | 443-658 |

### Module Worker Identification

Module workers follow namespace pattern: `Modules\{ModuleUniqueID}\bin\{WorkerName}`
- Parse: `explode('\\', $className)` — if `[0] === 'Modules'`, then `[1]` is the module ID
- Core workers start with `MikoPBX\` — must be excluded from crash watchdog

### Existing Disable Reasons

Constants in `PbxExtensionState`:
- `DISABLED_BY_EXCEPTION` — compile-time class loading failure
- `DISABLED_BY_USER` — manual disable
- `DISABLED_BY_LICENSE` — license check failure
- **New**: `DISABLED_BY_CRASH_LOOP` — runtime crash threshold exceeded

### Redis Design (proposed)

Use sorted sets for efficient time-window queries:
- Key: `module:crashes:{ModuleUniqueID}`
- Score: timestamp
- Value: `{workerClassName}:{exceptionMessage}`
- Query: `ZCOUNT key (now-1800) +inf` for 30-minute window
- Cleanup: `ZREMRANGEBYSCORE key -inf (now-1800)` to prevent unbounded growth

## User Notes
- Обнаружено на production (sip.miko.ru, 172.16.32.49) 2026-04-03
- ModuleSoftphoneBackend крашился с `Class "Cesargb\Log\Rotation" not found` каждые ~6 секунд
- Существующий механизм в `PbxExtensionUtils::validateEnabledModules` (строки 347-447) ловит только compile-time ошибки при загрузке конфиг-класса
- WorkerSafeScriptsCore (строки 467-470) просто перезапускает, не считая падения и не проверяя причину
- WorkerBase (строки 296-304) ловит exception, логирует, но не сигнализирует наверх
- Ключевые файлы: `PbxExtensionUtils.php`, `WorkerSafeScriptsCore.php`, `WorkerBase.php`, `PbxExtensionState.php`, `DisableModuleAction.php`

## Work Log
- [2026-04-03] Task created based on production incident analysis
