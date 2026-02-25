---
name: h-fix-libxcrypt-ssh-password
branch: fix/libxcrypt-ssh-password
status: pending
created: 2026-02-18
---

# Замена libcrypt на libxcrypt для поддержки SHA-512 в SSH паролях

## Problem/Goal

### Суть проблемы

SSH пароли с спецсимволами (`!`, `#`, `@`) не работают при установке через веб-интерфейс или REST API.

### Корневая причина

Системная библиотека `/lib64/libcrypt.so.1` в MikoPBX — старая glibc-bundled версия (48 КБ). Она **не поддерживает SHA-512** (`$6$`) хэши. Поддерживает только DES (13 символов, первые 8 символов пароля) и MD5 (`$1$`).

PHP имеет собственную реализацию `crypt()`, которая поддерживает SHA-512. Поэтому PHP генерирует `$6$` хэши и записывает их в `/etc/shadow` через `chpasswd -e`. Но PAM (`pam_unix.so` → `libcrypt.so.1`), используемый Dropbear SSH, **не может верифицировать** эти хэши при логине.

### Цепочка проблемы

```
Web UI → API → SaveSettingsAction генерирует SHA-512 хэш → DB хранит $6$...
→ SSHConf::updateShellPassword() → chpasswd -e записывает хэш в /etc/shadow
→ Пользователь вводит пароль → Dropbear → PAM → libcrypt.so.1 → НЕ ПОНИМАЕТ $6$ → Permission denied
```

### Доказательства (собраны на 172.16.32.69)

| Тест | Результат |
|------|-----------|
| MD5 хэш (`$1$`) через `chpasswd -e` | SSH работает |
| SHA-512 хэш (`$6$`) через `chpasswd -e` | SSH **не работает** |
| DES хэш через `passwd` | SSH работает |
| Python `crypt.crypt()` с `$6$` солью | `OSError: Invalid argument` |
| BusyBox `mkpasswd -m sha512` | Генерирует хэш, но PAM не верифицирует |
| PHP `crypt()` с `$6$` солью | Работает (PHP имеет свою реализацию) |
| `ls -la /lib64/libcrypt.so.1` | 48 КБ (старая glibc версия) |
| Dropbear `ldd` | Линкуется с `libpam.so.0` и `libcrypt.so.1` |

### Правильное решение

Заменить `/lib64/libcrypt.so.1` на **libxcrypt** — стандартную библиотеку, на которую перешли все современные дистрибутивы (Fedora, Debian, Arch, Alpine). libxcrypt поддерживает SHA-512, bcrypt, yescrypt и другие алгоритмы.

### Почему НЕ workaround с plaintext

Временный workaround (хранить SSH пароли как plaintext, использовать `chpasswd` без `-e`) был реализован и откачен по следующим причинам:
1. **Security regression** — plaintext пароли в БД (`/cf/conf/mikopbx.db`)
2. **DES ограничение** — `chpasswd` без `-e` использует DES, который берёт только первые 8 символов пароля. Пароль `MySecurePassword!2026` эквивалентен `MySecure`
3. **Ложное чувство безопасности** — пользователь думает что установил сложный длинный пароль

## Success Criteria

- [ ] libxcrypt подключена в сборку MikoPBX, `/lib64/libcrypt.so.1` поддерживает SHA-512
- [ ] `chpasswd -e` с `$6$` хэшем → SSH логин работает
- [ ] Python `crypt.crypt()` с `$6$` солью → не возвращает ошибку
- [ ] SSH пароли хранятся как SHA-512 хэши в БД (не plaintext)
- [ ] Пароли с спецсимволами (`!`, `#`, `@`) проходят полный цикл: API → DB → shadow → SSH login
- [ ] Полная длина пароля используется (не ограничение DES в 8 символов)
- [ ] Код SSHConf/SaveSettingsAction/CloudProvider откачен к хэшированию

## Принципы тестирования

### 1. Проверка библиотеки

```bash
# Размер должен быть значительно больше 48 КБ
ls -la /lib64/libcrypt.so.1

# Должны быть символы для SHA-512
nm -D /lib64/libcrypt.so.1 | grep -i sha

# Или проверить через strings
strings /lib64/libcrypt.so.1 | grep '\$6\$'
```

### 2. Проверка системного crypt()

```bash
# Python crypt должен работать с $6$ (раньше давал OSError)
python3 -c "import crypt; print(crypt.crypt('test', '\$6\$rounds=5000\$testsalt\$'))"

# BusyBox mkpasswd + верификация через PAM
HASH=$(mkpasswd -m sha512 -S testsalt123456 'TestPassword!')
echo "root:$HASH" | chpasswd -e
# SSH логин должен работать
```

### 3. Проверка chpasswd -e с SHA-512

```bash
# Генерируем SHA-512 хэш
HASH=$(php -r "echo crypt('Test!Pass#2026', '\$6\$randomsalt12345\$');")
echo "Hash: $HASH"

# Устанавливаем через chpasswd -e
echo "root:$HASH" | chpasswd -e

# Проверяем что хэш в shadow
grep '^root:' /etc/shadow

# SSH логин
sshpass -f <(echo 'Test!Pass#2026') ssh root@localhost echo OK
```

### 4. End-to-end через API

```bash
# На сервере создаём тестовый скрипт (избегаем shell escaping)
php -r "
require_once 'Globals.php';
use MikoPBX\PBXCoreREST\Lib\GeneralSettings\SaveSettingsAction;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\PasswordService;

\$password = 'E2E!Test#Special@2026';
\$result = SaveSettingsAction::main(['SSHPassword' => \$password]);
echo 'API: ' . (\$result->success ? 'OK' : 'FAIL') . PHP_EOL;

\$dbVal = PbxSettings::getValueByKey(PbxSettings::SSH_PASSWORD);
echo 'DB is hash: ' . (PasswordService::isSha512Hash(\$dbVal) ? 'YES' : 'NO') . PHP_EOL;
echo 'DB verifies: ' . (PasswordService::verifySha512Hash(\$password, \$dbVal) ? 'YES' : 'NO') . PHP_EOL;
"

# Ждём WorkerModelsEvents (15 сек)
sleep 15

# Проверяем shadow
grep '^root:' /etc/shadow | cut -d: -f2 | head -c3
# Должно быть $6$ (SHA-512), НЕ 13 символов DES

# SSH логин
sshpass -f <(echo 'E2E!Test#Special@2026') ssh root@localhost echo SSH_OK
```

### 5. Проверка длины пароля

```bash
# Критический тест: DES использует только 8 символов
# С libxcrypt SHA-512 должна работать полная длина

php -r "
require_once 'Globals.php';
use MikoPBX\PBXCoreREST\Lib\GeneralSettings\SaveSettingsAction;

\$pass1 = 'AAAAAAAA_different1';  // Первые 8 = AAAAAAAA
\$pass2 = 'AAAAAAAA_different2';  // Первые 8 = AAAAAAAA

SaveSettingsAction::main(['SSHPassword' => \$pass1]);
"
sleep 15

# Этот ДОЛЖЕН работать
sshpass -f <(echo 'AAAAAAAA_different1') ssh root@localhost echo CORRECT_PASS

# Этот НЕ ДОЛЖЕН работать (с DES оба работали бы!)
sshpass -f <(echo 'AAAAAAAA_different2') ssh root@localhost echo WRONG_PASS
```

### 6. Матрица тестов спецсимволов

| Пароль | Спецсимволы | Ожидание |
|--------|-------------|----------|
| `Simple12345678` | нет | SSH OK |
| `Pass!Word2026` | `!` | SSH OK |
| `Hash#Tag$Test` | `#`, `$` | SSH OK |
| `At@Sign&More` | `@`, `&` | SSH OK |
| `Back\Slash/Fwd` | `\`, `/` | SSH OK |
| `Single'Quote"Dbl` | `'`, `"` | SSH OK |
| `Space In Pass` | пробел | SSH OK |
| `Мультибайт123` | кириллица | SSH OK |

## Затронутые файлы (для отката после libxcrypt)

При workaround были изменены (и откачены):
- `src/Core/System/Configs/SSHConf.php` — `updateShellPassword()`: `chpasswd` без `-e`
- `src/PBXCoreREST/Lib/GeneralSettings/SaveSettingsAction.php` — SSH пароль plaintext
- `src/Core/System/CloudProvisioning/CloudProvider.php` — SSH пароль plaintext
- `src/Core/System/Upgrade/Releases/UpdateConfigsUpToVer20250114.php` — миграция
- `src/Core/System/PasswordService.php` — упрощение generateSha512Hash

Эти файлы нужно будет проверить после подключения libxcrypt — оригинальная логика с `chpasswd -e` и SHA-512 хэшами должна заработать.

## Context Manifest
<!-- Added by context-gathering agent -->

## User Notes

- Сборка с libxcrypt запущена параллельно
- Тестовый сервер: 172.16.32.69
- Workaround откачен в репозитории, код возвращён к хэшированию

## Work Log

- [2026-02-18] Задача создана. Проблема исследована и задокументирована. Workaround с plaintext откачен. Сборка с libxcrypt запущена.
