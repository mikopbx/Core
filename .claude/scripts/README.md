# Container Detection Scripts

Автоматическое определение Docker контейнера на основе текущего git worktree.

## Обзор

При работе с несколькими worktree (Core, project-tests-refactoring, project-modules-api-refactoring, и т.д.) каждый имеет свой собственный Docker контейнер. Эти скрипты автоматически определяют правильный контейнер на основе текущей рабочей директории.

## Скрипты

### get-container-name.sh

Определяет имя Docker контейнера для текущего worktree.

**Использование**:
```bash
CONTAINER=$(./.claude/scripts/get-container-name.sh)
echo "Current container: $CONTAINER"
```

**Логика определения**:
1. Проверяет mount points контейнеров - находит контейнер у которого есть монтирование из текущей директории
2. Fallback: использует паттерн имени worktree:
   - `Core` → `mikopbx_php83`
   - `project-tests-refactoring` → `mikopbx_tests-refactoring`
   - `project-modules-api-refactoring` → `mikopbx_modules-api-refactoring`
   - `project-s3-records-storage` → `mikopbx_s3-records-storage`

**Выход**:
- Exit code 0: успех, имя контейнера выведено в stdout
- Exit code 1: контейнер не найден

### get-container-api-url.sh

Возвращает полный API URL для текущего контейнера.

**Использование**:
```bash
API_URL=$(./.claude/scripts/get-container-api-url.sh)
echo "API endpoint: $API_URL"
```

**Выход**:
```
http://192.168.X.X:8081/pbxcore/api/v3
```

**Особенности**:
- Использует внутренний IP контейнера
- Порт 8081 (HTTP, без SSL)
- API v3 path

## Интеграция со Skills

Все skills автоматически используют эти скрипты для определения контейнера:

### api-client
```bash
# Автоматически определяет контейнер
./.claude/skills/api-client/scripts/api-request.sh GET extensions
```

### auth-token-manager
```bash
# Автоматически использует правильный API URL
TOKEN=$(./.claude/skills/auth-token-manager/get-auth-token.sh)
```

## Примеры

### Пример 1: Проверка текущего контейнера
```bash
$ pwd
/Users/nb/PhpstormProjects/mikopbx/Core

$ ./.claude/scripts/get-container-name.sh
mikopbx_php83

$ ./.claude/scripts/get-container-api-url.sh
http://192.168.107.4:8081/pbxcore/api/v3
```

### Пример 2: Использование в другом worktree
```bash
$ cd /Users/nb/PhpstormProjects/mikopbx/project-tests-refactoring

$ ./.claude/scripts/get-container-name.sh
mikopbx_tests-refactoring

$ ./.claude/scripts/get-container-api-url.sh
http://192.168.X.X:8081/pbxcore/api/v3
```

### Пример 3: Использование в shell скриптах
```bash
#!/bin/bash

# Определить контейнер
CONTAINER=$(./.claude/scripts/get-container-name.sh) || {
    echo "Error: Could not detect container"
    exit 1
}

# Выполнить команду в контейнере
docker exec "$CONTAINER" php -v
```

## Как это работает

### Паттерн именования контейнеров

Docker Compose создает контейнеры с префиксом `mikopbx_` и суффиксом из имени проекта:

```
project-tests-refactoring/docker-compose.yml
  → container name: mikopbx_tests-refactoring

project-modules-api-refactoring/docker-compose.yml
  → container name: mikopbx_modules-api-refactoring

Core/ (основной worktree)
  → container name: mikopbx_php83
```

### Монтирование директорий

Каждый контейнер монтирует файлы из своего worktree:

```
mikopbx_tests-refactoring:
  /Users/nb/.../project-tests-refactoring/src → /offload/rootfs/usr/www/src

mikopbx_php83:
  /Users/nb/.../Core/src → /offload/rootfs/usr/www/src
```

Скрипт проверяет эти mount points для точного определения контейнера.

## Устранение неполадок

### "No running MikoPBX containers found"
**Причина**: Ни один контейнер не запущен
**Решение**: Запустите контейнер для текущего worktree

### "Container X not found in running containers"
**Причина**: Ожидаемый контейнер не запущен
**Решение**:
```bash
docker ps | grep mikopbx  # проверить запущенные контейнеры
docker start mikopbx_XXX  # запустить нужный контейнер
```

### Warning: "Could not determine container for .claude"
**Причина**: Скрипт запущен из директории `.claude`, которая не является worktree
**Решение**: Fallback использует `mikopbx_php83`, это ожидаемое поведение

## Переменные окружения

Скрипты НЕ используют переменные окружения для определения контейнера - они всегда определяют автоматически на основе текущей директории.

Для переопределения используйте параметры в вызывающих скриптах:

```bash
# В api-client
./.claude/skills/api-client/scripts/api-request.sh GET extensions --container mikopbx_php74
```

## См. также

- [api-client skill](../skills/api-client/SKILL.md) - REST API клиент
- [auth-token-manager skill](../skills/auth-token-manager/SKILL.md) - JWT токены
- [container-inspector skill](~/.claude/skills/container-inspector/SKILL.md) - Инспекция контейнеров
