---
name: t-test-public-endpoints-hybrid-system
branch: modules-api-refactoring
status: pending
created: 2025-11-24
parent: m-refactor-router-provider-public-endpoints
---

# Testing and Documentation for Hybrid Public Endpoints System

## Problem/Goal

После реализации гибридной системы публичных эндпоинтов с 3 приоритетами необходимо:
1. Подтвердить работоспособность через тесты
2. Обеспечить качество кода через PHPStan
3. Документировать через работающие примеры в модулях
4. Подготовить базу для постепенной миграции legacy endpoints

Это гарантирует production-ready состояние новой функциональности и предоставит разработчикам модулей понятные примеры использования.

## Success Criteria

### Critical Path (минимум для production)

**PHPStan Analysis:**
- [ ] PHPStan запущен на всех изменённых файлах (RouterProvider, AuthenticationMiddleware, PublicEndpointsRegistry)
- [ ] Все найденные ошибки типизации исправлены
- [ ] PHPStan проходит без ошибок на level 6+ для новых файлов

**Functional Tests - Public Endpoints:**
- [ ] Тест Priority 1: Pattern 4 модуль с `SecurityType::PUBLIC` работает без авторизации
- [ ] Тест Priority 2: Legacy endpoint из `PUBLIC_ENDPOINTS` константы работает без авторизации
- [ ] Тест Priority 3: Module Pattern 2 с `noAuth: true` работает без авторизации
- [ ] Проверка порядка приоритетов (Priority 1 проверяется первым)
- [ ] Negative test: защищённый endpoint требует авторизации
- [ ] Optional auth test: публичный endpoint работает как с токеном, так и без него

### Quality Improvements (желательно)

**Unit Tests - RouterProvider:**
- [ ] Тест `buildIdPattern()` с пустым массивом → возвращает `[^/:]+`
- [ ] Тест `buildIdPattern()` с одним префиксом → возвращает escaped префикс + `[^/:]+`
- [ ] Тест `buildIdPattern()` с regex паттерном → возвращает паттерн как есть
- [ ] Тест `buildIdPattern()` с множественными префиксами → обрабатывает первый
- [ ] Тест регистрации публичных эндпоинтов в реестр при генерации маршрутов

**Module Examples:**
- [ ] ModuleExampleRestAPIv2: добавлен публичный GET endpoint `/public-status` с `noAuth: true`
- [ ] ModuleExampleRestAPIv2: endpoint работает без авторизации (проверено curl)
- [ ] ModuleExampleRestAPIv3: добавлен публичный ресурс `/webhooks` с `SecurityType::PUBLIC`
- [ ] ModuleExampleRestAPIv3: endpoint работает без авторизации (проверено curl)
- [ ] Примеры задокументированы в README модулей

### Advanced (опционально, можно отложить)

**Integration Tests:**
- [ ] Сквозной тест: запрос проходит через все 3 приоритета при недоступности реестра
- [ ] Edge case: PublicEndpointsRegistry выбрасывает исключение → fallback на Priority 2
- [ ] Edge case: неправильно настроенные атрибуты в контроллере → обрабатываются gracefully
- [ ] Performance test: измерение overhead от проверки публичных эндпоинтов

**Legacy Migration Plan:**
- [ ] Список всех endpoints в `PUBLIC_ENDPOINTS` константе проанализирован
- [ ] Для каждого endpoint определён контроллер с атрибутами
- [ ] План миграции создан (по одному endpoint в релиз)
- [ ] Backwards compatibility тесты написаны

## Context Manifest

### Parent Task Reference

Эта задача является продолжением **m-refactor-router-provider-public-endpoints** ([commit 560df5ca7](https://github.com/mikopbx/Core/commit/560df5ca7)).

**Что уже сделано в родительской задаче:**
- Рефакторинг RouterProvider (buildIdPattern + HTTP_METHODS)
- Создан PublicEndpointsRegistry сервис
- Реализована 3-приоритетная система проверки публичных эндпоинтов
- Обновлена документация в src/PBXCoreREST/CLAUDE.md

**Архитектура 3-приоритетной системы:**

1. **Priority 1: Attribute-based (Pattern 4)**
   - Проверка через `PublicEndpointsRegistry.isPublicEndpoint()`
   - Контроллеры с `#[ResourceSecurity(..., requirements: [SecurityType::PUBLIC])]`
   - Реестр заполняется автоматически при генерации маршрутов

2. **Priority 2: Legacy hardcoded (Core endpoints)**
   - Константа `PUBLIC_ENDPOINTS` в AuthenticationMiddleware
   - Backward compatibility для существующих endpoints
   - Планируется постепенная миграция на атрибуты

3. **Priority 3: Module Pattern 2**
   - Через `Request::thisIsModuleNoAuthRequest()`
   - 6-й параметр `noAuth: true` в `getPBXCoreRESTAdditionalRoutes()`
   - Поддержка legacy модулей

### Testing Infrastructure

**Существующая структура тестов:**
```
tests/api/
├── conftest.py              # Fixtures: api_client, auth_headers, base_url
├── test_01_auth.py          # Тесты авторизации
├── test_25_outbound_routes.py  # Пример resource тестов
└── ...
```

**Паттерн pytest тестов:**
```python
import pytest
from tests.api.conftest import api_client, auth_headers

class TestPublicEndpoints:
    def test_public_without_auth(self, api_client):
        response = api_client.get('/pbxcore/api/v3/system:ping')
        assert response.status_code == 200

    def test_public_with_auth(self, api_client, auth_headers):
        response = api_client.get('/pbxcore/api/v3/system:ping', headers=auth_headers)
        assert response.status_code == 200
```

### Module Examples Structure

**ModuleExampleRestAPIv2** (Pattern 2 - Custom Routes):
```
ModuleExampleRestAPIv2/
├── Lib/
│   ├── RestAPI/
│   │   ├── Controllers/
│   │   │   ├── GetController.php
│   │   │   └── PostController.php
│   │   └── Backend/Actions/
│   └── ExampleRestAPIv2Conf.php  # getPBXCoreRESTAdditionalRoutes()
└── README.md
```

**Где добавить публичный endpoint:**
- В `getPBXCoreRESTAdditionalRoutes()` добавить маршрут с 6-м параметром `true`
- Создать Action класс для обработки (например, `GetPublicStatusAction.php`)

**ModuleExampleRestAPIv3** (Pattern 4 - Attribute-based):
```
ModuleExampleRestAPIv3/
├── Lib/
│   ├── RestAPI/
│   │   └── Tasks/
│   │       ├── Controller.php         # #[ApiResource], #[HttpMapping]
│   │       ├── Processor.php
│   │       ├── DataStructure.php
│   │       └── Actions/
│   └── ExampleRestAPIv3Conf.php
└── README.md
```

**Где добавить публичный ресурс:**
- Создать новый директорий `Lib/RestAPI/Webhooks/`
- Controller с `#[ResourceSecurity('webhooks', requirements: [SecurityType::PUBLIC])]`
- Processor и Actions для обработки запросов

### PHPStan Configuration

**Расположение конфигурации:**
```
/Users/nb/PhpstormProjects/mikopbx/project-modules-api-refactoring/phpstan.neon
```

**Команда для запуска:**
```bash
vendor/bin/phpstan analyse src/PBXCoreREST/Services/PublicEndpointsRegistry.php \
    src/PBXCoreREST/Providers/PublicEndpointsRegistryProvider.php \
    src/PBXCoreREST/Providers/RouterProvider.php \
    src/PBXCoreREST/Middleware/AuthenticationMiddleware.php \
    --level 6
```

**Типичные проблемы PHPStan в Phalcon проектах:**
- Phalcon DI возвращает `mixed` → нужны PHPDoc аннотации
- Reflection API нуждается в проверках `null`
- Атрибуты требуют explicit type casting

### Files to Modify

**Для тестов:**
- `tests/api/test_XX_public_endpoints.py` (NEW) - функциональные тесты публичных эндпоинтов
- `tests/unit/test_router_provider.py` (NEW) - unit тесты RouterProvider

**Для примеров ModuleExampleRestAPIv2:**
- `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv2/Lib/ExampleRestAPIv2Conf.php` - добавить маршрут с noAuth
- `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv2/Lib/RestAPI/Controllers/GetController.php` - обработать новый endpoint
- `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv2/Lib/RestAPI/Backend/Actions/GetPublicStatusAction.php` (NEW)
- `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv2/README.md` - документация

**Для примеров ModuleExampleRestAPIv3:**
- `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/RestAPI/Webhooks/Controller.php` (NEW)
- `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/RestAPI/Webhooks/Processor.php` (NEW)
- `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/RestAPI/Webhooks/DataStructure.php` (NEW)
- `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/Lib/RestAPI/Webhooks/Actions/ProcessWebhookAction.php` (NEW)
- `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/README.md` - документация

### Testing Strategy

**Phase 1: PHPStan (быстро, критично)**
1. Запустить PHPStan на новых файлах
2. Исправить найденные проблемы типизации
3. Добавить PHPDoc где необходимо
4. Убедиться что level 6 проходит

**Phase 2: Functional Tests (критично для production)**
1. Создать `test_XX_public_endpoints.py`
2. Написать тесты для всех 3 приоритетов
3. Добавить negative tests
4. Запустить через pytest и убедиться что всё проходит

**Phase 3: Module Examples (документация)**
1. ModuleExampleRestAPIv2 - добавить простой GET endpoint
2. ModuleExampleRestAPIv3 - добавить полноценный webhook ресурс
3. Протестировать примеры через curl
4. Обновить README с инструкциями

**Phase 4: Unit Tests (опционально)**
1. Создать unit тесты для buildIdPattern()
2. Покрыть edge cases
3. Тестировать в изоляции от Phalcon

**Phase 5: Advanced (можно отложить)**
1. Integration тесты
2. Performance тесты
3. План миграции legacy endpoints

## User Notes

**Приоритеты:**
- **HIGH**: PHPStan + Functional Tests (критично для production)
- **MEDIUM**: Module Examples (улучшает DX)
- **LOW**: Unit Tests, Integration Tests, Migration Plan (можно делать постепенно)

**Рекомендуемый подход:**
1. Начать с PHPStan - быстрая проверка качества
2. Функциональные тесты - убедиться что работает
3. Примеры в модулях - если есть время
4. Остальное можно делать итеративно в следующих релизах

## Work Log
<!-- Updated as work progresses -->
- [2025-11-24] Создана подзадача для тестирования и доработки гибридной системы публичных эндпоинтов
