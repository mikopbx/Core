# MikoPBX Release Change Log
**Период / Period: May 2024 — February 2026**

---

## 🇷🇺 Русская версия

### 🔥 Критические обновления платформы

#### Переход на PHP 8.4 и Phalcon 5.8
- Полная миграция кодовой базы на PHP 8.4
- Обновление до Phalcon Framework 5.8
- Интеграция PHPStan для статического анализа кода
- Исправление ошибок совместимости и типизации

#### Полностью переработанный REST API v3
- **Новая архитектура**: Миграция всех контроллеров на RESTful v3
- **OpenAPI 3.1.0**: Полная спецификация с интерактивной документацией Stoplight Elements
- **JWT аутентификация**: Bearer токены с автообновлением
- **ACL авторизация**: Гранулярные права доступа в REST API middleware
- **Унифицированные API клиенты**: JavaScript классы для всех ресурсов (ExtensionsAPI, CDRApi, ProvidersAPI и др.)
- **Атрибуты для публичных endpoints**: Декларативное определение маршрутов

---

### 🔐 Безопасность и авторизация

#### Passkeys (WebAuthn) — Вход без пароля
- Управление Passkeys для безпарольной аутентификации
- JWT аутентификация с поддержкой WebAuthn
- Безопасное хранение ключей в формате FIDO2

#### JWT и управление сессиями
- Полный переход с cookie на JWT Bearer токены
- Автоматическое обновление токенов
- Валидация hostname и SSL сертификатов
- Интеграция TokenManager со Stoplight Elements

#### Гранулярные права API ключей
- Детальные разрешения для каждого API endpoint
- Визуальный редактор прав в веб-интерфейсе
- ACL фильтрация в DataTable с server-side интеграцией

#### Усиленная защита
- GeoIP2 интеграция для определения страны IP-адресов
- Мониторинг и визуализация заблокированных IP
- Rate limiting с настройкой в Nginx
- Аудит событий аутентификации
- Мониторинг роста логов безопасности
- SHA-512 хеши для хранения паролей (WEB/SSH)
- Защита от path traversal в CDR endpoints
- Shell escaping и параметризованные запросы в DHCP callbacks

---

### 🌐 Сеть и IPv6

#### Полная поддержка IPv6
- **DHCPv6 клиент** с SLAAC fallback
- **Dual-stack firewall**: IPv4/IPv6 правила
- IPv6 в nginx, DNS, всех сетевых интерфейсах
- Корректные примеры IPv6 адресов в формах

#### Статические маршруты
- Новый интерфейс управления статическими маршрутами
- REST API для маршрутов
- Миграция базы данных

#### Улучшения сетевого стека
- Унифицированный UI для Docker и обычных установок
- Динамическое обновление IP в консольном меню
- Hostname и domain в конфигурации сети

---

### 🐳 Контейнеры и облако

#### Полная поддержка LXC (Proxmox)
- LxcCloud провайдер для автоконфигурации
- DHCP клиенты (IPv4/IPv6) в LXC
- Провижининг из /etc/shadow (SSH ключи, пароли)
- Searchdomain из Proxmox и DHCP
- Shell-хелперы для определения типа контейнера
- Корректный вывод в консоль Proxmox

#### Унифицированный Cloud Provisioning
- **9 облачных провайдеров**: AWS, Google Cloud, Azure, Yandex, DigitalOcean, Vultr, VK Cloud, Alibaba, NoCloud
- Поддержка user-data (cloud-init формат YAML/JSON)
- Утилита `pbx-cloud-init` для управления
- SSRF и SQL injection защита

#### QEMU Guest Agent
- Поддержка для KVM-based облачных окружений

---

### 📞 Телефония и SIP

#### Asterisk REST Interface (ARI)
- Полная реализация управления ARI
- Интеграция с AMI/AJAM
- Автоматическая перезагрузка при изменениях

#### IAX Транки
- Комплексная поддержка IAX транков
- Аутентификация и Fail2ban интеграция
- Network filters для провайдеров

#### Улучшения SIP провайдеров
- Автоматический выбор транспортного протокола
- Валидация транскодинга кодеков
- Динамическая загрузка модулей кодеков из БД
- CallerID и DID манипуляция для провайдеров
- История и детали регистрации провайдера
- Username-based аутентификация для inbound провайдеров

---

### 🎵 Аудио и записи

#### S3 облачное хранилище
- Синхронизация записей в S3
- Автоочистка по PBXRecordSavePeriod
- Статус синхронизации и статистика через API
- Кэширование в Redis

#### Конвертация форматов
- Фоновый воркер WAV → WebM/Opus
- Конвертация "на лету" при скачивании CDR
- Поддержка MP3 для звуковых файлов
- Стерео микширование для ASR
- Замена SOX на ffmpeg

---

### 📧 Email и уведомления

#### OAuth2 для почты
- Microsoft 365, Yandex, Gmail
- Callback page для авторизации
- Диагностика ошибок OAuth2

#### Система уведомлений
- Builder pattern для email уведомлений
- Уведомления о входе в админ-панель
- Гранулярные типы уведомлений
- WorkerNotifyByEmail для централизованной отправки
- HTML шаблоны писем

---

### 🖥️ Консольный интерфейс (ESXi-style)

- Полноэкранный баннер с ASCII логотипом
- Системные метрики в реальном времени
- Последний вход и uptime
- Проверка целостности системы
- Поддержка кириллицы
- Framebuffer 1152x864
- Динамическое обновление IP

---

### 🌍 Локализация

#### Система языковых пакетов
- Поддержка модулей языковых пакетов
- Восстановление звуков при отключении
- Автокопирование языков
- Приоритет DNS по языку системы

#### Переводы
- 29 языков
- Полные переводы UI (983 ключа)
- Переводы REST API сообщений
- Переводы Stoplight Elements

---

### 📊 Интерфейс и UX

#### Bulk операции
- CSV импорт/экспорт сотрудников
- Массовая загрузка внутренних номеров
- Стратегии обновления при импорте

#### Копирование записей
- Копирование IVR меню, очередей, конференций
- Копирование Asterisk managers

#### Улучшения таблиц
- Миграция DataTable на ES6
- Server-side ACL интеграция
- Retry механизм для AJAX запросов

#### Другие улучшения
- Интерактивные тултипы в настройках
- Визуализация использования хранилища
- Tree view для логов
- Флаги стран в истории устройств
- Password виджет с clipboard feedback

---

### 🔧 Система и загрузка

#### Улучшения прошивки
- Надёжная цепочка sgdisk/gdisk fallback
- Диагностическая пауза перед восстановлением
- Ручной режим обновления
- Синхронизация буферов диска

#### Загрузка
- Предотвращение сбоя на VMware без serial console
- Timing всех этапов загрузки
- Unified environment detection
- Корректная обработка флага booting для контейнеров

#### SSL сертификаты
- Валидация с OpenSSL
- Перегенерация при смене hostname
- Унифицированный сервис управления

---

### 📈 Производительность

- Кэширование использования хранилища в Redis
- Параллельные команды du
- Оптимизация запуска S3 workers
- SQLite WAL mode и оптимизация concurrency
- Предотвращение 99% CPU в WorkerSoundFilesInit
- Удаление DNS resolution из SIP context ID

---

## 🇬🇧 English Version

### 🔥 Critical Platform Updates

#### Migration to PHP 8.4 and Phalcon 5.8
- Complete codebase migration to PHP 8.4
- Upgrade to Phalcon Framework 5.8
- PHPStan integration for static code analysis
- Compatibility and typing fixes

#### Completely Redesigned REST API v3
- **New Architecture**: All controllers migrated to RESTful v3
- **OpenAPI 3.1.0**: Complete spec with interactive Stoplight Elements docs
- **JWT Authentication**: Bearer tokens with auto-refresh
- **ACL Authorization**: Granular permissions in REST API middleware
- **Unified API Clients**: JavaScript classes for all resources (ExtensionsAPI, CDRApi, ProvidersAPI, etc.)
- **Attribute-based Public Endpoints**: Declarative route definition

---

### 🔐 Security and Authorization

#### Passkeys (WebAuthn) — Passwordless Login
- Passkeys management for passwordless authentication
- JWT authentication with WebAuthn support
- Secure FIDO2 key storage

#### JWT and Session Management
- Complete migration from cookies to JWT Bearer tokens
- Automatic token refresh
- Hostname and SSL certificate validation
- TokenManager integration with Stoplight Elements

#### Granular API Key Permissions
- Detailed permissions for each API endpoint
- Visual permissions editor in web interface
- ACL filtering in DataTable with server-side integration

#### Enhanced Protection
- GeoIP2 integration for IP country detection
- Banned IP monitoring and visualization
- Rate limiting with Nginx configuration
- Authentication event audit logging
- Security log growth monitoring
- SHA-512 hashes for password storage (WEB/SSH)
- Path traversal protection in CDR endpoints
- Shell escaping and parameterized queries in DHCP callbacks

---

### 🌐 Network and IPv6

#### Complete IPv6 Support
- **DHCPv6 client** with SLAAC fallback
- **Dual-stack firewall**: IPv4/IPv6 rules
- IPv6 in nginx, DNS, all network interfaces
- Proper IPv6 address examples in forms

#### Static Routes
- New static routes management interface
- REST API for routes
- Database migration

#### Network Stack Improvements
- Unified UI for Docker and regular installations
- Dynamic IP refresh in console menu
- Hostname and domain in network configuration

---

### 🐳 Containers and Cloud

#### Full LXC Support (Proxmox)
- LxcCloud provider for auto-configuration
- DHCP clients (IPv4/IPv6) in LXC
- Provisioning from /etc/shadow (SSH keys, passwords)
- Searchdomain from Proxmox and DHCP
- Shell helpers for container type detection
- Proper Proxmox console output

#### Unified Cloud Provisioning
- **9 Cloud Providers**: AWS, Google Cloud, Azure, Yandex, DigitalOcean, Vultr, VK Cloud, Alibaba, NoCloud
- User-data support (cloud-init YAML/JSON format)
- `pbx-cloud-init` management utility
- SSRF and SQL injection protection

#### QEMU Guest Agent
- Support for KVM-based cloud environments

---

### 📞 Telephony and SIP

#### Asterisk REST Interface (ARI)
- Complete ARI management implementation
- AMI/AJAM integration
- Automatic reload on changes

#### IAX Trunks
- Comprehensive IAX trunk support
- Authentication and Fail2ban integration
- Network filters for providers

#### SIP Provider Improvements
- Automatic transport protocol selection
- Codec transcoding validation
- Dynamic codec module loading from database
- CallerID and DID manipulation for providers
- Provider registration history and details
- Username-based authentication for inbound providers

---

### 🎵 Audio and Recordings

#### S3 Cloud Storage
- Recording synchronization to S3
- Auto-cleanup by PBXRecordSavePeriod
- Sync status and statistics via API
- Redis caching

#### Format Conversion
- Background worker WAV → WebM/Opus
- On-the-fly conversion for CDR download
- MP3 support for sound files
- Stereo mixing for ASR
- SOX replaced with ffmpeg

---

### 📧 Email and Notifications

#### OAuth2 for Email
- Microsoft 365, Yandex, Gmail
- Authorization callback page
- OAuth2 error diagnostics

#### Notification System
- Builder pattern for email notifications
- Admin panel login notifications
- Granular notification types
- WorkerNotifyByEmail for centralized sending
- HTML email templates

---

### 🖥️ Console Interface (ESXi-style)

- Fullscreen banner with ASCII logo
- Real-time system metrics
- Last login and uptime
- System integrity check
- Cyrillic font support
- Framebuffer 1152x864
- Dynamic IP refresh

---

### 🌍 Localization

#### Language Pack System
- Language pack module support
- Sound restoration on disable
- Auto-copy languages
- DNS priority by system language

#### Translations
- 29 languages
- Complete UI translations (983 keys)
- REST API message translations
- Stoplight Elements translations

---

### 📊 Interface and UX

#### Bulk Operations
- CSV employee import/export
- Bulk extension upload
- Import update strategies

#### Record Copying
- Copy IVR menus, queues, conferences
- Copy Asterisk managers

#### Table Improvements
- DataTable migration to ES6
- Server-side ACL integration
- Retry mechanism for AJAX requests

#### Other Improvements
- Interactive tooltips in settings
- Storage usage visualization
- Tree view for logs
- Country flags in device history
- Password widget with clipboard feedback

---

### 🔧 System and Boot

#### Firmware Improvements
- Robust sgdisk/gdisk fallback chain
- Diagnostic pause before restore
- Manual upgrade mode
- Disk buffer sync

#### Boot
- Prevent failure on VMware without serial console
- Timing for all boot stages
- Unified environment detection
- Correct booting flag handling for containers

#### SSL Certificates
- OpenSSL validation
- Regeneration on hostname change
- Unified management service

---

### 📈 Performance

- Storage usage caching in Redis
- Parallel du commands
- S3 workers startup optimization
- SQLite WAL mode and concurrency optimization
- Prevent 99% CPU in WorkerSoundFilesInit
- Remove DNS resolution from SIP context ID
