# Python Tests Configuration Refactoring

## Обзор изменений

Рефакторинг Python тестов для устранения хардкода адресов, портов и прямой зависимости от Docker. Теперь тесты могут выполняться:

- ✅ **Локально** в Docker контейнерах (как раньше)
- ✅ **Удаленно** на виртуальных машинах через REST API
- ✅ **Удаленно** на виртуальных машинах через SSH
- ✅ **В облаке** (AWS, Azure, GCP) через REST API

## Что изменилось

### 1. Централизованная конфигурация

**Создан модуль `config.py`:**
- Единая точка входа для всех настроек
- Автоматическая валидация параметров
- Авто-определение режима выполнения

**Использование:**
```python
from config import get_config

config = get_config()
api_url = config.api_url
container = config.container_name
execution_mode = config.execution_mode
```

### 2. Удалены прямые вызовы Docker

**Было:**
```python
subprocess.run(['docker', 'exec', container_name, 'cat', '/etc/asterisk/pjsip.conf'])
subprocess.run(['docker', 'restart', container_name])
```

**Стало:**
```python
# Используем REST API (работает везде)
from conftest import read_file_from_container, execute_asterisk_command

config = read_file_from_container(api_client, '/etc/asterisk/pjsip.conf')
output = execute_asterisk_command(api_client, 'pjsip show endpoints')
```

### 3. Гибкие режимы выполнения

**Автоматическое определение:**
- `docker` - если найден локальный контейнер
- `api` - если API URL указывает на удаленный хост
- `ssh` - если указан MIKOPBX_SSH_HOST
- `local` - прямое выполнение (fallback)

**Принудительное указание:**
```bash
MIKOPBX_EXECUTION_MODE=api  # Использовать только REST API
```

### 4. Обновленные файлы

#### Рефакторинг:
- ✅ `config.py` - **новый** централизованный модуль конфигурации
- ✅ `conftest.py` - использует `config.py` вместо прямого чтения `.env`
- ✅ `helpers/cdr_seeder_remote.py` - убран хардкод, использует `TestConfig`
- ✅ `helpers/reboot_helper.py` - убран хардкод, использует `TestConfig`
- ✅ `test_config_01_all_provider_types.py` - заменены docker вызовы на REST API

#### Конфигурация:
- ✅ `.env` - обновлен с новыми параметрами
- ✅ `.env.example` - **новый** шаблон с документацией и примерами

## Конфигурация

### Минимальная конфигурация (.env)

```bash
# Обязательные параметры
MIKOPBX_API_URL=http://localhost:8189/pbxcore/api/v3
MIKOPBX_API_USERNAME=admin
MIKOPBX_API_PASSWORD=123456789MikoPBX#1
MIKOPBX_CONTAINER=mikopbx_php83
```

### Полная конфигурация

См. файл `.env.example` для всех доступных параметров и сценариев развертывания.

## Сценарии использования

### 1. Локальная разработка (Docker)

```bash
# .env
MIKOPBX_API_URL=http://localhost:8189/pbxcore/api/v3
MIKOPBX_API_USERNAME=admin
MIKOPBX_API_PASSWORD=123456789MikoPBX#1
MIKOPBX_CONTAINER=mikopbx_php83
```

**Поведение:**
- Режим выполнения: `docker` (auto)
- Команды выполняются через `docker exec`
- Самый быстрый вариант для разработки

### 2. Удаленная VM через REST API (рекомендуется)

```bash
# .env
MIKOPBX_API_URL=http://192.168.1.100:8081/pbxcore/api/v3
MIKOPBX_API_USERNAME=admin
MIKOPBX_API_PASSWORD=SecurePassword123!
```

**Поведение:**
- Режим выполнения: `api` (auto)
- Все команды через REST API `system:executeBashCommand`
- Не требует Docker или SSH на машине с тестами
- Идеален для CI/CD

### 3. Удаленная VM через SSH

```bash
# .env
MIKOPBX_API_URL=http://192.168.1.100:8081/pbxcore/api/v3
MIKOPBX_API_USERNAME=admin
MIKOPBX_API_PASSWORD=SecurePassword123!
MIKOPBX_SSH_HOST=192.168.1.100
MIKOPBX_SSH_USER=root
```

**Поведение:**
- Режим выполнения: `ssh` (auto)
- Команды выполняются через SSH
- Альтернатива REST API

### 4. Облачное развертывание

```bash
# .env
MIKOPBX_API_URL=https://mikopbx.example.com/pbxcore/api/v3
MIKOPBX_API_USERNAME=admin
MIKOPBX_API_PASSWORD=SecureCloudPassword123!
```

**Поведение:**
- Режим выполнения: `api` (auto)
- Полностью через REST API
- Работает из любой точки мира

## Переменные окружения

### API конфигурация (обязательно)

| Переменная | Описание | Пример |
|-----------|----------|--------|
| `MIKOPBX_API_URL` | URL REST API | `http://localhost:8189/pbxcore/api/v3` |
| `MIKOPBX_API_USERNAME` | Имя пользователя API | `admin` |
| `MIKOPBX_API_PASSWORD` | Пароль API | `123456789MikoPBX#1` |

### Режим выполнения

| Переменная | Описание | По умолчанию |
|-----------|----------|--------------|
| `MIKOPBX_EXECUTION_MODE` | docker\|api\|ssh\|local | auto-detect |
| `MIKOPBX_CONTAINER` | Имя Docker контейнера | `mikopbx_php83` |
| `MIKOPBX_SSH_HOST` | SSH хост | - |
| `MIKOPBX_SSH_USER` | SSH пользователь | `root` |
| `MIKOPBX_SSH_PORT` | SSH порт | `22` |

### Пути в контейнере/VM (опционально)

| Переменная | Описание | По умолчанию |
|-----------|----------|--------------|
| `MIKOPBX_DB_PATH` | Основная БД | `/cf/conf/mikopbx.db` |
| `MIKOPBX_CDR_DB_PATH` | БД CDR | `/storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db` |
| `MIKOPBX_STORAGE_PATH` | Корень хранилища | `/storage/usbdisk1/mikopbx` |
| `MIKOPBX_MONITOR_PATH` | Записи звонков | `/storage/usbdisk1/mikopbx/astspool/monitor` |
| `MIKOPBX_LOG_PATH` | Логи | `/storage/usbdisk1/mikopbx/log` |

### Настройки тестов

| Переменная | Описание | По умолчанию |
|-----------|----------|--------------|
| `ENABLE_CDR_SEED` | Заполнить тестовыми CDR | `1` |
| `ENABLE_CDR_CLEANUP` | Очистить CDR после тестов | `1` |
| `ENABLE_SYSTEM_RESET` | Сброс к заводским настройкам | `0` |

## Миграция существующих тестов

### Если в тестах используется Docker напрямую:

**Было:**
```python
import subprocess

result = subprocess.run(
    ['docker', 'exec', container, 'cat', '/etc/asterisk/pjsip.conf'],
    capture_output=True
)
config = result.stdout
```

**Стало:**
```python
from conftest import read_file_from_container

config = read_file_from_container(api_client, '/etc/asterisk/pjsip.conf')
```

### Если используется docker restart:

**Было:**
```python
subprocess.run(['docker', 'restart', container])
```

**Стало:**
```python
# Reload Asterisk через API (быстрее и работает везде)
api_client.post('system:reloadAsterisk', {})
```

### Если используется hardcoded путь:

**Было:**
```python
db_path = '/cf/conf/mikopbx.db'
```

**Стало:**
```python
from config import get_config

config = get_config()
db_path = config.database_path
```

## Проверка конфигурации

Запустите модуль config напрямую для диагностики:

```bash
cd tests/api
python3 config.py
```

Вывод покажет:
- Текущий режим выполнения
- Пути к БД и хранилищу
- Флаги тестов

## Backward Compatibility

Все изменения обратно совместимы:

- ✅ Старые тесты продолжают работать
- ✅ `conftest.py` экспортирует переменные как раньше (`API_BASE_URL`, `API_LOGIN`, `API_PASSWORD`)
- ✅ Существующие `.env` файлы работают без изменений
- ✅ Новые параметры опциональны (имеют defaults)

## Troubleshooting

### Тесты не находят .env файл

**Ошибка:**
```
FileNotFoundError: .env file not found: tests/api/.env
```

**Решение:**
```bash
cp tests/api/.env.example tests/api/.env
# Отредактируйте .env с вашими настройками
```

### Auto-detection выбирает неправильный режим

**Решение:**
```bash
# В .env принудительно укажите режим
MIKOPBX_EXECUTION_MODE=api
```

### Docker container not found

**Ошибка при auto-detection режима docker**

**Решение:**
```bash
# 1. Проверьте имя контейнера
docker ps -a | grep mikopbx

# 2. Укажите правильное имя в .env
MIKOPBX_CONTAINER=your_actual_container_name

# 3. Или используйте режим API
MIKOPBX_EXECUTION_MODE=api
```

### SSH connection refused

**Решение:**
```bash
# 1. Проверьте доступность SSH
ssh root@192.168.1.100

# 2. Проверьте параметры в .env
MIKOPBX_SSH_HOST=192.168.1.100
MIKOPBX_SSH_USER=root
MIKOPBX_SSH_PORT=22

# 3. Или используйте режим API вместо SSH
# (уберите MIKOPBX_SSH_HOST)
```

## Roadmap

Планируется дальнейший рефакторинг:

- [ ] Убрать все оставшиеся вызовы docker из других тестов
- [ ] Добавить поддержку удаленного выполнения через WebSocket
- [ ] Создать Docker Compose конфигурацию для тестового окружения
- [ ] Документировать все хелперы и утилиты

## Вопросы и поддержка

При возникновении проблем:

1. Проверьте конфигурацию: `python3 config.py`
2. Посмотрите `.env.example` для примеров
3. Создайте issue в репозитории

---

**Дата рефакторинга:** 2025-01-07
**Версия:** 1.0
**Автор:** Claude Code Assistant
