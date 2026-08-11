# CDR Atomic Claim and Queue Transfer Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Надёжно и без AMI-запроса завершать CDR по `LINKEDID_END`, исключить повторную обработку и дубли conversion-задач, а также не повреждать ещё звонящий канал при queue transfer.

**Architecture:** `WorkerCallEvents` остаётся единственным writer временной CDR-таблицы и атомарно выдаёт строки `WorkerCdr` по lease-token. `WorkerCdr` обрабатывает только захваченные строки и завершает их compare-and-set обновлением по `UNIQUEID + processing_token`; терминальный сигнал подтверждается лишь после успешной финализации и публикации. Задачи конвертации имеют детерминированное имя и публикуются атомарным rename.

**Tech Stack:** PHP 8.3, Phalcon ORM/DB adapter, SQLite, Beanstalk request/reply, PHPUnit 11, Asterisk CEL/CDR.

## Global Constraints

- Работы выполняются непосредственно в ветке `develop`; пользовательские незакоммиченные файлы не изменяются.
- `WorkerCallEvents` — единственный процесс, изменяющий временную таблицу `cdr`.
- Терминальный путь `LINKEDID_END` не вызывает AMI `GetChannels()`; обычный polling сохраняет AMI-проверку.
- Lease равен `120` секундам, максимальный пакет claim — `200` строк.
- `work_completed` сохраняет только значения `0/1`; промежуточное состояние хранится в `processing_token` и `processing_started_at`.
- Завершение строки допускается только по точному совпадению `UNIQUEID + processing_token`.
- Conversion-задача называется `<sha256(UNIQUEID)>.json` и появляется атомарным rename.
- Новые и исправленные сценарии сначала покрываются падающими тестами.

---

## Карта файлов

- `src/Common/Models/CallDetailRecordsTmp.php` — служебные claim-поля только временной CDR-модели.
- `src/Core/Workers/Libs/WorkerCallEvents/ClaimCdrRows.php` — транзакционный выбор и захват CDR.
- `src/Core/Workers/Libs/WorkerCallEvents/CdrResponseFile.php` — безопасная передача больших CDR-пакетов через временный файл.
- `src/Core/Workers/Libs/WorkerCallEvents/ReleaseCdrClaim.php` — досрочное освобождение неуспешного claim.
- `src/Core/Workers/Libs/WorkerCallEvents/UpdateDataInDB.php` — CAS-завершение по token.
- `src/Core/Workers/Libs/WorkerCallEvents/LinkedIdFinalizationQueue.php` — недеструктивная выдача, acknowledge и retry.
- `src/Core/Workers/Libs/WorkerCallEvents/ActionCelLinkedIdEnd.php` — результат финализации с учётом ошибок сохранения.
- `src/Core/Workers/Libs/WorkerCallEvents/ActionTransferDialHangup.php` — защита ещё звонящего sibling-канала.
- `src/Core/Workers/Libs/WorkerCdr/ConversionTaskWriter.php` — идемпотентная атомарная публикация JSON-задачи.
- `src/Core/Workers/WorkerCallEvents.php` — маршрутизация claim/release и подтверждение терминальных сигналов.
- `src/Core/Workers/WorkerCdr.php` — claim-клиент, отказ от локального completion guard.
- `src/Common/Providers/CDRDatabaseProvider.php` — request/reply API claim/release и чтение response-файла.
- `tests/Unit/Core/Workers/**` — unit и SQLite-backed regression-тесты.
- `tests/Calls/Scripts/**` — реальный ringall queue transfer сценарий issue #1100.

### Task 1: Не изменять звонящий sibling при transfer hangup

**Files:**
- Modify: `src/Core/Workers/Libs/WorkerCallEvents/ActionTransferDialHangup.php`
- Test: `tests/Unit/Core/Workers/Libs/WorkerCallEvents/ActionTransferDialHangupTest.php`

**Interfaces:**
- Consumes: `ActionTransferDialHangup::execute(array $data): void`.
- Produces: ранний выход при отсутствии точного совпадения и resume только единственной отвеченной строки.

- [ ] **Step 1: Написать падающие тесты** — создать две временные CDR: завершённый transfer leg и открытый ringing sibling с `answer=''`; вызвать `execute()` с неизвестным `transfer_UNIQUEID`; проверить, что у sibling не изменились `recordingfile`, `transfer` и `endtime`. Второй тест создаёт одну отвеченную открытую строку и проверяет допустимый resume.
- [ ] **Step 2: Запустить тест**

```bash
php /tmp/phpunit-11.phar tests/Unit/Core/Workers/Libs/WorkerCallEvents/ActionTransferDialHangupTest.php
```

Ожидается FAIL: текущий fallback выбирает любую открытую строку.

- [ ] **Step 3: Реализовать минимальную защиту** — после correlated update выполнить `return`, если число совпавших строк равно нулю; fallback-запрос ограничить `answer <> ''`, потребовать ровно одну строку и только тогда переносить recording state.
- [ ] **Step 4: Повторить тест и получить PASS.**
- [ ] **Step 5: Закоммитить**

```bash
git add src/Core/Workers/Libs/WorkerCallEvents/ActionTransferDialHangup.php tests/Unit/Core/Workers/Libs/WorkerCallEvents/ActionTransferDialHangupTest.php
git commit -m "fix: preserve ringing queue transfer siblings"
```

### Task 2: Потеребезопасная очередь LINKEDID_END

**Files:**
- Modify: `src/Core/Workers/Libs/WorkerCallEvents/LinkedIdFinalizationQueue.php`
- Modify: `src/Core/Workers/Libs/WorkerCallEvents/ActionCelLinkedIdEnd.php`
- Modify: `src/Core/Workers/WorkerCallEvents.php`
- Test: `tests/Unit/Core/Workers/Libs/WorkerCallEvents/LinkedIdFinalizationQueueTest.php`
- Test: `tests/Unit/Core/Workers/WorkerCallEventsLinkedIdEndTest.php`

**Interfaces:**
- Produces: `due(float $now): array`, `acknowledge(string $linkedId, string $eventTime): void`, `retry(string $linkedId, string $eventTime, float $now): void`.
- Produces: `ActionCelLinkedIdEnd::execute(string $linkedId, string $eventTime): bool`, где `true` означает, что все выбранные строки сохранены.

- [ ] **Step 1: Добавить падающие тесты** — проверить, что `due()` не удаляет запись; `acknowledge()` удаляет только совпадающую версию `eventTime`; `retry()` переносит deadline; более поздний CEL заменяет `eventTime`, а поздний ack старой версии не удаляет новый сигнал; исключение publish и `save() === false` оставляют сигнал на retry.
- [ ] **Step 2: Запустить оба тестовых файла и подтвердить FAIL.**
- [ ] **Step 3: Заменить destructive `takeDue()` на peek/ack/retry** и сохранять хронологически максимальный `EventTime`; повторное событие всегда перезапускает debounce.
- [ ] **Step 4: Возвращать из `ActionCelLinkedIdEnd` итог успеха**, считать `save() === false` ошибкой и логировать `getMessages()`; в worker подтверждать элемент только после успешной DB-финализации и успешной публикации в `FINALIZE_CDR_TUBE`, иначе назначать retry через 5 секунд.
- [ ] **Step 5: Запустить тесты и получить PASS.**
- [ ] **Step 6: Закоммитить**

```bash
git add src/Core/Workers/Libs/WorkerCallEvents/LinkedIdFinalizationQueue.php src/Core/Workers/Libs/WorkerCallEvents/ActionCelLinkedIdEnd.php src/Core/Workers/WorkerCallEvents.php tests/Unit/Core/Workers/Libs/WorkerCallEvents/LinkedIdFinalizationQueueTest.php tests/Unit/Core/Workers/WorkerCallEventsLinkedIdEndTest.php
git commit -m "fix: retry linked id finalization until published"
```

### Task 3: Схема claim и транзакционный сервис захвата

**Files:**
- Modify: `src/Common/Models/CallDetailRecordsTmp.php`
- Create: `src/Core/Workers/Libs/WorkerCallEvents/CdrResponseFile.php`
- Create: `src/Core/Workers/Libs/WorkerCallEvents/ClaimCdrRows.php`
- Create: `src/Core/Workers/Libs/WorkerCallEvents/ReleaseCdrClaim.php`
- Test: `tests/Unit/Core/Workers/Libs/WorkerCallEvents/ClaimCdrRowsTest.php`

**Interfaces:**
- Produces: `ClaimCdrRows::execute(array $request): string` — JSON с путём response-файла.
- Produces: `ReleaseCdrClaim::execute(string $token): int` — число освобождённых строк.
- Produces: `CdrResponseFile::write(array $rows): string`.

- [ ] **Step 1: Написать SQLite-backed падающие тесты** — проверить наличие колонок с defaults, linkedid/uniqueids режимы, `endtime <> ''`, batch limit 200, недоступность свежей аренды, перехват после 120 секунд, чтение только строк нового token и release только совпавшего token.
- [ ] **Step 2: Запустить `ClaimCdrRowsTest.php`; ожидается FAIL из-за отсутствующих полей и классов.**
- [ ] **Step 3: Добавить свойства модели**

```php
public string $processing_token = '';
public int $processing_started_at = 0;
```

с аннотациями `Column(type="string", length=64, nullable=false, default="")` и `Column(type="integer", nullable=false, default="0")`.

- [ ] **Step 4: Реализовать короткий claim** — валидировать mode/token/limit, ограничить limit значением 200, открыть транзакцию с немедленной write-lock семантикой SQLite, выбрать точные ID, условно обновить token/timestamp, перечитать строки по token, commit; на исключении rollback и повторно бросить исключение.
- [ ] **Step 5: Записать результат во временный файл** с правами `0600`; имя генерировать случайно, JSON кодировать с `JSON_THROW_ON_ERROR`.
- [ ] **Step 6: Реализовать release** как условный сброс `processing_token=''`, `processing_started_at=0` у незавершённых строк данного token.
- [ ] **Step 7: Запустить тест и получить PASS.**
- [ ] **Step 8: Закоммитить**

```bash
git add src/Common/Models/CallDetailRecordsTmp.php src/Core/Workers/Libs/WorkerCallEvents/CdrResponseFile.php src/Core/Workers/Libs/WorkerCallEvents/ClaimCdrRows.php src/Core/Workers/Libs/WorkerCallEvents/ReleaseCdrClaim.php tests/Unit/Core/Workers/Libs/WorkerCallEvents/ClaimCdrRowsTest.php
git commit -m "feat: atomically claim completed cdr rows"
```

### Task 4: Request/reply маршрутизация claim

**Files:**
- Modify: `src/Core/Workers/WorkerCdr.php`
- Modify: `src/Core/Workers/WorkerCallEvents.php`
- Modify: `src/Common/Providers/CDRDatabaseProvider.php`
- Test: `tests/Unit/Core/Workers/WorkerCallEventsClaimRoutingTest.php`
- Test: `tests/Unit/Common/Providers/CDRDatabaseProviderClaimTest.php`

**Interfaces:**
- Produces: `WorkerCdr::CLAIM_CDR_TUBE`, `WorkerCdr::RELEASE_CDR_CLAIM_TUBE`.
- Produces: `CDRDatabaseProvider::claimCdr(array $request): array` и `releaseCdrClaim(string $token): bool`.

- [ ] **Step 1: Написать падающие routing/provider тесты** — отправить реальные job payloads в обработчик worker, проверить вызов claim/release; проверить request timeout, ping, чтение JSON response-файла и обязательное удаление файла в `finally`.
- [ ] **Step 2: Запустить тесты и подтвердить FAIL.**
- [ ] **Step 3: Добавить tube-константы и подписки**, маршрутизировать payload в новые action-классы и возвращать request/reply ответ существующим способом.
- [ ] **Step 4: Реализовать provider API**, генерировать token через `bin2hex(random_bytes(16))`, проверять тип ответа и всегда удалять response-файл после чтения.
- [ ] **Step 5: Запустить тесты и получить PASS.**
- [ ] **Step 6: Закоммитить**

```bash
git add src/Core/Workers/WorkerCdr.php src/Core/Workers/WorkerCallEvents.php src/Common/Providers/CDRDatabaseProvider.php tests/Unit/Core/Workers/WorkerCallEventsClaimRoutingTest.php tests/Unit/Common/Providers/CDRDatabaseProviderClaimTest.php
git commit -m "feat: expose cdr claim request reply api"
```

### Task 5: WorkerCdr обрабатывает только захваченные строки

**Files:**
- Modify: `src/Core/Workers/WorkerCdr.php`
- Test: `tests/Unit/Core/Workers/WorkerCdrTerminalFinalizationTest.php`
- Create: `tests/Unit/Core/Workers/WorkerCdrClaimProcessingTest.php`

**Interfaces:**
- Consumes: `CDRDatabaseProvider::claimCdr()` и `releaseCdrClaim()`.
- Produces: terminal claim по точному linkedid и polling claim по списку точных UNIQUEID.

- [ ] **Step 1: Расширить падающие тесты** — terminal event не вызывает `GetChannels()`, запрашивает mode `linkedid`; polling сначала исключает активные AMI linkedid и запрашивает mode `uniqueids`; пустой claim ничего не публикует; каждое update содержит token; исключение обработки вызывает release.
- [ ] **Step 2: Запустить тесты и подтвердить FAIL.**
- [ ] **Step 3: Удалить `completionGuard` и TTL**, заменить локальный filter на claim API. Терминальный путь передаёт linkedid; polling сохраняет существующий AMI вызов, формирует список завершённых exact UNIQUEID и затем делает claim.
- [ ] **Step 4: Обернуть обработку пакета в `try/finally`**: успешно опубликованные CAS updates не освобождать; при исключении освобождать оставшийся token, чтобы не ждать lease.
- [ ] **Step 5: Запустить тесты и получить PASS.**
- [ ] **Step 6: Закоммитить**

```bash
git add src/Core/Workers/WorkerCdr.php tests/Unit/Core/Workers/WorkerCdrTerminalFinalizationTest.php tests/Unit/Core/Workers/WorkerCdrClaimProcessingTest.php
git commit -m "refactor: process cdr rows through durable claims"
```

### Task 6: CAS-завершение CDR

**Files:**
- Modify: `src/Core/Workers/Libs/WorkerCallEvents/UpdateDataInDB.php`
- Create: `tests/Unit/Core/Workers/Libs/WorkerCallEvents/UpdateDataInDBCdrClaimTest.php`

**Interfaces:**
- Consumes: update payload с `UNIQUEID`, `processing_token`, `work_completed`.
- Produces: завершение только текущим владельцем claim; stale update — безопасный no-op.

- [ ] **Step 1: Написать падающие SQLite-backed тесты** — правильный token переносит строку в `cdr_general` и удаляет tmp; старый token после re-claim ничего не меняет; duplicate update безопасен; legacy update без token может изменить только незахваченную строку (`processing_token=''`).
- [ ] **Step 2: Запустить тест и подтвердить FAIL.**
- [ ] **Step 3: Добавить условный ORM-поиск**: при наличии token искать по `UNIQUEID + processing_token + work_completed<>1`; без token дополнительно требовать пустой `processing_token`. Не копировать служебные поля в general-модель.
- [ ] **Step 4: Запустить тест и получить PASS.**
- [ ] **Step 5: Закоммитить**

```bash
git add src/Core/Workers/Libs/WorkerCallEvents/UpdateDataInDB.php tests/Unit/Core/Workers/Libs/WorkerCallEvents/UpdateDataInDBCdrClaimTest.php
git commit -m "fix: finalize cdr with claim compare and set"
```

### Task 7: Идемпотентные conversion-задачи

**Files:**
- Create: `src/Core/Workers/Libs/WorkerCdr/ConversionTaskWriter.php`
- Modify: `src/Core/Workers/WorkerCdr.php`
- Test: `tests/Unit/Core/Workers/Libs/WorkerCdr/ConversionTaskWriterTest.php`

**Interfaces:**
- Produces: `ConversionTaskWriter::write(string $tasksDir, string $uniqueId, array $payload): string`.

- [ ] **Step 1: Написать падающие тесты** — имя равно `hash('sha256', $uniqueId).'.json'`; два вызова для одного UNIQUEID оставляют один валидный JSON; до rename отсутствует файл с расширением `.json`; ошибка записи бросает исключение и не оставляет финальный файл.
- [ ] **Step 2: Запустить тест и подтвердить FAIL.**
- [ ] **Step 3: Реализовать writer** — создать temp-файл в том же каталоге с суффиксом `.tmp.<token>`, записать JSON с `LOCK_EX`, проверить длину, выполнить atomic `rename`; если финальный файл уже содержит эквивалентную задачу, считать операцию успешной.
- [ ] **Step 4: Подключить writer в `checkBillsecMakeRecFile()`** вместо `uniqid()` имени.
- [ ] **Step 5: Запустить тест и получить PASS.**
- [ ] **Step 6: Закоммитить**

```bash
git add src/Core/Workers/Libs/WorkerCdr/ConversionTaskWriter.php src/Core/Workers/WorkerCdr.php tests/Unit/Core/Workers/Libs/WorkerCdr/ConversionTaskWriterTest.php
git commit -m "fix: publish conversion tasks idempotently"
```

### Task 8: Сквозная регрессия issue #1100 и финальная проверка

**Files:**
- Modify: `tests/Calls/Scripts/TestCallsBase.php`
- Create: `tests/Calls/Scripts/test_1100_queue_ringall_inline_transfer.php`
- Modify: `docs/superpowers/specs/2026-08-07-cdr-atomic-claim-design.md`

**Interfaces:**
- Produces: воспроизводимый Calls-тест: очередь ringall минимум с двумя агентами, ответ одного агента, inline transfer, завершение всех каналов, проверка завершённых CDR и одной conversion-задачи.

- [ ] **Step 1: Добавить Calls-сценарий** — зарегистрировать четыре peer, создать ringall queue с двумя членами, позвонить в очередь, принять вызов первым peer, выполнить inline transfer на четвёртый peer, завершить звонок и дождаться CDR.
- [ ] **Step 2: Добавить утверждения** — ни одна строка данного linkedid не остаётся в tmp после завершения; ringing sibling не получил `answer/recordingfile`; general CDR содержит корректные transfer legs; conversion task для каждого UNIQUEID существует в единственном экземпляре.
- [ ] **Step 3: Запустить все доступные unit-тесты**

```bash
php /tmp/phpunit-11.phar tests/Unit/Core/Workers/Libs/WorkerCallEvents tests/Unit/Core/Workers/WorkerCallEventsLinkedIdEndTest.php tests/Unit/Core/Workers/WorkerCdrTerminalFinalizationTest.php tests/Unit/Core/Workers/WorkerCdrClaimProcessingTest.php tests/Unit/Common/Providers/CDRDatabaseProviderClaimTest.php
```

Ожидается PASS без warning/error.

- [ ] **Step 4: Запустить статические проверки**

```bash
git diff --check
php -l src/Core/Workers/WorkerCdr.php
php -l src/Core/Workers/WorkerCallEvents.php
```

Ожидается отсутствие ошибок.

- [ ] **Step 5: Запустить Calls-тест при доступной PBX**

```bash
php tests/Calls/Scripts/test_1100_queue_ringall_inline_transfer.php
```

Ожидается PASS. Если тестовая PBX недоступна, сохранить точный текст инфраструктурной ошибки отдельно от результата unit-тестов.

- [ ] **Step 6: Актуализировать спецификацию** — отметить реализованные token length, release semantics, best-effort email и точную retry policy 5 секунд.
- [ ] **Step 7: Проверить рабочее дерево и закоммитить только относящиеся к задаче файлы**

```bash
git status --short
git diff --check
git add tests/Calls/Scripts/TestCallsBase.php tests/Calls/Scripts/test_1100_queue_ringall_inline_transfer.php docs/superpowers/specs/2026-08-07-cdr-atomic-claim-design.md
git commit -m "test: cover ringall inline transfer cdr finalization"
```

## Критерии готовности

- После `LINKEDID_END` завершённые строки exact linkedid немедленно claim-ятся без AMI.
- Все каналы завершённого звонка переносятся из tmp в general; незавершённые строки не claim-ятся.
- Одну строку одновременно обрабатывает только один token; stale update не проходит CAS.
- Падение worker восстанавливается после lease, а явная ошибка освобождает claim раньше.
- Ошибка DB или publish не теряет `LINKEDID_END` и приводит к retry.
- Queue transfer не изменяет звонящий sibling.
- Для одного UNIQUEID существует не более одной conversion-задачи.
- Unit/SQLite-backed тесты проходят; результат Calls-теста зафиксирован отдельно.
