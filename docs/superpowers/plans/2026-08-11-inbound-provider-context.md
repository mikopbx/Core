# Inbound Provider Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Генерировать для каждого SIP-провайдера `REG_TYPE_INBOUND` только индивидуальный `<uniqid>-incoming` в PJSIP endpoint и dialplan, не включая его в host:port-группировку.

**Architecture:** `SIPConf` получает единый helper выбора идентификатора incoming-контекста и predicate индивидуального контекста. Оба генератора используют эти методы: endpoint получает `<uniqid>-incoming`, а `extensionGenContexts()` создаёт индивидуальную секцию и маршруты конкретного provider `uniqid`.

**Tech Stack:** PHP 8.4, PHPUnit 11, Phalcon, Asterisk PJSIP/dialplan generators.

## Global Constraints

- Для `REG_TYPE_INBOUND` каноническое имя — только `<provider.uniqid>-incoming`.
- `<username>-incoming` и alias для него не создаются.
- Endpoint/AOR inbound-провайдера продолжают называться по `username`.
- Host:port-группировка сохраняется для не-inbound провайдеров.
- Пользовательские незакоммиченные и untracked-файлы не изменяются.

---

### Task 1: Единое правило incoming-контекста SIP-провайдера

**Files:**
- Modify: `src/Core/Asterisk/Configs/SIPConf.php:427-465`
- Modify: `src/Core/Asterisk/Configs/SIPConf.php:2313-2340`
- Test: `tests/Core/Asterisk/Configs/SIPConfTest.php`

**Interfaces:**
- Consumes: provider-массив с `registration_type`, `uniqid`, `context_id`; `$this->contexts_data[context_id]`.
- Produces: `usesDedicatedIncomingContext(array $provider): bool` и `getProviderIncomingContextId(array $provider): string`, используемые обоими генераторами.

- [ ] **Step 1: Написать failing-тесты resolver-контракта**

Добавить в `SIPConfTest` reflection-вызовы приватных helper-методов и проверки:

```php
public function testInboundProviderAlwaysUsesUniqidIncomingContext(): void
{
    $conf = new SIPConf();
    $contexts = new \ReflectionProperty(SIPConf::class, 'contexts_data');
    $contexts->setAccessible(true);
    $contexts->setValue($conf, [
        '20301135060-incoming' => [
            'SIP-TRUNK-A' => 'account-a',
            'SIP-TRUNK-B' => 'account-b',
        ],
    ]);
    $provider = [
        'registration_type' => Sip::REG_TYPE_INBOUND,
        'uniqid' => 'SIP-TRUNK-A',
        'username' => 'account-a',
        'context_id' => '20301135060-incoming',
    ];

    self::assertTrue($this->invokeMethod($conf, 'usesDedicatedIncomingContext', [$provider]));
    self::assertSame(
        'SIP-TRUNK-A',
        $this->invokeMethod($conf, 'getProviderIncomingContextId', [$provider])
    );
}
```

Добавить соседние тесты: одиночный не-inbound возвращает `uniqid`; два не-inbound с одинаковым `context_id` используют общий идентификатор без `-incoming`; inbound никогда не возвращает `username`.

- [ ] **Step 2: Запустить тест и подтвердить RED**

Run:

```bash
php -d include_path=/tmp /tmp/phpunit-11.phar \
  --bootstrap /tmp/mikopbx-test-bootstrap.php \
  tests/Core/Asterisk/Configs/SIPConfTest.php \
  --filter 'IncomingContext'
```

Expected: ERROR/FAIL из-за отсутствующих `usesDedicatedIncomingContext()` и `getProviderIncomingContextId()`.

- [ ] **Step 3: Реализовать минимальные helpers**

В `SIPConf` добавить:

```php
private function usesDedicatedIncomingContext(array $provider): bool
{
    if (($provider['registration_type'] ?? '') === Sip::REG_TYPE_INBOUND) {
        return true;
    }

    return count($this->contexts_data[$provider['context_id']] ?? []) === 1;
}

private function getProviderIncomingContextId(array $provider): string
{
    if ($this->usesDedicatedIncomingContext($provider)) {
        return (string)$provider['uniqid'];
    }

    return str_replace('-incoming', '', (string)$provider['context_id']);
}
```

- [ ] **Step 4: Подключить helpers к обоим генераторам**

В `extensionGenContexts()` заменить проверку `count($contextsData) === 1` на `usesDedicatedIncomingContext($provider)`, использовать `getProviderIncomingContextId($provider)` как первый аргумент `IncomingContexts::generate()`, а `provider['uniqid']` оставить третьим аргументом для выборки входящих маршрутов. Inbound-провайдер не добавлять в `$contexts`, предназначенный для shared-групп и DNS alias.

В `generateProviderEndpoint()` удалить отдельную username-ветку `REG_TYPE_INBOUND` и сформировать контекст единообразно:

```php
$contextId = $this->getProviderIncomingContextId($provider);
$context = "$contextId-incoming";
```

- [ ] **Step 5: Запустить целевые и полные SIPConf-тесты**

Run:

```bash
php -d include_path=/tmp /tmp/phpunit-11.phar \
  --bootstrap /tmp/mikopbx-test-bootstrap.php \
  tests/Core/Asterisk/Configs/SIPConfTest.php
```

Expected: PASS, включая новые тесты и существующие проверки #1045/#1066/#1091.

- [ ] **Step 6: Выполнить статические проверки**

Run:

```bash
php -l src/Core/Asterisk/Configs/SIPConf.php
php -l tests/Core/Asterisk/Configs/SIPConfTest.php
git diff --check
```

Expected: все команды завершаются с кодом 0.

- [ ] **Step 7: Провести code review изменения**

Проверить diff относительно `83aa43f0f`, уделив внимание отсутствию `username-incoming`, сохранению shared-контекстов для других типов, отсутствию duplicate dialplan sections и достаточности тестов.

- [ ] **Step 8: Зафиксировать исправление**

```bash
git add src/Core/Asterisk/Configs/SIPConf.php tests/Core/Asterisk/Configs/SIPConfTest.php
git commit -m "fix: isolate inbound provider contexts"
```

В body коммита указать `Fixes #1101`.
