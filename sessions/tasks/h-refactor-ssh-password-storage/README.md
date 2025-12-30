---
name: h-refactor-ssh-password-storage
branch: feature/h-refactor-ssh-password-storage
status: pending
created: 2025-12-30
---

# Refactor SSH Password Storage to SHA-512

## Problem/Goal

Текущая система хранения SSH паролей небезопасна:
- `SSH_PASSWORD` хранится в БД как **plain text**
- При утечке БД пароли полностью скомпрометированы
- Proxmox генерирует современные SHA-512 хэши, но MikoPBX их игнорирует и перезаписывает слабыми DES хэшами

**Цель:** Перейти на хранение только SHA-512 хэшей паролей, унифицировать подход с `WEB_ADMIN_PASSWORD` (который уже хранится как хэш).

## Success Criteria
<!-- To be confirmed with user -->
- [ ] SSH пароль хранится в БД только как SHA-512 хэш (`$6$salt$hash`)
- [ ] Plain text пароль НИКОГДА не сохраняется в БД
- [ ] REST API принимает plain text, хэширует и сохраняет хэш
- [ ] SSHConf использует `chpasswd -e` с готовым хэшем
- [ ] LXC провижинг извлекает и сохраняет Proxmox SHA-512 хэш
- [ ] Docker/Cloud провижинг поддерживает хэшированные пароли
- [ ] Email уведомления о смене пароля работают корректно
- [ ] Консольное меню позволяет сбросить пароль
- [ ] Миграция существующих plain text паролей при апгрейде
- [ ] Все тесты API проходят

## Subtasks

### Phase 1: Database Schema
- `01-database-schema.md` — Добавить `SSH_PASSWORD_HASH`, deprecate `SSH_PASSWORD`

### Phase 2: Core Implementation
- `02-password-hashing.md` — Функция генерации SHA-512 хэша
- `03-sshconf-update.md` — Модификация SSHConf для `chpasswd -e`

### Phase 3: API & UI
- `04-rest-api.md` — SaveSettingsAction хэширование при сохранении
- `05-email-notifications.md` — Уведомления о смене пароля

### Phase 4: Provisioning
- `06-lxc-provisioning.md` — Извлечение хэша из Proxmox shadow
- `07-docker-cloud-provisioning.md` — Поддержка хэшей в Docker/Cloud

### Phase 5: Recovery & Migration
- `08-console-menu.md` — Сброс пароля через консоль
- `09-migration.md` — Миграция в `UpdateConfigsUpToVer20250114.php`

## Context Manifest

### How SSH Password Storage Currently Works

#### 1. Database Constants and Default Values

SSH password storage is defined in two trait files that make up the `PbxSettings` model:

**PbxSettingsConstantsTrait.php** (`src/Common/Models/PBXSettings/PbxSettingsConstantsTrait.php`):
```php
/** @FieldType('password') */
public const string SSH_PASSWORD = 'SSHPassword';
/** @FieldType('string') */
public const string SSH_PASSWORD_HASH_FILE = 'SSHPasswordHashFile';
/** @FieldType('string') */
public const string SSH_PASSWORD_HASH_STRING = 'SSHPasswordHashString';
/** @FieldType('boolean') */
public const string SSH_DISABLE_SSH_PASSWORD = 'SSHDisablePasswordLogins';
```

**PbxSettingsDefaultValuesTrait.php** (`src/Common/Models/PBXSettings/PbxSettingsDefaultValuesTrait.php`):
The default SSH password is set to `admin` (plain text). The `SSH_PASSWORD_HASH_STRING` stores `md5(password)` for change detection, and `SSH_PASSWORD_HASH_FILE` stores `md5_file('/etc/shadow')` for security monitoring.

The current system uses THREE related fields:
- `SSH_PASSWORD` - stores the actual plain text password
- `SSH_PASSWORD_HASH_STRING` - stores `md5($password)` for detecting if password was changed in an unusual way
- `SSH_PASSWORD_HASH_FILE` - stores `md5_file('/etc/shadow')` to detect external shadow file modifications

#### 2. REST API Password Saving Flow

When a user changes the SSH password via the web interface or REST API, the request flows through:

**SaveSettingsAction.php** (`src/PBXCoreREST/Lib/GeneralSettings/SaveSettingsAction.php`):

The password handling happens in `updatePBXSettings()` method (lines 446-467):
```php
case PbxSettings::SSH_PASSWORD:
    if ($data[$key] !== GeneralSettingsEditForm::HIDDEN_PASSWORD) {
        // User changed SSH password
        $newValue = $data[$key];
        PbxSettings::setValueByKey(PbxSettings::SSH_PASSWORD_HASH_STRING, md5($newValue), $messages['error']);
    } elseif (
        ($data[PbxSettings::WEB_ADMIN_PASSWORD] ?? GeneralSettingsEditForm::HIDDEN_PASSWORD) !== GeneralSettingsEditForm::HIDDEN_PASSWORD
        && PbxSettings::getValueByKey(PbxSettings::SSH_PASSWORD) === $defaultPbxSettings[PbxSettings::SSH_PASSWORD]
    ) {
        // User changed Web password AND current SSH password equals default - sync them
        $newValue = $data[PbxSettings::WEB_ADMIN_PASSWORD];
        PbxSettings::setValueByKey(PbxSettings::SSH_PASSWORD_HASH_STRING, md5($newValue), $messages['error']);
    } else {
        continue 2;
    }
    break;
```

**Critical synchronization logic:** The code also handles password synchronization in `handlePasswordSynchronization()` (lines 562-604). When one password is changed and the other is at default, they are automatically synchronized. This logic must be preserved but adapted for hashed storage.

#### 3. SSHConf Password Application to System

**SSHConf.php** (`src/Core/System/Configs/SSHConf.php`):

The `updateShellPassword()` method (lines 272-298) applies the password to the Linux system:
```php
private function updateShellPassword(string $sshLogin = 'root'): void
{
    $password           = PbxSettings::getValueByKey(PbxSettings::SSH_PASSWORD);
    $hashString         = PbxSettings::getValueByKey(PbxSettings::SSH_PASSWORD_HASH_STRING);
    $disablePassLogin   = PbxSettings::getValueByKey(PbxSettings::SSH_DISABLE_SSH_PASSWORD);

    $echo     = Util::which('echo');
    $chpasswd = Util::which('chpasswd');
    $passwd   = Util::which('passwd');
    Processes::mwExec("$passwd -l www");
    if ($disablePassLogin === '1') {
        Processes::mwExec("$passwd -l $sshLogin");
        Processes::mwExec("$passwd -l root");
    } elseif ($sshLogin === 'root') {
        Processes::mwExec("$echo '$sshLogin:$password' | $chpasswd");
    } else {
        Processes::mwExec("$passwd -l root");
        Processes::mwExec("$echo '$sshLogin:$password' | $chpasswd");
    }

    // Security hash check and notification
    $currentHash = md5_file('/etc/shadow');
    PbxSettings::setValueByKey(PbxSettings::SSH_PASSWORD_HASH_FILE, $currentHash);
    if ($hashString !== md5($password)) {
        PbxSettings::setValueByKey(PbxSettings::SSH_PASSWORD_HASH_STRING, md5($password));
    }
}
```

**Key insight for refactoring:** The current code uses `chpasswd` without flags, which expects plain text. After refactoring, we need to use `chpasswd -e` which accepts pre-hashed passwords in crypt format:
```php
// NEW approach:
Processes::mwExec("$echo '$sshLogin:$hashedPassword' | $chpasswd -e");
```

#### 4. Cloud Provisioning Systems

The cloud provisioning system handles SSH passwords through multiple providers. The base class and key implementations:

**CloudProvider.php** (`src/Core/System/CloudProvisioning/CloudProvider.php`):

The `updateSSHCredentials()` method (lines 195-202) currently generates a random SSH password:
```php
protected function updateSSHCredentials(string $sshLogin, string $hashSalt): void
{
    $ifconfigOutput = shell_exec(Util::which('ifconfig'));
    $data = md5(($ifconfigOutput ?? '') . $hashSalt . time());
    $this->updatePbxSettings(PbxSettings::SSH_LOGIN, $sshLogin);
    $this->updatePbxSettings(PbxSettings::SSH_PASSWORD, $data);
    $this->updatePbxSettings(PbxSettings::SSH_DISABLE_SSH_PASSWORD, '1');
}
```

The `applyConfigDirect()` method (lines 714-795) applies SSH credentials using direct SQLite queries:
```php
// Apply SSH credentials
if ($config->sshLogin !== null && $config->instanceId !== null) {
    $ifconfigOutput = shell_exec(Util::which('ifconfig'));
    $sshPassword = md5(($ifconfigOutput ?? '') . $config->instanceId . time());
    $this->updatePbxSettingsDirect(PbxSettings::SSH_LOGIN, $config->sshLogin);
    $this->updatePbxSettingsDirect(PbxSettings::SSH_PASSWORD, $sshPassword);
    $this->updatePbxSettingsDirect(PbxSettings::SSH_DISABLE_SSH_PASSWORD, '1');
}
```

**ProvisioningConfig.php** (`src/Core/System/CloudProvisioning/ProvisioningConfig.php`):

This DTO currently does NOT have an SSH password field - it only has `$sshKeys` and `$sshLogin`. The SSH password is auto-generated during provisioning, not passed from user-data. This simplifies our refactoring as we only need to ensure the auto-generated password is immediately hashed.

**DockerCloud.php** and **LxcCloud.php** - Both use the base class methods and don't have special SSH password handling.

#### 5. Email Notifications

**SshPasswordChangedNotificationBuilder.php** (`src/Core/System/Mail/Builders/SshPasswordChangedNotificationBuilder.php`):

This class builds email notifications when SSH password changes. It accesses the password for inclusion in the email. After refactoring, we will NOT be able to include the password in emails since we won't have the plain text.

**NotificationQueueHelper.php** (`src/Core/System/Mail/NotificationQueueHelper.php`):

The helper checks if SSH password was changed and queues notifications. The notification logic is triggered from `ProcessPBXSettings.php` when `SSH_PASSWORD` setting changes.

#### 6. Security Check Workers

**ProcessPBXSettings.php** (`src/Core/Workers/Libs/WorkerModelsEvents/ProcessPBXSettings.php`):

Handles SSH-related settings changes (lines 388-395):
```php
$tables[] = [
    'keys' => [
        PbxSettings::SSH_PASSWORD_HASH_STRING,
        PbxSettings::SSH_PASSWORD,
        PbxSettings::SSH_PASSWORD_HASH_FILE,
        PbxSettings::WEB_ADMIN_PASSWORD,
        PbxSettings::PBX_FIREWALL_ENABLED,
    ],
    // ... triggers ReloadAdviceAction
];
```

**CheckSSHConfig.php** (`src/Core/Workers/Libs/WorkerPrepareAdvice/CheckSSHConfig.php`):

Checks for password tampering by comparing hashes (lines 43-52):
```php
$password   = PbxSettings::getValueByKey(PbxSettings::SSH_PASSWORD, false);
$hashString = PbxSettings::getValueByKey(PbxSettings::SSH_PASSWORD_HASH_STRING, false);
$hashFile   = PbxSettings::getValueByKey(PbxSettings::SSH_PASSWORD_HASH_FILE, false);
if($hashString !== md5($password)){
    // The password has been changed in an unusual way.
    $messages['error'][] = ['messageTpl'=>'adv_SSHPasswordMismatchStringsHash'];
}
```

**Key insight:** After refactoring, `SSH_PASSWORD_HASH_STRING` becomes redundant since we'll store the hash directly in `SSH_PASSWORD`. The change detection can compare the hash directly.

#### 7. WEB_ADMIN_PASSWORD Pattern (Reference Implementation)

The web admin password already uses secure hashing via Phalcon Security:

In `SaveSettingsAction.php` (lines 484-498):
```php
case PbxSettings::WEB_ADMIN_PASSWORD:
    if ($data[$key] !== GeneralSettingsEditForm::HIDDEN_PASSWORD) {
        // User changed Web password
        $newValue = $security->hash($data[$key]);
    } elseif (/* sync conditions */) {
        $newValue = $security->hash($data[PbxSettings::SSH_PASSWORD]);
    } else {
        continue 2;
    }
    break;
```

**CredentialsValidator.php** (`src/Common/Library/Auth/CredentialsValidator.php`):

Used to verify passwords against stored hashes for web authentication.

#### 8. Migration File Location

**UpdateConfigsUpToVer20250114.php** (`src/Core/System/Upgrade/Releases/UpdateConfigsUpToVer20250114.php`):

This is the migration file that will need to handle the transition from plain text to hashed storage. Example from `UpdateConfigsUpToVer100.php` (lines 49-56):
```php
$newPasswordSsh = Sip::generateSipPassword();
PbxSettings::setValueByKey(PbxSettings::SSH_PASSWORD, $newPasswordSsh);
PbxSettings::setValueByKey(PbxSettings::SSH_PASSWORD_HASH_STRING, md5($newPasswordSsh));
PbxSettings::setValueByKey(PbxSettings::SSH_DISABLE_SSH_PASSWORD, '1');
```

### Technical Reference Details

#### SHA-512 Crypt Format

The `chpasswd -e` command expects passwords in crypt(3) format. For SHA-512:
```
$6$rounds=5000$randomsalt$base64hash
```

PHP generation:
```php
function generateSha512Hash(string $password): string {
    $salt = bin2hex(random_bytes(8)); // 16 char salt
    return crypt($password, '$6$rounds=5000$' . $salt . '$');
}
```

#### Files to Modify

1. **Constants/Defaults:**
   - `src/Common/Models/PBXSettings/PbxSettingsConstantsTrait.php`
   - `src/Common/Models/PBXSettings/PbxSettingsDefaultValuesTrait.php`

2. **REST API:**
   - `src/PBXCoreREST/Lib/GeneralSettings/SaveSettingsAction.php`
   - `src/PBXCoreREST/Lib/GeneralSettings/DataStructure.php`

3. **System Configuration:**
   - `src/Core/System/Configs/SSHConf.php` (updateShellPassword method)

4. **Cloud Provisioning:**
   - `src/Core/System/CloudProvisioning/CloudProvider.php`
   - All providers that call updateSSHCredentials or applyConfigDirect

5. **Email Notifications:**
   - `src/Core/System/Mail/Builders/SshPasswordChangedNotificationBuilder.php`

6. **Security Workers:**
   - `src/Core/Workers/Libs/WorkerPrepareAdvice/CheckSSHConfig.php`

7. **Migration:**
   - `src/Core/System/Upgrade/Releases/UpdateConfigsUpToVer20250114.php`

#### Key Decision Points

1. **SSH_PASSWORD_HASH_STRING Deprecation:**
   - This field becomes redundant since SSH_PASSWORD will itself store the hash
   - Change detection can compare hashes directly
   - Consider removing in future version, keep for backward compatibility initially

2. **Password Synchronization:**
   - When syncing SSH and Web passwords, both get hashed independently
   - SSH uses SHA-512/crypt, Web uses bcrypt/Phalcon Security
   - Plain text needed only during initial input, never stored

3. **Email Notification Changes:**
   - Cannot include password in emails after refactoring
   - Modify notification to inform user that password was changed (without showing it)
   - Alternative: Show password only on first set during provisioning (before hashing)

4. **Provisioning Behavior:**
   - Auto-generated passwords during cloud provisioning are immediately hashed
   - User-provided passwords (if ever added to ProvisioningConfig) hash before storage

## User Notes
- Proxmox использует SHA-512 (`$6$`) для LXC контейнеров
- BusyBox chpasswd поддерживает `-e` флаг для готовых хэшей
- WEB_ADMIN_PASSWORD уже хранится как Phalcon bcrypt хэш
- Миграция при апгрейде: `src/Core/System/Upgrade/Releases/UpdateConfigsUpToVer20250114.php`

## Work Log
- [2025-12-30] Создана задача, исследование текущей архитектуры
