# Email Notification Centralization - Implementation Summary

## Overview

Централизовали систему email-уведомлений через `WorkerNotifyByEmail` для улучшения производительности, надежности и масштабируемости.

## Изменения в архитектуре

### До рефакторинга:
- ✅ MISSED_CALL → WorkerNotifyByEmail (async)
- ✅ LOGIN_NOTIFICATION → WorkerNotifyByEmail (async)
- ❌ SYSTEM_PROBLEMS → Прямая синхронная отправка
- ❌ SSH_PASSWORD_CHANGED → Прямая синхронная отправка
- ❌ DISK_SPACE_WARNING → Прямая синхронная отправка
- ❌ VOICEMAIL → Отдельный скрипт, блокирует Asterisk

### После рефакторинга:
- ✅ **ВСЕ ТИПЫ** → WorkerNotifyByEmail (async через Beanstalk queue)

## Новые компоненты

### 1. NotificationQueueHelper
**Файл:** `src/Core/System/Mail/NotificationQueueHelper.php`

Централизованный helper для постановки уведомлений в очередь:

```php
// Автоматический выбор приоритета
NotificationQueueHelper::queueAuto($builder);

// Ручной выбор приоритета
NotificationQueueHelper::queueOrSend(
    $builder,
    async: true,
    priority: NotificationQueueHelper::PRIORITY_CRITICAL
);
```

**Приоритеты:**
- `PRIORITY_CRITICAL` (100) - SSH password, system problems
- `PRIORITY_HIGH` (512) - Disk space warnings
- `PRIORITY_NORMAL` (1024) - Login, missed calls
- `PRIORITY_LOW` (2048) - Voicemail, SMTP tests

### 2. VoicemailNotificationBuilder
**Файл:** `src/Core/System/Mail/Builders/VoicemailNotificationBuilder.php`

Новый builder для voicemail уведомлений с поддержкой attachment.

### 3. Serialization методы
Добавлены в `AbstractNotificationBuilder` и все concrete builders:
- `toArray()` - сериализация для очереди
- `fromArray()` - десериализация из очереди

## Измененные компоненты

### Worker and Services

#### WorkerNotifyByEmail
- Добавлен `handleTypedNotification()` для обработки новых типов
- Поддержка attachments для voicemail
- Автоматическая очистка временных файлов

#### Email NotificationService
- Добавлен параметр `$attachmentFile` в `sendNotification()`
- Поддержка вложений для voicemail

### Migrated Components

#### WorkerNotifyAdministrator
```php
// Было:
$emailService->sendNotification($builder);

// Стало:
NotificationQueueHelper::queueOrSend($builder, async: true, priority: PRIORITY_CRITICAL);
```

#### CheckSSHConfig
Мигрирован на async очередь с критическим приоритетом.

#### CheckStorage
Мигрирован на async очередь с высоким приоритетом.

#### voicemail-sender
**КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ** - максимальное улучшение производительности Asterisk:

```php
// Было: Синхронная отправка, блокирует Asterisk
$notify->sendMail($toMails, $subject, $message, $recordingFile);

// Стало: Асинхронная очередь, Asterisk продолжает работу немедленно
foreach ($recipients as $recipient) {
    $builder = new VoicemailNotificationBuilder();
    // ... настройка builder
    NotificationQueueHelper::queueOrSend($builder, async: true, priority: PRIORITY_LOW);
}
// Exit immediately - Asterisk is free!
```

## Преимущества

### 1. Производительность
- **Asterisk не блокируется** на SMTP соединении при voicemail
- **Воркеры проверки** (CheckSSHConfig, CheckStorage) не ждут отправки email
- **Параллельная обработка** - возможность запустить несколько инстансов WorkerNotifyByEmail

### 2. Надежность
- **Retry mechanism** через Beanstalk
- **Graceful degradation** - если SMTP недоступен, emails остаются в очереди
- **Fallback** - при недоступности очереди используется синхронная отправка

### 3. Масштабируемость
- **Worker pool** - можно добавить `public int $maxProc = 3` в WorkerNotifyByEmail
- **Приоритеты** - критичные уведомления обрабатываются первыми
- **Rate limiting** - контроль нагрузки на SMTP сервер

### 4. Мониторинг
- **Централизованное логирование** - все email через одну точку
- **Beanstalk console** - отслеживание очереди
- **Единые метрики** - упрощенный мониторинг

## Обратная совместимость

✅ **Полная обратная совместимость:**
- Legacy формат missed call notifications работает
- Legacy формат login notifications работает
- Fallback на синхронную отправку при недоступности очереди
- Старые методы `Notifications::sendMail()` не затронуты

## Производительность: До vs После

| Компонент | До | После | Выигрыш |
|-----------|-----|--------|---------|
| **Voicemail (Asterisk)** | Блокируется на 1-5 сек | Мгновенный возврат | ⚡ **Критично!** |
| **SSH Check** | Блокирует проверку | Не блокирует | ✅ Важно |
| **Disk Check** | Блокирует проверку | Не блокирует | ✅ Важно |
| **System Problems** | Блокирует воркер | Не блокирует | ✅ Важно |

## Тестирование

### Ручное тестирование

```bash
# 1. Проверить очередь Beanstalk
beanstalk-console

# 2. Отследить логи воркера
tail -f /var/log/mikopbx/system.log | grep WorkerNotifyByEmail

# 3. Симулировать voicemail (Asterisk продолжает работу немедленно)
# ... оставить voicemail ...

# 4. Проверить приоритеты
# Critical notifications должны обрабатываться первыми
```

### Автоматическое тестирование

PHPStan валидация всех измененных файлов (см. ниже).

## Файлы изменений

### Новые файлы:
- `src/Core/System/Mail/NotificationQueueHelper.php`
- `src/Core/System/Mail/Builders/VoicemailNotificationBuilder.php`

### Измененные файлы:
- `src/Core/Workers/WorkerNotifyByEmail.php` - обработка typed notifications
- `src/Core/System/Mail/EmailNotificationService.php` - поддержка attachments
- `src/Core/System/Mail/Builders/AbstractNotificationBuilder.php` - serialization
- `src/Core/System/Mail/Builders/SystemProblemsNotificationBuilder.php` - serialization
- `src/Core/System/Mail/Builders/DiskSpaceNotificationBuilder.php` - serialization
- `src/Core/System/Mail/Builders/SshPasswordChangedNotificationBuilder.php` - serialization
- `src/Core/Workers/WorkerNotifyAdministrator.php` - использует очередь
- `src/Core/Workers/Libs/WorkerPrepareAdvice/CheckSSHConfig.php` - использует очередь
- `src/Core/Workers/Libs/WorkerPrepareAdvice/CheckStorage.php` - использует очередь
- `src/Core/System/RootFS/sbin/voicemail-sender` - использует очередь

## Будущие улучшения

1. Реализовать недостающие NotificationType:
   - `SIP_CREDENTIALS` - при создании Extension
   - `SMTP_TEST` - уже есть builder, просто подключить
   - `SYSTEM_UPDATES` - при обнаружении обновлений

2. Добавить worker pool для WorkerNotifyByEmail:
   ```php
   public int $maxProc = 3; // 3 параллельных инстанса
   ```

3. Расширенная дедупликация для всех типов уведомлений

4. Метрики и dashboard для мониторинга

## Миграция для модулей

Если ваш модуль отправляет email уведомления, рекомендуется мигрировать на новую систему:

```php
// Старый способ (синхронный):
$notify = new Notifications();
$notify->sendMail($email, $subject, $body);

// Новый способ (асинхронный):
$builder = new YourNotificationBuilder();
$builder->setRecipient($email)
        ->setYourData($data);

NotificationQueueHelper::queueOrSend($builder, async: true);
```

## Авторы

- Architecture Design: Based on analysis of MikoPBX notification system
- Implementation: Claude Code Assistant
- Review: System автоматически через PHPStan
