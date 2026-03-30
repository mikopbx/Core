# MikoPBX Module Anti-Patterns

Checklist for detecting and fixing common mistakes in MikoPBX modules.

## Detection During Mode 2 (Augment) and Mode 3 (Optimize)

When analyzing an existing module, check for all patterns below. Report findings with severity and file:line references.

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

**Problem:** Hard to maintain, test, and understand. Common in Conf.php and worker files.

**Fix:** Extract business logic into separate `{Feature}Main.php` class. Conf.php should only contain hook method implementations that delegate to Main.

---

## 4. [HIGH] Missing escapeshellarg in AGI scripts

**Detection:**
```bash
grep -n '\$' agi-bin/*.php | grep -v "escapeshellarg\|->get\|agi->"
```

**Problem:** Command injection vulnerability when passing user input to shell commands.

**Fix:**
```php
// BEFORE
$cmd = "asterisk -rx 'database put {$key} {$value}'";

// AFTER
$cmd = sprintf("asterisk -rx 'database put %s %s'",
    escapeshellarg($key),
    escapeshellarg($value)
);
```

---

## 5. [HIGH] Hardcoded ports without conflict check

**Detection:**
```bash
grep -rn ":[0-9]\{4,5\}" Lib/*.php bin/*.php | grep -v "127.0.0.1:5038\|127.0.0.1:6379"
```

**Problem:** Port collisions with other modules or system services.

**Fix:** Store port in model settings, allow user to configure. Document default port in README.

---

## 6. [MEDIUM] Direct SQL instead of ORM

**Detection:**
```bash
grep -n "->query(\|->execute(\|sqlite3\|PDO" Lib/*.php bin/*.php
```

**Problem:** Bypasses Phalcon model validation, events, and caching.

**Fix:** Use Phalcon models with proper find/save/delete methods.

**Exception:** Direct SQL is acceptable in:
- Cloud provisioning (no Redis during boot)
- Performance-critical bulk operations
- Workers that need isolation from ORM

---

## 7. [MEDIUM] Missing type declarations

**Detection:**
```bash
grep -n "function [a-z].*)" Lib/*.php | grep -v ": "
```

**Problem:** No return type or parameter type hints.

**Fix:** Add PHP 8.3 type declarations:
```php
// BEFORE
public function processData($data) { }

// AFTER
public function processData(array $data): PBXApiResult { }
```

---

## 8. [MEDIUM] Copy-paste worker restart pattern

**Detection:**
```bash
grep -n "Processes::killByName\|killByProcessTitle" Lib/*Conf.php
```

**Problem:** Manual process killing instead of using WorkerSafeScriptsCore restart mechanism.

**Fix:**
```php
// BEFORE (in modelsEventChangeData)
Processes::killByProcessTitle('WorkerMyModule');

// AFTER
WorkerSafeScriptsCore::restartWorker(WorkerMyModule::class);
```

---

## 9. [MEDIUM] File-based IPC instead of Redis

**Detection:**
```bash
find . -name "*.php" -exec grep -l "file_put_contents.*json_encode\|file_get_contents.*json_decode" {} \;
```

**Problem:** Race conditions, no TTL, slower than Redis.

**Fix:** Use Redis with TTL:
```php
// BEFORE
file_put_contents("/tmp/call_state_{$id}.json", json_encode($data));

// AFTER
$redis = Di::getDefault()->get('redis');
$redis->setex("call_state:{$id}", 600, json_encode($data));
```

---

## 10. [LOW] Unused imports

**Detection:**
```bash
# Check for unused use statements
grep -n "^use " Lib/*.php | while read line; do
    class=$(echo "$line" | grep -oP '\\\\(\w+);' | tr -d '\\;')
    file=$(echo "$line" | cut -d: -f1)
    if ! grep -q "$class" "$file" 2>/dev/null; then
        echo "UNUSED: $line"
    fi
done
```

**Fix:** Remove unused `use` statements.

---

## 11. [LOW] Missing declare(strict_types=1)

**Detection:**
```bash
find . -name "*.php" -exec grep -L "declare(strict_types" {} \;
```

**Fix:** Add to all PHP files after `<?php`:
```php
<?php

declare(strict_types=1);
```

---

## 12. [LOW] Wrong Phalcon DI import

**Detection:**
```bash
grep -rn "use Phalcon\\\\Di;" Lib/*.php bin/*.php App/**/*.php
```

**Problem:** Should use `Phalcon\Di\Di` not `Phalcon\Di`.

**Fix:**
```php
// BEFORE
use Phalcon\Di;

// AFTER
use Phalcon\Di\Di;
```

---

## Report Format

```
Module Anti-Pattern Report: ModuleXxx
=====================================

CRITICAL:
  [1] MikoPBXVersion.php present but min_pbx_version=2025.1.1
      File: Lib/MikoPBXVersion.php
      Fix: Remove file, replace 3 calls in Lib/XxxConf.php

  [2] shell_exec in Conf.php
      File: Lib/XxxConf.php:145
      Fix: Replace with PBX::dialplanReload()

HIGH:
  [3] Monolithic XxxConf.php (847 lines)
      Fix: Extract dialplan generation to XxxMain.php

  [4] Missing escapeshellarg in AGI
      File: agi-bin/lookup.php:34
      Fix: Wrap $callerID in escapeshellarg()

MEDIUM:
  [5] 12 functions without return types
      Files: Lib/XxxConf.php, Lib/XxxMain.php
      Fix: Add type declarations

LOW:
  [6] Missing strict_types in 3 files
      Fix: Add declare(strict_types=1)

Score: 65/100
Priority fixes: #1, #2, #4 (security + compatibility)
```
