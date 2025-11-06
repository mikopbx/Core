# S3 Cloud Storage for Call Recordings

## English Description

### Overview

Implements S3-compatible cloud storage as an alternative to local disk storage for call recordings in MikoPBX. This feature provides a transparent storage layer that seamlessly handles both local and cloud-based recordings, with automatic upload, caching, and lifecycle management.

### Current Implementation Status

#### ✅ Core Features Implemented

1. **Storage Abstraction Layer (StorageAdapter)**
   - Transparent access to recordings regardless of storage location (local/S3)
   - Automatic download from S3 to local cache when recordings are accessed
   - Smart caching with configurable size limits (default: 500MB)
   - LRU (Least Recently Used) cache eviction strategy

2. **Background Workers**
   - `WorkerS3Upload`: Monitors local recordings and uploads to S3 based on retention settings
   - `WorkerS3CacheCleaner`: Manages cache size with automated cleanup (runs hourly)
   - Graceful restart support with state persistence in Redis

3. **REST API Endpoints** (`/pbxcore/api/v3/s3-storage`)
   - Get S3 settings: `GET /s3-storage`
   - Update S3 configuration: `POST /s3-storage`
   - Test S3 connection: `POST /s3-storage:test-connection`
   - OpenAPI 3.1 specification with full schema documentation

4. **Admin Web Interface**
   - Separate configuration forms for local retention and S3 settings
   - Real-time S3 connection testing with detailed error messages
   - Integration with existing storage management UI
   - Responsive design with Fomantic-UI components

5. **CDR Integration**
   - Seamless playback of recordings from both local and S3 storage
   - Download functionality works transparently
   - Automatic fallback to cache if S3 connection fails
   - Support for inline viewing and forced download modes

6. **Storage Statistics**
   - Dedicated S3 cache category in storage usage statistics
   - Real-time monitoring of cache size and usage
   - Integration with existing storage monitoring tools

#### 🔧 Technical Details

**New Components:**
- `src/Core/System/Storage/S3Client.php` - AWS S3 SDK integration
- `src/Core/System/Storage/StorageAdapter.php` - Unified storage access layer
- `src/Core/Workers/WorkerS3Upload.php` - Background upload worker
- `src/Core/Workers/WorkerS3CacheCleaner.php` - Cache management worker
- `src/PBXCoreREST/Controllers/S3Storage/RestController.php` - REST API controller
- `src/Common/Models/RecordingStorage.php` - S3 configuration model
- `src/Common/Models/StorageSettings.php` - Retention settings model

**Modified Components:**
- `src/Core/System/Storage.php` - Added S3 cache category to statistics
- `src/PBXCoreREST/Lib/Cdr/PlaybackAction.php` - S3 support for playback
- `src/PBXCoreREST/Lib/Cdr/DownloadRecordAction.php` - S3 support for downloads
- Admin Cabinet forms and JavaScript components

**Configuration:**
- Cache directory: `/mountpoint/mikopbx/tmp/recordings_cache`
- Default cache size: 500MB (reduced from 5GB)
- Cache cleanup: Runs every hour, targets 80% of max size
- Upload worker: Runs every 5 minutes, processes based on retention settings

#### 📊 Key Metrics

- **47 files changed** in initial implementation
- **6,130 additions, 1,100 deletions**
- **Full test coverage** with `test_22_storage_s3_settings.py`
- **S3-compatible services supported**: AWS S3, MinIO, DigitalOcean Spaces, Wasabi, etc.

### Recent Enhancements

#### Latest Changes (2025-11-06)

1. **Reduced S3 cache size**
   - Changed from 5GB to 500MB for better resource management
   - Optimized for typical use cases with frequent access patterns

2. **Enhanced storage statistics**
   - Added dedicated `s3_cache` category to storage usage breakdown
   - Real-time monitoring of S3 cache size and percentage
   - Integration with existing storage monitoring dashboard

3. **Improved CDR integration**
   - Enhanced DataStructure with view parameter support
   - Better error handling for S3 playback operations
   - Optimized cache hit ratio for frequently accessed recordings

4. **UI/UX improvements**
   - Updated translations (English and Russian)
   - Improved S3 configuration form validation
   - Better error messages for connection issues

### Benefits

1. **Cost Savings**
   - Reduce local storage requirements by 80-90%
   - Pay only for cloud storage used
   - Lower hardware costs for small businesses

2. **Scalability**
   - Virtually unlimited storage capacity
   - No need to provision additional disks
   - Automatic scaling with business growth

3. **Reliability**
   - Geographic redundancy with S3 bucket replication
   - 99.999999999% durability (11 nines) with AWS S3
   - Protection against local disk failures

4. **Compliance**
   - Long-term retention without local storage limits
   - Configurable retention policies per region/compliance needs
   - Audit trail with S3 access logs

5. **Performance**
   - Smart caching ensures fast access to recent recordings
   - LRU eviction keeps frequently accessed files local
   - Minimal impact on CDR playback performance

### Use Cases

- **Small Businesses**: Reduce hardware costs while maintaining compliance
- **Call Centers**: Store millions of recordings without local disk constraints
- **Multi-tenant Environments**: Isolated S3 buckets per tenant
- **Disaster Recovery**: Automatic off-site backup of all recordings
- **Compliance Requirements**: Long-term retention (7+ years) without local storage

---

## Русское описание

### Обзор

Реализация S3-совместимого облачного хранилища как альтернативы локальному дисковому хранилищу для записей разговоров в MikoPBX. Функция обеспечивает прозрачный слой хранения, который бесшовно обрабатывает как локальные, так и облачные записи, с автоматической загрузкой, кешированием и управлением жизненным циклом.

### Текущий статус реализации

#### ✅ Реализованные основные функции

1. **Слой абстракции хранилища (StorageAdapter)**
   - Прозрачный доступ к записям независимо от местоположения хранилища (локальное/S3)
   - Автоматическая загрузка из S3 в локальный кеш при обращении к записям
   - Умное кеширование с настраиваемыми ограничениями размера (по умолчанию: 500МБ)
   - Стратегия вытеснения кеша LRU (Least Recently Used)

2. **Фоновые воркеры**
   - `WorkerS3Upload`: Отслеживает локальные записи и загружает в S3 на основе настроек хранения
   - `WorkerS3CacheCleaner`: Управляет размером кеша с автоматической очисткой (запускается ежечасно)
   - Поддержка graceful restart с сохранением состояния в Redis

3. **REST API endpoints** (`/pbxcore/api/v3/s3-storage`)
   - Получение настроек S3: `GET /s3-storage`
   - Обновление конфигурации S3: `POST /s3-storage`
   - Тестирование подключения S3: `POST /s3-storage:test-connection`
   - Спецификация OpenAPI 3.1 с полной документацией схемы

4. **Административный веб-интерфейс**
   - Отдельные формы конфигурации для локального хранения и настроек S3
   - Тестирование подключения S3 в реальном времени с подробными сообщениями об ошибках
   - Интеграция с существующим UI управления хранилищем
   - Адаптивный дизайн с компонентами Fomantic-UI

5. **Интеграция с CDR**
   - Бесшовное воспроизведение записей как из локального, так и из S3 хранилища
   - Функция скачивания работает прозрачно
   - Автоматический возврат к кешу при сбое подключения S3
   - Поддержка режимов inline просмотра и принудительного скачивания

6. **Статистика хранилища**
   - Выделенная категория S3 кеша в статистике использования хранилища
   - Мониторинг размера и использования кеша в реальном времени
   - Интеграция с существующими инструментами мониторинга хранилища

#### 🔧 Технические детали

**Новые компоненты:**
- `src/Core/System/Storage/S3Client.php` - Интеграция AWS S3 SDK
- `src/Core/System/Storage/StorageAdapter.php` - Унифицированный слой доступа к хранилищу
- `src/Core/Workers/WorkerS3Upload.php` - Фоновый воркер загрузки
- `src/Core/Workers/WorkerS3CacheCleaner.php` - Воркер управления кешем
- `src/PBXCoreREST/Controllers/S3Storage/RestController.php` - REST API контроллер
- `src/Common/Models/RecordingStorage.php` - Модель конфигурации S3
- `src/Common/Models/StorageSettings.php` - Модель настроек хранения

**Модифицированные компоненты:**
- `src/Core/System/Storage.php` - Добавлена категория S3 кеша в статистику
- `src/PBXCoreREST/Lib/Cdr/PlaybackAction.php` - Поддержка S3 для воспроизведения
- `src/PBXCoreREST/Lib/Cdr/DownloadRecordAction.php` - Поддержка S3 для скачивания
- Формы административной панели и JavaScript компоненты

**Конфигурация:**
- Директория кеша: `/mountpoint/mikopbx/tmp/recordings_cache`
- Размер кеша по умолчанию: 500МБ (уменьшен с 5ГБ)
- Очистка кеша: Запускается каждый час, целевой размер 80% от максимума
- Воркер загрузки: Запускается каждые 5 минут, обрабатывает на основе настроек хранения

#### 📊 Ключевые метрики

- **47 файлов изменено** в начальной реализации
- **6 130 добавлений, 1 100 удалений**
- **Полное покрытие тестами** с `test_22_storage_s3_settings.py`
- **Поддерживаемые S3-совместимые сервисы**: AWS S3, MinIO, DigitalOcean Spaces, Wasabi и др.

### Последние улучшения

#### Последние изменения (2025-11-06)

1. **Уменьшен размер кеша S3**
   - Изменен с 5ГБ на 500МБ для лучшего управления ресурсами
   - Оптимизирован для типичных сценариев с частыми паттернами доступа

2. **Улучшена статистика хранилища**
   - Добавлена выделенная категория `s3_cache` в разбивку использования хранилища
   - Мониторинг размера и процента использования S3 кеша в реальном времени
   - Интеграция с существующей панелью мониторинга хранилища

3. **Улучшена интеграция с CDR**
   - Улучшена DataStructure с поддержкой параметра view
   - Лучшая обработка ошибок для операций воспроизведения S3
   - Оптимизирован коэффициент попадания в кеш для часто используемых записей

4. **Улучшения UI/UX**
   - Обновлены переводы (английский и русский)
   - Улучшена валидация формы конфигурации S3
   - Лучшие сообщения об ошибках при проблемах с подключением

### Преимущества

1. **Экономия затрат**
   - Снижение требований к локальному хранилищу на 80-90%
   - Оплата только за используемое облачное хранилище
   - Меньшие затраты на оборудование для малого бизнеса

2. **Масштабируемость**
   - Практически неограниченная емкость хранилища
   - Не нужно выделять дополнительные диски
   - Автоматическое масштабирование с ростом бизнеса

3. **Надежность**
   - Географическая избыточность с репликацией S3 bucket
   - 99.999999999% долговечности (11 девяток) с AWS S3
   - Защита от сбоев локальных дисков

4. **Соответствие требованиям**
   - Долгосрочное хранение без ограничений локального хранилища
   - Настраиваемые политики хранения для каждого региона/требований соответствия
   - Аудит с логами доступа S3

5. **Производительность**
   - Умное кеширование обеспечивает быстрый доступ к недавним записям
   - LRU вытеснение сохраняет часто используемые файлы локально
   - Минимальное влияние на производительность воспроизведения CDR

### Сценарии использования

- **Малый бизнес**: Снижение затрат на оборудование с соблюдением требований
- **Колл-центры**: Хранение миллионов записей без ограничений локального диска
- **Мультитенантные среды**: Изолированные S3 bucket для каждого арендатора
- **Disaster Recovery**: Автоматическое резервное копирование всех записей за пределами площадки
- **Требования соответствия**: Долгосрочное хранение (7+ лет) без локального хранилища

---

### Labels

`enhancement`, `feature`, `storage`, `cloud`, `s3`, `recordings`, `api`, `workers`

### Milestone

**v3.0.0** - Major feature release with S3 storage support

---

### Related Documentation

- [REST API Development Guide](/src/PBXCoreREST/CLAUDE.md)
- [Worker Development Guide](/src/Core/Workers/CLAUDE.md)
- [Storage System Documentation](/src/Core/System/Storage.php)

### Testing

Full test suite available in `tests/api/test_22_storage_s3_settings.py`:
- S3 settings CRUD operations
- Connection testing
- Upload workflow
- Cache management
- CDR playback integration

---

**Branch**: `s3-records-storage`
**Initial commit**: `252416b7f` (2025-11-05)
**Latest changes**: Cache optimization and storage statistics enhancement (2025-11-06)
