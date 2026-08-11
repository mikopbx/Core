# MikoPBX Module Anti-Patterns

Checklist for detecting and fixing common mistakes in MikoPBX modules.
Split into **Code Quality** and **Security** sections.

## Detection During Mode 2 (Augment) and Mode 3 (Optimize)

When analyzing an existing module, check for ALL patterns below. Report findings with severity and file:line references.

---

# PART 1: CODE QUALITY ANTI-PATTERNS

---

## 1. [CRITICAL] MikoPBXVersion.php for new modules

**Detection:**
```bash
# If module.json has min_pbx_version >= 2025.1.1 AND MikoPBXVersion.php exists
```

**Problem:** Legacy compatibility helper not needed for 2025.1.1+ modules.

**Fix:** Remove `MikoPBXVersion.php` and replace all calls:
```php
// BEFORE (legacy)
$di = MikoPBXVersion::getDefaultDi();

// AFTER (modern)
$di = Di::getDefault();
```

---

## 2. [CRITICAL] shell_exec instead of PBX methods

**Detection:**
```bash
grep -n "shell_exec\|exec(" Lib/*Conf.php
```

**Problem:** Direct shell calls bypass MikoPBX process management.

**Fix:**
```php
// BEFORE
shell_exec('/usr/sbin/asterisk -rx "dialplan reload"');

// AFTER
PBX::dialplanReload();
PBX::sipReload();
PBX::coreReload();
```

---

## 3. [HIGH] Monolithic classes > 500 lines

**Detection:**
```bash
wc -l Lib/*.php bin/*.php | sort -rn | head
```

**Problem:** Hard to maintain, test, and understand. Common in Conf.php, worker files, and database connector classes.

**Fix:** Extract business logic into separate `{Feature}Main.php` class. Conf.php should only contain hook method implementations that delegate to Main.

---

## 4. [HIGH] Copy-paste Logger class

**Detection:**
```bash
grep -rn 'class Logger' Lib/Logger.php
```

**Problem:** Multiple modules ship their own nearly identical `Logger` class with `writeError()`, `writeInfo()`, `rotate()`. Bug fixes in one copy don't propagate.

**Fix:** Use MikoPBX core logger from `PbxExtensionBase::$logger` or extract common `ModuleLogger` base class.

---

## 5. [HIGH] Copy-paste ConnectorDB worker pattern

**Detection:**
```bash
grep -rn 'class ConnectorD[bB] extends WorkerBase' bin/*.php
```

**Problem:** Modules implement their own ConnectorDB/ConnectorDb worker as a Beanstalk-based database proxy, reinventing the same dispatch pattern with different bugs. Even naming is inconsistent (`ConnectorDb` vs `ConnectorDB`).

**Fix:** Extract `BaseConnectorDB` class in Core with dispatch mechanism.

---

## 6. [HIGH] Copy-paste TTS / Synthesize class

**Detection:**
```bash
grep -rn 'class.*Synthesize\|class.*TTS' Lib/*.php
```

**Problem:** TTS integration duplicated across modules with different HTTP clients (curl vs Guzzle), different error handling, and missing shell escaping.

**Fix:** Extract common TTS interface + implementations into shared library.

---

## 7. [HIGH] Phantom model fields (accessing undeclared properties)

**Detection:** Read model, list declared `@Column` properties, then grep for other property access on model instances.

**Problem:** Code references model properties that don't exist. Returns `null` silently, causing logic bugs. Common in example modules and rapidly developed features.

**Fix:** Only access properties declared in the model class with `@Column` annotations.

---

## 8. [MEDIUM] `die()` / `exit()` in library and worker classes

**Detection:**
```bash
grep -rn 'die(\|exit(' Lib/*.php bin/*.php | grep -v 'agi-bin'
```

**Problem:** Prevents graceful shutdown, skips destructors and finally blocks, untestable.

**Fix:**
```php
// BEFORE
die('Settings not set...');

// AFTER (in worker)
$this->logger->writeError('Settings not set');
$this->needRestart = true;
return;

// AFTER (in library)
throw new \RuntimeException('Settings not set');
```

---

## 9. [MEDIUM] `1*$variable` type casting idiom

**Detection:**
```bash
grep -rn '1\*\$\|1\*shell_exec' Lib/*.php bin/*.php
```

**Problem:** PHP 4-era pattern instead of `(int)` cast. Obscure to readers.

**Fix:** Use `(int)$variable` or `intval($variable)`.

---

## 10. [MEDIUM] `md5(print_r())` for change detection

**Detection:**
```bash
grep -rn 'md5(print_r' bin/*.php Lib/*.php
```

**Problem:** `print_r()` output is ambiguous — different data structures can produce identical strings.

**Fix:** Use `md5(json_encode($data, JSON_THROW_ON_ERROR))` or `serialize()`.

---

## 11. [MEDIUM] Memory leaks in long-running workers

**Detection:** Look for arrays that grow but are never pruned in worker classes.

**Problem:** Workers run indefinitely. Arrays tracking call state, created entities, or incomplete records grow without bound.

**Fix:** Add TTL-based pruning or use Redis with automatic expiration:
```php
$this->stateArray = array_filter(
    $this->stateArray,
    fn($entry) => time() - $entry['time'] < 3600
);
```

---

## 12. [MEDIUM] Stub implementations instead of real ORM

**Detection:** Look for `// In real module...`, `// TODO`, hardcoded fake data in example modules.

**Problem:** Example modules return hardcoded/placeholder data instead of using their own declared models. Developers copy stub implementations into production.

**Fix:** Examples must demonstrate real ORM operations, not stubs.

---

## 13. [MEDIUM] File-based IPC instead of Redis

**Detection:**
```bash
grep -l "file_put_contents.*json_encode\|file_get_contents.*json_decode" Lib/*.php bin/*.php
```

**Problem:** Race conditions, no TTL, slower than Redis.

**Fix:** Use Redis with TTL:
```php
$redis = Di::getDefault()->get('redis');
$redis->setex("call_state:{$id}", 600, json_encode($data));
```

---

## 14. [MEDIUM] Copy-paste worker restart pattern

**Detection:**
```bash
grep -n "Processes::killByName\|killByProcessTitle" Lib/*Conf.php
```

**Problem:** Manual process killing instead of using WorkerSafeScriptsCore restart mechanism.

**Fix:** Use `WorkerSafeScriptsCore::restartWorker(WorkerClass::class)`.

---

## 15. [MEDIUM] Missing type declarations on methods

**Detection:**
```bash
grep -n "function [a-z].*)" Lib/*.php | grep -v ": "
```

**Problem:** No return type or parameter type hints on methods.

**Fix:** Add PHP 8.4 type declarations on all method parameters and return types.

**Exception — Phalcon ORM model properties:** Model column properties follow Phalcon conventions and MUST NOT be flagged:
- Primary key is always untyped: `public $id;`
- Other column properties use nullable types: `public ?string $name = '';`
- This is NOT an anti-pattern — it is the standard MikoPBX/Phalcon model pattern. See core models in `src/Common/Models/`.
- Conversely, *adding* types here IS an anti-pattern — see **#25**, a typed `int $id` fatals on `save()`.

---

## 16. [MEDIUM] `@` error suppression

**Detection:**
```bash
grep -rn '@unlink\|@file_put\|@fopen\|@mkdir' Lib/*.php bin/*.php
```

**Problem:** Hides real errors.

**Fix:**
```php
// BEFORE
@unlink($file);

// AFTER
if (file_exists($file)) {
    unlink($file);
}
```

---

## 17. [LOW] Hardcoded ports without conflict check

**Detection:**
```bash
grep -rn ":[0-9]\{4,5\}" Lib/*.php bin/*.php | grep -v "127.0.0.1:5038\|127.0.0.1:6379"
```

**Fix:** Store port in model settings, allow user to configure.

---

## 18. [LOW] Direct SQL instead of ORM

**Detection:**
```bash
grep -n "->query(\|->execute(\|sqlite3\|PDO" Lib/*.php bin/*.php
```

**Exception:** Acceptable in cloud provisioning (no Redis), bulk operations, isolated workers.

---

## 19. [LOW] Unused imports

**Detection:** Check that every `use` statement is referenced in code (not just comments).

---

## 20. [LOW] Missing declare(strict_types=1)

**Detection:**
```bash
find . -name "*.php" -exec grep -L "declare(strict_types" {} \;
```

---

## 21. [LOW] Wrong Phalcon DI import

Use `Phalcon\Di\Di` not `Phalcon\Di`.

---

## 22. [LOW] Hardcoded test data in production code

**Detection:**
```bash
grep -rn 'для тестирования\|for testing\|TODO\|FIXME\|HACK' Lib/*.php
```

---

## 23. [LOW] Curl responses not checked for false

**Problem:** `curl_exec()` returns `false` on failure. Passing to `json_decode()` silently produces `null`.

**Fix:** Always check return value and call `curl_error()` on failure.

---

## 24. [LOW] Duplicated addCheckBox from BaseForm

**Detection:**
```bash
grep -rn 'function addCheckBox' App/Forms/*.php
```

**Fix:** Extend `MikoPBX\AdminCabinet\Forms\BaseForm` instead of `Phalcon\Forms\Form`.

---

## 25. [CRITICAL] Typed `int $id` on a Phalcon model primary key

**Detection:**
```bash
grep -rn 'public int \$id\|public ?int \$id' Models/*.php
```

**Problem:** A typed `int` primary key **fatals on the first `save()`**. Phalcon
reads the property before assigning the generated key, and an uninitialized typed
property throws `Error: Typed property ...::$id must not be accessed before
initialization`. The record is never written. The same applies to NOT NULL string
columns: a bare `public string $x;` fatals the moment Phalcon hydrates a row where
that column is absent from the SELECT.

```php
// BEFORE — fatal on save()
public int $id;
public string $number;

// AFTER — untyped PK, nullable string columns with a string default
public $id;                          // ALWAYS untyped
public ?string $number = '';         // NOT NULL string column
public ?string $enabled = '0';       // integer stored as string in SQLite
public ?int $userid = null;          // nullable integer foreign key
```

This is the **only** place where the PHP 8.4 typed-property rules do not apply.
Compare the core models in `src/Common/Models/`: `Extensions.php`, `Sip.php`,
`CallQueues.php` — every one of them declares `public $id;`.

---

## 26. [CRITICAL] Unconditional required-field validation in a save action

**Detection:**
```bash
# A required-field loop that runs before the HTTP verb is known
grep -n 'required' Lib/RestAPI/*/Actions/*.php App/Controllers/*.php
```

**Problem:** Validating required fields on every request makes **every `PATCH`
return 422**. A PATCH is a partial update and legitimately omits fields the
resource already has; only `POST` and `PUT` carry a complete representation.
Verified live — a module with this bug could create and replace records but no
client could ever patch one.

The save action must run its phases in this exact order:

```
1. sanitize input
2. determine the operation (including the HTTP verb)
3. validate required fields   — POST and PUT ONLY; PATCH is exempt
4. apply defaults             — on CREATE only, never on update
5. schema validation
6. save
7. respond
```

```php
// BEFORE — 422 on every PATCH
foreach (self::REQUIRED as $field) {
    if (!isset($data[$field])) {
        $res->messages['error'][] = "Missing $field";
        $res->httpCode = 422;
        return $res;
    }
}

// AFTER — required check is scoped to the verbs that carry a full payload
// A REST action runs as `public static function main(array $data)`, so `$this`
// does not exist there — the verb travels inside the payload. Compare the
// canonical ModuleExampleRestAPIv3/Lib/RestAPI/Tasks/Actions/SaveRecordAction.
$res = self::createApiResult(__METHOD__);   // base-class helper: tags $res->processor,
                                            // which `new PBXApiResult()` would leave unset
$method = strtoupper((string)($data['httpMethod'] ?? 'POST'));
// In App/Controllers/*.php the save is an instance method, so there — and only
// there — the verb comes from the request: $this->request->getMethod().
if (in_array($method, ['POST', 'PUT'], true)) {
    foreach (self::REQUIRED as $field) {
        if (!isset($data[$field])) {
            $res->messages['error'][] = "Missing $field";
            $res->httpCode = 422;
            return $res;
        }
    }
}
if ($method === 'POST') {
    $data = array_merge(self::DEFAULTS, $data);   // defaults on create only
}
```

Applying defaults on update is the mirror-image bug: it silently resets fields the
caller never mentioned.

---

## 27. [HIGH] `messages[]` instead of `messages['error'][]`

**Detection:**
```bash
grep -rn '\->messages\[\]' Lib/ App/
```

**Problem:** `PBXApiResult::$messages` is a **keyed** array (`src/PBXCoreREST/Lib/PBXApiResult.php`).
Appending with a bare `[]` produces a list where the consumer expects a map, so the
error envelope is malformed and clients reading `messages.error` see nothing — the
request fails silently from the caller's point of view.

```php
// BEFORE — malformed envelope
$res->messages[] = 'Number already exists';

// AFTER
$res->messages['error'][] = 'Number already exists';
```

Every Core processor uses the keyed form — see
`src/PBXCoreREST/Workers/WorkerApiCommands.php:405` and any
`*ManagementProcessor.php`.

---

## 28. [HIGH] BaseForm subclass that does not call `parent::initialize()` first

**Detection:**
```bash
# one grep per file — a piped `grep -L` is silenced by the first clean form
find App/Forms -maxdepth 1 -name '*.php' 2>/dev/null | while read -r f; do
  grep -q 'function initialize' "$f" || continue   # no override — inherits BaseForm
  grep -q 'parent::initialize' "$f" || echo "$f"
done
```

**Problem:** `BaseForm::initialize()` is the **only** thing that fires
`WebUIConfigInterface::ON_BEFORE_FORM_INITIALIZE`
(`src/AdminCabinet/Forms/BaseForm.php:37-46`). Skip it and no other module can ever
inject a field into your form — silently. Nothing errors; the extension points just
never run.

```php
// BEFORE — breaks field injection by other modules
public function initialize($entity = null, $options = null): void
{
    $this->add(new Text('number'));
}

// AFTER — parent FIRST, then your own fields
public function initialize($entity = null, $options = null): void
{
    parent::initialize($entity, $options);
    $this->add(new Text('number'));
}
```

NOTE: the shipped `Extensions/ModuleTemplate/` scaffold currently has this bug. Do
not copy its form verbatim.

---

## 29. [HIGH] Closure passed to AMI `addEventHandler()`

**Detection:**
```bash
grep -n 'addEventHandler' Lib/*.php bin/*.php
```

**Problem:** `AsteriskManager::addEventHandler(string $event, array|string $callback)`
(`src/Core/Asterisk/AsteriskManager.php:1751`) does not accept a `Closure` — passing
one raises a `TypeError` against the `array|string` parameter type. Dispatch in
`processEvent()` is also **arity-dependent**, which is easy to get wrong:

* an **array** callable `[$this, 'method']` is invoked via `call_user_func($handler, $parameters)` — it receives **one** argument, the parameters array;
* a **string** function name is invoked as `$handler($e, $parameters, $server, $port)` — **four** arguments.

```php
// BEFORE — TypeError
$this->am->addEventHandler('Newchannel', function (array $params) { ... });

// AFTER — array callable, one parameter
$this->am->addEventHandler('Newchannel', [$this, 'onNewChannel']);

public function onNewChannel(array $parameters): void
{
    // single argument — do NOT declare ($event, $parameters, $server, $port)
}
```

---

## 30. [CRITICAL] Dialplan context with bare-digit extensions included into `[internal]`

**Detection:**
```bash
# extensionGenContexts() output that emits bare digits, combined with an
# include into the internal context
grep -n 'exten =>' Lib/*Conf.php
```

**Problem:** Including a context whose extensions are bare digits into the internal
context makes those digits compete with real dialable objects. Verified live: a
module context exposing `1` as a menu key was included into `[internal]`, digit `1`
collided with an existing queue number, and **calls to that queue were swallowed**
by the module — no error anywhere, just lost calls.

```php
// BEFORE — bare digits leak into the internal dial scope
$conf  = "[module-blacklist-menu]\n";
$conf .= "exten => 1,1,Goto(block)\n";
$conf .= "exten => 2,1,Goto(allow)\n";
// ... and elsewhere:
// return "include => module-blacklist-menu\n";   // into [internal] — WRONG

// AFTER — keep bare-digit menus in their own context, reachable only by a
// feature code or an explicit Goto from your own dialplan
$conf  = "[module-blacklist-menu]\n";     // NOT included into [internal]
$conf .= "exten => 1,1,Goto(block)\n";
$conf .= "exten => 2,1,Goto(allow)\n";
```

Only include a context into `[internal]` when every extension in it is a namespaced
feature code (`*761`, `*762`, …) that cannot collide with an extension, queue,
conference or IVR number.

---

## 31. [HIGH] RPC-style catch-all REST controller

**Detection:**
```bash
for f in Lib/RestAPI/*/Controller.php; do
  printf '%s: ' "$f"
  grep -c '#\[ApiOperation' "$f"
done
```

**Problem:** A controller that mixes unrelated settings, jobs, files, status, and
business records has no coherent resource contract. It accumulates verb-based
routes, inconsistent permissions, unrelated schemas, and an OpenAPI tag that says
nothing about ownership.

**Fix:** Before adding endpoints, enumerate business resources. Give each cohesive
resource its own `Lib/RestAPI/{Resource}/` directory, plural noun path, schema,
lifecycle, and permission boundary. Map CRUD to standard HTTP methods. Keep a
custom `:action` only when it represents a state transition owned by that resource.

Also run the OpenAPI catalog validator. Missing generated `rest_tag_*`, operation,
parameter, schema, or module response keys in `Messages/en.php` or
`Messages/ru.php` are a release-blocking validation failure:

```bash
php .claude/skills/mikopbx-module/scripts/validate-rest-api-translations.php {module_dir}
```

---

# PART 2: SECURITY ANTI-PATTERNS

These patterns can lead to system compromise through installed modules.
When detected, treat as **priority fixes** before any code quality improvements.

---

## S1. [CRITICAL] Unauthenticated endpoints exposing sensitive data or actions

**Detection:**
```bash
# Find routes with noAuth=true (6th parameter in route array)
grep -A5 "getPBXCoreRESTAdditionalRoutes" Lib/*Conf.php | grep "true\]"
# Also check moduleRestAPICallbackBeforeAuth (runs WITHOUT auth)
grep -n "moduleRestAPICallbackBeforeAuth" Lib/*Conf.php
```

**Rule:** NEVER use `noAuth=true` for endpoints that:
- Modify system state or settings
- Execute or originate calls
- Expose credentials, tokens, or passwords
- Access CDR data or call recordings
- Serve files by user-supplied path

**Fix:** Remove `noAuth=true` flag or implement HMAC/token verification inside the handler.

---

## S2. [CRITICAL] SQL injection via string interpolation in findFirst/find

**Detection:**
```bash
grep -rn "findFirst(\".*\\\$\|findFirst('.*\\\$\|find(\".*\\\$" Lib/*.php bin/*.php agi-bin/*.php App/**/*.php
```

**Problem:** Phalcon `findFirst("column='$value'")` with string interpolation allows SQL injection.

**Fix:** Always use parameterized form:
```php
// BEFORE (VULNERABLE)
Model::findFirst("field='{$userInput}'");
Model::findFirst('id="'.$rowId.'"');

// AFTER (safe)
Model::findFirst([
    'conditions' => 'field = :val:',
    'bind' => ['val' => $userInput],
]);
```

---

## S3. [CRITICAL] Command injection via unescaped shell arguments

**Detection:**
```bash
grep -rn 'shell_exec\|Processes::mwExec\|exec(' Lib/*.php bin/*.php agi-bin/*.php | grep '\$' | grep -v 'escapeshellarg'
```

**Problem:** Variables in shell commands without `escapeshellarg()` enable command injection. Especially dangerous in AGI scripts (run as root) and workers processing external data (filenames from CDR, SIP headers, API responses).

**Fix:** EVERY variable in a shell command MUST be wrapped:
```php
// BEFORE (VULNERABLE)
shell_exec("$sox $inputFile $outputFile");

// AFTER (safe)
shell_exec(sprintf('%s %s %s',
    $sox,
    escapeshellarg($inputFile),
    escapeshellarg($outputFile)
));
```

---

## S4. [CRITICAL] Path traversal / arbitrary file read

**Detection:**
```bash
grep -rn 'fopen\|file_get_contents\|readfile\|fpassthru' Lib/RestAPI/**/*.php Lib/*.php | grep '\$'
```

**Problem:** Endpoints that serve files by user-supplied path without validation against allowed base directory.

**Fix:** Always validate file paths:
```php
$resolved = realpath($userInput);
$allowedBase = realpath('/storage/usbdisk1/mikopbx/astspool/monitor/');
if ($resolved === false || !str_starts_with($resolved, $allowedBase)) {
    $this->sendError(403);
    return;
}
```

---

## S5. [CRITICAL] Reflected XSS in HTML/PHP pages

**Detection:**
```bash
grep -rn '\$_REQUEST\|\$_GET\|\$_POST' sites/**/*.php *.html | grep -v 'htmlspecialchars'
```

**Problem:** User input echoed directly into HTML/JavaScript without escaping.

**Fix:** Always escape output:
```php
<?php echo htmlspecialchars($input ?? '', ENT_QUOTES, 'UTF-8'); ?>
```

---

## S6. [HIGH] Dynamic method dispatch from user input

**Detection:**
```bash
grep -rn '\$this->\$\|self::\$' Lib/*.php | grep -i 'action\|method\|func'
```

**Problem:** User-controlled action name used to call methods via `$this->$action()`. Exposes all public methods of the class.

**Fix:** Use explicit dispatch:
```php
$result = match($params['action']) {
    'check' => $this->checkAction($params),
    'reload' => $this->reloadAction($params),
    default => throw new \InvalidArgumentException('Unknown action'),
};
```

---

## S7. [HIGH] Insecure deserialization

**Detection:**
```bash
grep -rn 'unserialize(' agi-bin/*.php bin/*.php Lib/*.php
```

**Problem:** `unserialize()` with data from HTTP requests, AGI channel variables, or queue messages can lead to RCE via PHP object injection.

**Fix:** NEVER use `unserialize()` for IPC. Use `json_encode`/`json_decode`:
```php
// BEFORE (DANGEROUS)
$params = unserialize(base64_decode($channelVar));

// AFTER (safe)
$params = json_decode(base64_decode($channelVar), true, 512, JSON_THROW_ON_ERROR);
```

---

## S8. [HIGH] Cron injection via unsanitized fields

**Detection:**
```bash
grep -rn 'tasks\[\].*=.*\$settings\|tasks\[\].*=.*\$' Lib/*Conf.php
```

**Problem:** Database fields interpolated directly into crontab entries without validation.

**Fix:** Validate against strict patterns:
```php
if (!preg_match('/^(\*|[0-9]{1,2})$/', $settings->dateMonth)) {
    $settings->dateMonth = '*';
}
```

---

## S9. [HIGH] SSL/TLS verification disabled

**Detection:**
```bash
grep -rn 'SSL_VERIFYPEER.*0\|SSL_VERIFYHOST.*0\|verify.*false' Lib/*.php bin/*.php
```

**Problem:** MITM attacks on outbound HTTPS connections.

**Fix:** Remove or set to `true`. For self-signed certs, use `CURLOPT_CAINFO` with specific CA bundle.

---

## S10. [HIGH] Credentials in API responses or config files

**Detection:**
```bash
grep -rn "secret\|password\|api_key\|token" Lib/RestAPI/**/*.php | grep -i "base64\|encode\|return\|echo"
```

**Problem:** SIP passwords returned via API (even base64-encoded). AMI/API credentials hardcoded in generated config files.

**Fix:** Never return raw credentials via API. Use token-based auth. Generate random credentials per installation.

---

## S11. [MEDIUM] SSRF via admin-configurable URLs

**Detection:**
```bash
grep -rn 'Client()\|curl_init\|file_get_contents.*http' Lib/*.php | grep '\$'
```

**Problem:** HTTP requests to URLs from database/settings without private IP validation. `127.0.0.1` exclusion trivially bypassed with `0.0.0.0`, `::1`, `localhost`.

**Fix:**
```php
$ip = gethostbyname($host);
if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
    throw new \RuntimeException('Blocked: private/reserved address');
}
```

---

## S12. [MEDIUM] Information disclosure via error output

**Detection:**
```bash
grep -rn 'print_r.*true\|var_dump\|var_export' Lib/RestAPI/**/*.php Lib/*.php
```

**Problem:** Raw `print_r()` or exception messages in API responses expose internal data structures, file paths, class names.

**Fix:** Return generic error messages. Log details server-side only.

---

## S13. [LOW] `postMessage("*")` without origin restriction

**Detection:**
```bash
grep -rn 'postMessage.*\*' sites/**/*.php *.html
```

**Fix:** Specify exact target origin in `postMessage()`.

---

## S14. [LOW] Predictable temp file paths

**Detection:**
```bash
grep -rn "'/tmp/\|/tmp/\$" Lib/*.php bin/*.php
```

**Fix:** Use `tempnam()` or include cryptographic random component in filename.

---

# Report Format

```
Module Anti-Pattern Report: ModuleXxx
=====================================

CODE QUALITY:
  [3] Monolithic XxxConf.php (847 lines)
      Fix: Extract dialplan generation to XxxMain.php

  [7] Phantom field access: $record->disabled (not in model)
      File: Lib/GetConfigAction.php:52
      Fix: Add field to model or remove access

SECURITY:
  [S2] SQL injection in findFirst
      File: Lib/XxxMain.php:204
      Code: findFirst("col='{$var}'")
      Fix: Use parameterized bind

  [S3] Command injection — missing escapeshellarg
      File: agi-bin/lookup.php:34
      Fix: Wrap $variable in escapeshellarg()

Score: 65/100
Priority fixes: Security first (S2, S3, S4), then code quality
```
