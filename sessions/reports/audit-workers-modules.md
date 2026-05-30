# Аудит подсистем воркеров и модулей MikoPBX (PHP 8.4 / Phalcon 5.9)

> **Статус реализации (ветка `worktree-audit-report`).** Большинство подтверждённых
> находок этого отчёта уже исправлено в коммитах ветки. Каждая строка таблиц ниже
> помечена: ✅ исправлено · ↩️ откачено (фикс оказался опасным) · ⏳ открыто.
> Коммиты:
> - `b8ef803e4` — крэш-луп watchdog: `forceDisableModule(): bool` + гейт обнуления Redis-счётчика
> - `a757f6eca` — пакет: advisory-lock enable/disable, rollback firewall, probe try/finally,
>   `persistState`+stale-reason, try/catch side-effects (смягчён), гейт post-install `del()`,
>   очистка temp + strict/close ZIP, sweep response-файлов, атомарный crash-counter
> - `e077ca187` — supervisor-merge: try/catch вокруг `GET_MODULE_WORKERS`
> - `a92b793c0` — PHP 8.4 safe-subset: first-class callables, `parseMemoryLimit` switch→match
>
> Каждое изменение прошло code-review (codex). Установочный мьютекс (#2) был реализован,
> но **откачен** — он создавал детерминированный deadlock против оркестратора, держащего
> тот же ключ через spawn+poll; нужен редизайн, а не наивный лок в дочернем процессе.

## 1. Краткое резюме

Подсистемы воркеров и модулей в целом зрелые: установка модулей, регенерация конфигов и супервизия покрыты явным кодом, с продуманными деталями — крэш-луп watchdog (порог 100 крэшей/30 мин), атомарный батч-лок на `SET NX EX`, Lua compare-and-delete для освобождения лока, нульсейф-оператор в `syncWafExemptions`, само-восстанавливающаяся WAF-сверка при загрузке. Основной класс находок — **неатомарность многошаговых переходов состояния модуля** (enable/disable/force-disable не сериализованы между собой и с watchdog'ом) и **отсутствие отката/очистки на путях ошибок** (временные каталоги установки, открытые транзакции, открытые ZIP-хендлы, утечка распределённого лока). Ни одна находка после проверки не дотянула до уровня «critical»: все верифицированные дефекты имеют ограниченный радиус поражения и/или само-восстановление (TTL, реконсиляция при ребуте, single-row last-writer-wins). Серьёзных дыр безопасности (RCE через zip-slip и т.п.) не подтверждено — базовая защита от path traversal на месте, хотя и не покрывает абсолютные пути/симлинки. Самый крупный архитектурный долг — god-класс `WorkerSafeScriptsCore` (1704 строки, шесть несвязанных обязанностей) и устаревшие строковые switch/константы, которые `PBXCoreREST` уже заменил на backed enum + match.

После реализации (см. шапку) **открытыми остаются**: редизайн установочного мьютекса (#2, откачен), остаточный zip-slip (абсолютные пути/симлинки), маскировка ошибки `installModule()` под `INSTALLATION_COMPLETE`, инвалидация `isEnabled()`-кэша, TOCTOU в uninstall, декомпозиция god-класса, reliable-queue в `WorkerApiCommands`, и enum/DTO-часть PHP 8.4-модернизации (отложена сознательно как более рискованная).

Все ссылки `path:line` приведены по реальному прочитанному коду на момент аудита; severity указан скорректированный после верификации. Номера строк относятся к до-фиксовому состоянию.

---

## 2. Критичные и высокие находки (подтверждённые)

После верификации **критичных (critical) находок нет**. Ниже — подтверждённые находки уровня **medium** (изначально заявлены как high, понижены по итогам проверки радиуса поражения). Сгруппированы и дедуплицированы. Колонка «Статус» отражает текущее состояние ветки.

| Статус | path:lines | Проблема | Решение |
|--------|-----------|----------|---------|
| ✅ `a757f6eca` | `PbxExtensionState.php:125-194, 271-336` | enable/disable выполняют длинную неатомарную цепочку (файлы+БД+процессы) без какого-либо flock/семафора; watchdog (`WorkerSafeScriptsCore` → `PbxExtensionUtils::forceDisableModule` → `disableModule`) из отдельного процесса может переплестись с operator-enable → флаг в БД и реальное состояние воркеров/звуков/WAF расходятся. | Advisory-lock per `moduleUniqueID` (`flock(LOCK_EX)` на `/var/run/mikopbx/module_state_<uniqid>.lock`) вокруг тела `enableModule()/disableModule()`, освобождение в `finally`; `forceDisableModule` проведён через тот же лок (реентрантный per-process реестр против само-deadlock). |
| ↩️ откачено | `WorkerModuleInstaller.php` (`installNewModuleFromFile` 97-263); cross-ref `ModuleInstallationBase.php:255-257` | Установщик запускается через `mwExecBg()` (fire-and-forget), и тяжёлая секция extract + `installModule()` идёт **после** освобождения `MODULE_MANIPULATION_MUTEX_KEY`. Внешний enable/disable того же uniqid может наблюдать полу-распакованный каталог/полу-созданную схему (TOCTOU). | **Откачено:** взятие того же ключа в дочернем воркере → детерминированный deadlock (оркестратор `InstallFromRepoAction`/`InstallFromPackageAction` держит ключ сквозь spawn+poll). Нужен редизайн: держать лок в оркестраторе вокруг extract вместо поллинга под ним. **Остаётся открытым.** |
| ✅ `b8ef803e4` | `WorkerSafeScriptsCore.php:977-991`; `PbxExtensionUtils.php:225-265` | На `crashCount >= CRASH_LOOP_THRESHOLD` супервизор зовёт `forceDisableModule` (best-effort, void, глотает throwable; `update()` в finally без проверки результата), затем **безусловно** `redis->del([$key, $key.':last_error'])`. При locked-DB записи модуль остаётся `disabled='0'`, а счётчик крэшей обнулён → петля заходит на новый круг с нуля. | `forceDisableModule` возвращает `bool` (true только при подтверждённом `disabled='1'`, через re-read строки — не доверяет `disableModule()`); `isModuleInCrashLoop` гейтит `del([...])` по bool; респаун подавлен в любом случае. |
| ✅ `a757f6eca` | `ModuleInstallationBase.php` (`postInstallModule` 274-313, `completeModuleInstallation` 399-437) | `postInstallModule()` зовёт `EnableModuleAction::enableModule()`, но **безусловно** делает `redis->del(REDIS_MODULE_INSTALLATION_KEY.$uniqid)` независимо от результата; `void`-возврат скрывает провал. Модуль, который был включён до переустановки, при soft-fail re-enable остаётся навсегда выключенным. | `postInstallModule` возвращает bool; Redis-ключ удаляется только при успехе enable (или `moduleWasEnabled===false`); `completeModuleInstallation` пробрасывает bool — провал оставляет ключ и запись очереди для следующего прохода. |
| ✅ `a757f6eca` | `WorkerModuleInstaller.php` (`installNewModuleFromFile` 97-263) | Ни один путь ошибки не чистит распакованный каталог, `modulefile.zip`, temp-dir (контраст `WorkerMergeUploadedFile`). Падение `installModule()` оставляет полу-распакованный `$currentModuleDir`. | Отложенный `Processes::mwExecBg('rm -rf '.escapeshellarg($temp_dir),'/dev/null',600)` + синхронное удаление `$currentModuleDir` на провале, по всем error-веткам. |
| ✅ `a757f6eca` | `WorkerApiCommands.php` (`handleLargeResponseWithFile` 643-671, `registerTempFile` 679-685) | Большой ответ пишется в `downloadCacheDir` (без try/finally), удаляется только если клиент его заберёт → файл-сирота на таймауте. Список `temp_files` — write-only артефакт (`expire` на сам список), sweeper'ом быть не может. | Мёртвый `temp_files`-трекинг удалён; `@unlink` на провале handoff; добавлен age-based sweep `response_*.data` старше `REDIS_RESPONSE_TTL`. |
| ✅ `a757f6eca` | `PbxExtensionState.php:452-503` (`disableFirewallSettings`) | На ветке провала `delete()` (475-479) — `return false` **без** `$this->db->rollback(true)`. Асимметрия → возможный `cannot start a transaction within a transaction`. | Добавлен `$this->db->rollback(true)` перед `return false`, зеркаля save-fail ветку. |
| ✅ смягчено `a757f6eca` | `PbxExtensionState.php:164-191 (enable), 292-333 (disable)` | Запись флага `disabled` предшествует side-effect'ам (`installModuleSounds`, `ON_AFTER` hook, `killByName`, `cleanupVoltCache`) без компенсации. Throw оставляет модуль помеченным при полу-применённых эффектах. | Side-effects обёрнуты в try/catch → ошибка превращается в `return false`+message вместо фатала. Флаг **НЕ откатывается** (по рекомендации codex: firewall/sounds/WAF уже закоммичены — откат флага создал бы рассинхрон, а не устранил его). |
| ✅ `a757f6eca` | `PbxExtensionState.php` (`makeBeforeEnableTest` ~364-405, `makeBeforeDisableTest` ~443-463) | `begin(true)` → сторонние хуки и `beforeDelete()` моделей → **голый** `rollback(true)` в конце, не в `finally`. Throw → открытая вложенная транзакция. | `begin(true)..rollback(true)` обёрнут в `try { ... } finally { $this->db->rollback(true); }`. |
| ✅ `a757f6eca` | `PbxExtensionState.php:138-141,164-168,294-298,528-532`; `PbxExtensionUtils.php:249-256,423-428` | Колонки `disabled/disableReason/disableReasonText` пишутся вручную из 6 мест. Success-ветка `enableModule` пишет только `disabled='0'`, не очищая reason → stale-причина. | Добавлен хелпер `persistState(string $disabled, string $reason='', string $reasonText='')`; committed-записи проведены через него; enable-success передаёт `reason=''`. |
| ✅ уже было | `UpdateAllModulesAction.php:56-90`, `acquireBatchLock` 346, `releaseBatchLock` 372 | После `acquireBatchLock()` (SET NX EX, TTL=3600) тело `main()` без try/finally → throw держит `ACTIVE_BATCH_KEY` час. | На момент реализации тело уже было обёрнуто в try/catch с `releaseBatchLock()` (compare-and-delete Lua) на error-ветке. Изменений не потребовалось. |

> Изначально-high находки про god-class `WorkerSafeScriptsCore` и три параллельных системы сигналов подтверждены фактически, но понижены до **medium**/**low** — долг сопровождаемости/мёртвый код, без рантайм-бага. См. разделы 5 и 6.

---

## 3. Установка новых модулей

Пайплайн: REST action (`InstallFromPackageAction`/`InstallFromRepoAction`) под `MODULE_MANIPULATION_MUTEX_KEY` → `ModuleInstallationBase::startModuleInstallation` → `mwExecBg` запускает detached `WorkerModuleInstaller` → распаковка ZIP + `setup->installModule()` → пост-установочный enable через `processModulePostInstallations` (под мьютексом).

**Состояние проблем:**

1. ↩️ **Лок отпускается до тяжёлой работы установщика** (`ModuleInstallationBase.php:255-257`, `WorkerModuleInstaller.php:97-263`). Фикс (мьютекс в дочернем воркере) **откачен** — deadlock против оркестратора. **Остаётся открытым**, нужен редизайн (лок в оркестраторе вокруг extract, без поллинга под ним).
2. ✅ **Нет отката/очистки на путях ошибки** (`a757f6eca`) — отложенный `rm -rf temp_dir` + удаление `$currentModuleDir` на провале.
3. ✅ **Провальный enable в пост-установке стирает Redis-state безусловно** (`a757f6eca`) — `del()` гейтится по успеху enable.
4. ⏳ **`installModule()` failure может маскироваться под `INSTALLATION_COMPLETE`** (`WorkerModuleInstaller.php:207-261`, reader `StatusOfModuleInstallationAction.php:62-84`). Все failure-ветки пишут `progress='100'`; reader решает COMPLETE/ERROR по непустоте error-файла — гонка. Если `getMessages()` пуст, провал репортится как COMPLETE. **Открыто. Фикс:** писать error-файл до progress; на провале sentinel ≠ `'100'`; гарантировать непустое сообщение при `installModule()===false`.
5. ✅ **Утечка ZIP-хендла на exception-пути** (`a757f6eca`) — `$zip->close()` перенесён в `finally{}` под флаг открытия.

**Безопасность распаковки ZIP — вердикт:**
- Заявленная **«zip-slip с произвольной записью через per-entry extractTo loop»** — **ОТКЛОНЕНА**: процитированный код не соответствует описанию. Базовая защита от `..` и confinement через `realpath()` присутствует.
- ⏳ Остаточный риск (**low/medium, открыто**): guard ловит только литерал `..`, но **не** отклоняет абсолютные пути (`/etc/...`), backslash-пути и symlink-entries; `realpath()===false` трактуется как «ОК». **Рекомендация:** отклонять `str_starts_with($name,'/')`, `str_contains($name,'\\')`, трактовать `realpath()===false` как провал, отклонять `is_link()`-entries.
- `GetMetadataFromModulePackageAction.php:41-111` — **образец**: ZIP безусловно закрывается до всех early-return. Использован как модель для фикса установщика.

✅ **Строгая проверка `$zip->open()`** (`a757f6eca`): `=== true` + guard `$totalFiles === 0` → битый/пустой ZIP уходит в error-ветку.

---

## 4. Включение модулей в рабочую среду

**Состояние проблем (полные решения — в таблице раздела 2):**

1. ✅ **Взаимное исключение** operator enable/disable ↔ watchdog force-disable (`a757f6eca`).
2. ✅ смягчено **флаг↔side-effects** — try/catch вместо фатала, флаг не откатывается (`a757f6eca`).
3. ✅ **Probe-методы exception-safe** — try/finally (`a757f6eca`).
4. ✅ **`disableFirewallSettings` rollback** на delete-fail (`a757f6eca`).
5. ✅ **`persistState` + stale-reason** (`a757f6eca`).
6. ✅ частично **Watchdog/force-путь через тот же мьютекс** (`a757f6eca`) — `forceDisableModule` проведён через `withModuleStateLock`. ⏳ Полный side-effect teardown (sounds/workers/WAF) на force-direct-update путях (`validateEnabledModules`/`disableOldModules`) — остаётся открытым.

**To confirm (открыто):**
- ⏳ `isEnabled()` Redis-кэш (3600s) без наблюдаемой инвалидации на enable/disable (`PbxExtensionUtils.php:51-71`) — только что выключенный модуль может час читаться как enabled. **Фикс:** удалять ключ в конце enable/disable + force-путях (проверить взаимодействие с `ModulesStateCache`).
- ⏳ Uninstall убивает PID'ы по `lsof`+SIGKILL без верификации завершения и с TOCTOU перед `rm -rf` (`UninstallModuleAction.php`). **Фикс:** disabled → kill → bounded re-probe `lsof` → `rm -rf`.

**Что хорошо:** firewall enable/disable уже транзакционны; `syncWafExemptions` обёрнут в try/catch и реконсилируется при ребуте (`WafRegistry::rebuildAll`); пост-установочный drain корректно под мьютексом; очередь ретраит на not-yet-installed и catch-ветках.

---

## 5. Воркеры и супервизор

**Состояние:**

1. ⏳ **`WorkerSafeScriptsCore` — god-класс, 1704 строки** (`WorkerSafeScriptsCore.php:68-1676`). Шесть несвязанных обязанностей: discovery, 4 transport-пробы, Fiber-планировщик, memory/disk watchdog, restart-throttle + crash-loop + pool. Respawn-guard дублируется в 5 местах. **Открыто. Фикс:** извлечь `MemoryWatchdog`/`DiskWatchdog`/`RestartPolicy` (композиция, без framework-слоёв). **Effort: large.**
2. ⏳ **Три независимых пути установки сигналов** (`WorkerRedisBase.php:121-168`). `WorkerRedisBase::handleSignals` нигде не вызывается; живые хендлеры ставит `WorkerBase`, третий набор — `WorkerModelsEvents`. **Severity: low**, мёртвый код. **Открыто** (модернизатор не стал удалять — вне safe-subset). **Фикс:** удалить `handleSignals`.

**Состояние robustness:**
- ✅ `prepareWorkersList` try/catch вокруг `GET_MODULE_WORKERS` merge (`e077ca187`) — один битый module-hook больше не валит супервизию всех воркеров.
- ✅ Атомарный INCR+EXPIRE в записи крэшей (`a757f6eca`) — оба сайта (`recordModuleCrash`, `recordCoreWorkerCrash`) через единый Lua-eval; нет TTL-less счётчиков.
- ⏳ API job lost (at-most-once) если воркер убит между destructive `blpop` и durable-записью (`WorkerApiCommands.php:162-232`). **Открыто. Фикс:** reliable-queue через `LMOVE`/`BRPOPLPUSH` + `LREM` + восстановление на старте. **Effort: large.**
- ⏳ `executeParallel` busy-spin без yield (`WorkerSafeScriptsCore.php:428-452`). **Фикс:** документировать контракт или `usleep(1-5ms)`.
- ⏳ `checkWorkerPool` — 188-строчный метод со встроенным `shell_exec` в обход `Processes::processPHPWorker()`. **Фикс:** разбить, spawn через общий примитив.
- ⏳ Redis-handle под двумя разными DI-ключами (`'redis'` vs `RedisClientProvider::SERVICE_NAME`). **Фикс:** единый `getRedis()`.

**Что хорошо:** crash-loop watchdog с порогом и `DISABLED_BY_CRASH_LOOP`; `getAmiForPing` кэширует AMI; reflection-based `getWorkerInstanceCount`; Fiber-планировщик для параллельных проб.

---

## 6. Модернизация под PHP 8.4

`PBXCoreREST` уже стандартизирован на backed enum + `match`. Подсистемы воркеров/модулей — отстающие.

**Реализовано (safe-subset, `a92b793c0`, codex APPROVE):**
- ✅ `WorkerRedisBase::parseMemoryLimit` — `switch($unit)` → `match` с `default => 1` (§6.2).
- ✅ first-class callables: `WorkerBase` (`register_shutdown_function`/`pcntl_signal` хендлеры), `WorkerModelsEvents` (3× `pcntl_signal`) (§6.4).
- ⚠️ **НЕ конвертированы намеренно** (поломали бы поведение): Beanstalk callback-и в `WorkerModelsEvents` — `BeanstalkClient` тайп-хинтит `array $callback` и диспетчеризует через `is_array()`, Closure бы их сломал; `call_user_func` с именами методов из констант (`ON_*`/`GET_*`) — first-class callable требует литерального имени.

**Отложено (более рискованная enum/DTO-часть — требует отдельного захода):**

### 6.1 Backed enum (PHP 8.1) ⏳
- `ModuleDisableReason: string` для `DISABLED_BY_*` (`PbxExtensionState.php:52-55`).
- `ModuleDisabledState: string { Enabled='0'; Disabled='1'; }` (`PbxExtensionModules.php`).
- `WorkerState/MemoryState/DiskState/WorkerCheckType`, `BatchStatus`, `InstallationStatus`, `ModulesAction`.
- **Риск:** меняет обработку значений, пишущихся в SQLite/Redis. Хранить по-прежнему `->value`; `const` оставить алиасами на версию. Требует тщательного ревью.

### 6.3 readonly DTO + constructor promotion ⏳
Ассоциативные «мешки» (install-settings/Redis-state `ModuleInstallationBase.php:205-224`; `WorkerModelsEvents` state-bag; installFromRepo-envelope) → readonly DTO с `fromArray()/toArray()` (JSON байт-в-байт).

### 6.5 Nullsafe ⏳
Точечно к `Di::getDefault()->get(...)` цепочкам, где это строго эквивалентно (safe-subset проход не нашёл бесспорных кандидатов в целевых файлах — большинство null-проверок суть control-flow guard'ы, не цепочки).

### 6.6 Typed state machine ⏳
`UpdateAllModulesAction` FSM на `BatchStatus` enum с гейтингом переходов.

---

## 7. Быстрые победы — статус

| Статус | path:lines | Что |
|--------|------------|-----|
| ✅ `a757f6eca` | `PbxExtensionState.php` (disableFirewallSettings) | `rollback(true)` перед `return false` |
| ✅ `b8ef803e4` | `WorkerSafeScriptsCore` + `PbxExtensionUtils` | `forceDisableModule(): bool`, гейт `redis->del()` |
| ✅ `a757f6eca` | `ModuleInstallationBase` (postInstall) | Гейт `redis->del(...)` по успеху enable |
| ✅ `a757f6eca` | `WorkerModuleInstaller` (zip open) | `$zip->open(...) === true` + guard `$totalFiles===0` |
| ✅ `a757f6eca` | `WorkerModuleInstaller` (zip close) | `$zip->close()` в `finally{}` |
| ✅ `a757f6eca` | `PbxExtensionState` (enable-success) | Очистка `disableReason` через `persistState` |
| ✅ `a757f6eca` | `WorkerBase` (recordCrash×2) | INCR+EXPIRE одним Lua |
| ✅ `e077ca187` | `WorkerSafeScriptsCore` (prepareWorkersList) | try/catch вокруг `GET_MODULE_WORKERS` merge |
| ✅ уже было | `UpdateAllModulesAction` | try/catch + `releaseBatchLock()` на throw |
| ✅ `a92b793c0` | `WorkerRedisBase::parseMemoryLimit` | `switch`→`match` |
| ⏳ открыто | `WorkerRedisBase.php:121-168` | Удалить мёртвый `handleSignals` (low) |
| ⏳ открыто | `WorkerModuleInstaller` (install-status) | error-файл до progress; sentinel ≠ '100' на провале |

---

## 8. Что проверили и отклонили (прозрачность)

- **«Eight-condition respawn guard скопирован 5 раз в 3 формах»** — **отклонено**: дублирование реально (medium-долг, §5), но заявленные «5 копий в 3 формах» и номера строк не совпали с фактом.
- **«REDIS_MODULE_INSTALLATION_KEY дублируется в `DataStructure` и `ModuleInstallationBase`»** — **отклонено**: константа в одном месте; `DataStructure` её не содержит.
- **«Zip-slip arbitrary-file-write через per-entry extractTo loop»** — **отклонено как процитировано**. Остаточные мелкие риски (абсолютные пути/симлинки) — в §3 как low «открыто».
- **«disableFirewallSettings утечка транзакции отравляет следующий ORM save»** — **отклонено в части харм-модели**: единственный вызыватель уже делает внешний `begin` и на firewall-fail немедленно `rollback(true)`. Defensive-фикс (rollback) всё равно сделан (§2).
- **«getEnabledModulesArray Redis-кэш НИКОГДА не чистится»** — **отклонено**: чистится базовым ORM-event хуком `ModelsBase::initialize()` → `self::clearCache(...)`, glob `PbxExtensionModules*` покрывает оба ключа.

---

## 9. Дорожная карта (оставшееся)

**✅ Фаза 1 — Быстрые победы корректности.** Выполнено в `b8ef803e4`/`a757f6eca`/`e077ca187` (см. §7). Открыт лишь мёртвый `handleSignals` (low) и детерминированный install-status.

**✅/⏳ Фаза 2 — Атомарность и очистка ресурсов.** Бо́льшая часть выполнена (`a757f6eca`). **Открыто:** редизайн установочного мьютекса (#2, откачен); инвалидация `isEnabled()`-кэша; bounded re-probe в uninstall; полный side-effect teardown на force-direct-update путях.

**⏳ Фаза 3 — PHP 8.4-модернизация.** Safe-subset выполнен (`a92b793c0`). **Открыто:** backed enum'ы (§6.1, начать с `ModuleDisabledState`/`ModuleDisableReason`), readonly DTO (§6.3), точечный nullsafe, typed FSM (§6.6) — отдельным заходом с тщательным ревью (меняет формат не должно, но меняет обработку хранимых значений).

**⏳ Фаза 4 — Архитектурная гигиена.** Декомпозиция `WorkerSafeScriptsCore`; reliable-queue в `WorkerApiCommands`; единый `getRedis()`; разбивка `checkWorkerPool`; устранение дублирования respawn-guard. **Effort: large.**

---

*Сгенерировано: аудит через dynamic workflow (4 кластера × 4 линзы → adversarial-верификация → синтез). Статус-колонки обновлены под реализацию в ветке `worktree-audit-report` (4 коммита, каждый code-reviewed). Все находки заземлены на реальный код; severity скорректирован после верификации; номера строк — до-фиксовые.*
