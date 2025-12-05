---
name: m-implement-rest-api-acl-authorization
branch: feature/rest-api-acl-authorization
status: pending
created: 2025-12-05
---

# Implement ACL Authorization for REST API

## Problem/Goal

REST API v3 не проверяет ACL права пользователей из ModuleUsersUI. Текущая ситуация:

**Web UI (AdminCabinet):**
- `SecurityPlugin` проверяет `$acl->isAllowed($role, $controller, $action)` на каждый запрос
- ModuleUsersUI добавляет роли и правила через hook `onAfterACLPrepared()`
- ACL **полностью работает**

**REST API v3:**
- `AuthenticationMiddleware` проверяет только аутентификацию (валидный токен)
- ACL **НЕ проверяется** на уровне middleware
- Метод `Request::isAllowedAction()` существует, но нигде не вызывается
- `UnifiedSecurityMiddleware` подготовлен, но не интегрирован и проверяет scopes API Key, а не Phalcon ACL

**Проблема:** Пользователь с ограниченной ролью (например, только CDR) может через REST API получить доступ к любым ресурсам, если у него есть валидный JWT токен.

**Две системы авторизации:**
1. **Phalcon ACL** — роли/ресурсы/действия, используется в Web UI, заполняется ModuleUsersUI
2. **API Key scopes** — path-based permissions через `ApiKeyPermissionChecker`

Нужно интегрировать проверку Phalcon ACL в REST API middleware.

## Success Criteria
- [ ] REST API проверяет ACL права пользователя после успешной аутентификации
- [ ] Роль извлекается из JWT payload (`role` claim)
- [ ] ModuleUsersUI ACL правила применяются к REST API запросам
- [ ] Localhost (127.0.0.1 и ::1) обходит все ACL ограничения
- [ ] API Key permissions остаются без изменений (не трогаем)
- [ ] Добавлены тесты для проверки ACL ограничений в REST API
- [ ] Обновлена документация в CLAUDE.md

## Context Manifest

### Текущая архитектура: Как работает аутентификация и авторизация

#### Web UI (AdminCabinet) - Полностью рабочая ACL система

**Компоненты:**
1. **SecurityPlugin** (`src/AdminCabinet/Plugins/SecurityPlugin.php`) - middleware для Web UI
2. **AclProvider** (`src/Common/Providers/AclProvider.php`) - Phalcon ACL система
3. **JwtProvider** (`src/Common/Providers/JwtProvider.php`) - извлечение роли из JWT
4. **ModuleUsersUI** - добавляет роли и правила через hook `ON_AFTER_ACL_LIST_PREPARED`

**Полный поток Web UI запроса:**

```
Browser Request → SecurityPlugin::beforeDispatch()
  ↓
1. checkUserAuth() - проверяет Bearer header ИЛИ refreshToken cookie
   → Если не авторизован → редирект на login
  ↓
2. isAllowedAction($controller, $action) - проверяет ACL права
   ↓
   2a. extractRoleFromJwt() - извлекает роль из JWT
       → Пробует Bearer header первым (AJAX запросы)
       → Fallback: refreshToken cookie → Redis lookup (browser page loads)
       → Если null → fallback 'admins' (localhost)
   ↓
   2b. $acl->isAllowed($role, $controller, $action)
       → Phalcon ACL проверяет права
       → Использует правила из ModuleUsersUI
  ↓
3. Если НЕ allowed → forward to 401 error
4. Если allowed → продолжить dispatch
```

**Где формируется ACL** (`src/Common/Providers/AclProvider.php:64-99`):

```php
$di->setShared('ACL', function() {
    $acl = new AclList();
    $acl->setDefaultAction(AclEnum::DENY);

    // Базовые роли
    $acl->addRole(new AclRole('admins'));
    $acl->addRole(new AclRole('guests'));

    // Базовые права
    $acl->allow('admins', '*', '*');
    $acl->deny('guests', '*', '*');

    // !!! CRITICAL HOOK - ModuleUsersUI добавляет роли здесь !!!
    PBXConfModulesProvider::hookModulesMethod(
        WebUIConfigInterface::ON_AFTER_ACL_LIST_PREPARED,
        [&$acl]  // передаётся по ссылке!
    );

    // Публичные endpoints
    $acl->addComponent(new Component('Errors'), ['show401', 'show404']);
    $acl->allow('*', 'Errors', ['show401', 'show404']);

    return $acl;
});
```

**Формат ACL ресурсов для Web UI:**
- **Controller** = полное имя класса: `MikoPBX\AdminCabinet\Controllers\ExtensionsController`
- **Action** = имя метода без "Action": `modify`, `save`, `delete`

**ModuleUsersUI добавляет роли примерно так:**

```php
public function onAfterACLPrepared(AclList $acl): void
{
    // Добавить кастомные роли
    $acl->addRole(new Role('ModuleUsersUI_Operator'));
    $acl->addRole(new Role('ModuleUsersUI_CDROnly'));

    // Добавить ресурсы (controllers)
    $acl->addComponent(
        new Component('MikoPBX\AdminCabinet\Controllers\ExtensionsController'),
        ['index', 'modify', 'save', 'delete']
    );

    // Настроить права
    $acl->allow('ModuleUsersUI_Operator', 'Extensions', ['index', 'modify']);
    $acl->deny('ModuleUsersUI_Operator', 'Extensions', ['delete']);
}
```

#### REST API v3 - НЕТ проверки ACL

**Текущий поток REST API запроса:**

```
API Request → AuthenticationMiddleware::call()
  ↓
1. isPublicEndpoint() → если да, пропустить auth
  ↓
2. hasBearerToken() → если да:
   ↓
   2a. JWTHelper::validate($token) - проверяет подпись и exp
       → Если валидный → setJwtPayload($payload)  // сохраняет payload['role']
       → Если НЕ валидный → пробует API Key
   ↓
   2b. TokenValidationService::validate() - проверяет API Key
       → Если валидный → setTokenInfo($tokenInfo)  // сохраняет permissions
  ↓
3. isLocalHostRequest() → если да, пропустить
  ↓
4. Если всё fail → return false (401 Unauthorized)
  ↓
5. Если success → return true → Controller выполняется

!!! НЕТ ПРОВЕРКИ ACL - любой пользователь с валидным JWT может обращаться к ЛЮБЫМ endpoints !!!
```

**Проблема:** После успешной аутентификации в `AuthenticationMiddleware`:
- JWT payload сохраняется в `$request->jwtPayload` (включая `role`)
- НО нигде не проверяется `$acl->isAllowed($role, $controller, $action)`
- Пользователь с ролью "CDROnly" может вызывать `/pbxcore/api/v3/extensions` и всё будет работать

**Существующий но НЕ используемый код:**

1. **Request::isAllowedAction()** (`src/PBXCoreREST/Http/Request.php:279-296`):
   - Метод СУЩЕСТВУЕТ
   - Извлекает роль из `$this->jwtPayload['role']`
   - Вызывает `$acl->isAllowed($role, $controller, $action)`
   - НО НИГДЕ НЕ ВЫЗЫВАЕТСЯ!!!

2. **UnifiedSecurityMiddleware** (`src/PBXCoreREST/Middleware/UnifiedSecurityMiddleware.php`):
   - Полностью реализованный middleware
   - НЕ implements MiddlewareInterface (намеренно - не готов к интеграции)
   - НЕ зарегистрирован в RouterProvider
   - Проверяет API Key scopes, НЕ Phalcon ACL
   - Для будущего использования

#### Маппинг REST API → ACL ресурсы

**GetDetailedPermissionsAction** (`src/PBXCoreREST/Lib/OpenAPI/GetDetailedPermissionsAction.php`) уже возвращает структуру:

```json
{
  "categories": {
    "PBX_CORE_REST": {
      "type": "REST",
      "controllers": {
        "/pbxcore/api/v3/extensions": {
          "name": "extensions",
          "label": "Extensions",
          "actions": ["getList", "getRecord", "create", "update", "patch", "delete"]
        },
        "/pbxcore/api/v3/call-queues": {
          "name": "call-queues",
          "label": "Call Queues",
          "actions": ["getList", "create", "update"]
        }
      }
    }
  }
}
```

**Формат ACL ресурсов для REST API:**
- **Controller** = API path: `/pbxcore/api/v3/extensions`
- **Action** = метод: `getList`, `create`, `update`, `delete`, `patch`

**ModuleUsersUI будет добавлять правила так:**

```php
public function onAfterACLPrepared(AclList $acl): void
{
    // REST API resources
    $acl->addComponent(
        new Component('/pbxcore/api/v3/extensions'),
        ['getList', 'getRecord', 'create', 'update', 'delete']
    );

    $acl->allow('ModuleUsersUI_Operator', '/pbxcore/api/v3/extensions', ['getList', 'getRecord']);
    $acl->deny('ModuleUsersUI_Operator', '/pbxcore/api/v3/extensions', ['delete']);
}
```

#### JWT Token Structure

**Создание JWT** (`src/PBXCoreREST/Lib/Auth/JWTHelper.php:62-94`):

```php
JWTHelper::generate([
    'userId' => 123,
    'userName' => 'operator',
    'role' => 'ModuleUsersUI_Operator',  // !!! CRITICAL для ACL
    'homePage' => '/admin-cabinet/call-detail-records/index'
], $expiresIn);

// Автоматически добавляются:
// 'iat' => time()           // Issued At
// 'exp' => time() + 900     // Expiration (15 min)
// 'nbf' => time()           // Not Before
```

**Валидация JWT** (`src/PBXCoreREST/Lib/Auth/JWTHelper.php:102-148`):

```php
$payload = JWTHelper::validate($token);
// → проверяет signature через SSH_RSA_KEY
// → проверяет exp + LEEWAY (10 минут для clock skew)
// → проверяет nbf - LEEWAY
// → возвращает array payload ИЛИ null
```

**Извлечение роли** (`src/Common/Providers/JwtProvider.php:118-132`):

```php
$jwt = $di->get('jwt');
$role = $jwt->extractRoleFromHeader($authHeader);
// ИЛИ
$role = $jwt->extractRoleFromRefreshToken($refreshToken);
```

#### Localhost Bypass

**Во всех системах localhost обходит проверку ACL:**

```php
// Web UI (SecurityPlugin.php:205-208)
public function isLocalHostRequest(): bool
{
    return ($_SERVER['REMOTE_ADDR'] === '127.0.0.1');
}

// REST API (Request.php:103-107)
public function isLocalHostRequest(): bool
{
    $clientAddress = $this->getClientAddress();
    return in_array($clientAddress, ['127.0.0.1', '::1'], true);
}
```

**WHY:** Внутренние скрипты системы (workers, cron) используют localhost для вызова API без токенов.

#### Где нужны изменения

**Точка интеграции ACL проверки:**

`AuthenticationMiddleware::call()` → после успешной аутентификации, перед `return true`

**Текущий код** (`src/PBXCoreREST/Middleware/AuthenticationMiddleware.php:60-85`):

```php
public function call(Micro $application): bool
{
    /** @var Request $request */
    $request = $application->getService(RequestProvider::SERVICE_NAME);

    // Check public endpoint
    if ($this->isPublicEndpoint($application) || $request->thisIsModuleNoAuthRequest($application)) {
        $this->tryOptionalAuthentication($request);
        return true;  // Пропускаем
    }

    // Check Bearer token
    if ($request->hasBearerToken()) {
        return $this->authenticateWithBearerToken($request, $application);
        // !!! ЗДЕСЬ нужно добавить ACL проверку после успешной auth !!!
    }

    // Check localhost
    if ($request->isLocalHostRequest()) {
        return true;  // Localhost bypass
    }

    return $this->denyAccess($application, $request, 'No valid authentication');
}
```

**Новый код (концепт):**

```php
private function authenticateWithBearerToken(Request $request, Micro $application): bool
{
    // ... существующий код валидации токена ...

    if ($jwtPayload !== null) {
        $request->setJwtPayload($jwtPayload);

        // !!! NEW: ACL Authorization check !!!
        if (!$request->isLocalHostRequest()) {
            $allowed = $this->checkAclPermission($request, $application);
            if (!$allowed) {
                return $this->denyAccess($application, $request, 'Access denied by ACL');
            }
        }

        return true;
    }

    // ... fallback к API Key ...
}

private function checkAclPermission(Request $request, Micro $application): bool
{
    // Извлечь роль из JWT payload
    $role = $request->getJwtPayload()['role'] ?? AclProvider::ROLE_GUESTS;

    // Получить ACL
    $acl = $application->getDI()->get(AclProvider::SERVICE_NAME);

    // Определить controller и action из текущего route
    $pattern = $application->router->getMatches()[0] ?? '';
    [$controller, $action] = $this->parseRoutePattern($pattern);

    // Проверить права
    return $acl->isAllowed($role, $controller, $action) === AclEnum::ALLOW;
}

private function parseRoutePattern(string $pattern): array
{
    // /pbxcore/api/v3/extensions → controller=/pbxcore/api/v3/extensions
    // /pbxcore/api/v3/extensions/{id} → controller=/pbxcore/api/v3/extensions, action=getRecord
    // /pbxcore/api/v3/extensions:copy → controller=/pbxcore/api/v3/extensions, action=copy

    // ... логика парсинга ...
}
```

### Технические детали компонентов

#### AclProvider - Кэширование ACL списка

**Где:** `src/Common/Providers/AclProvider.php:64-99`

**Механизм кэширования:**

```php
$cache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
$acl = $cache->get(self::CACHE_KEY);  // 'ACLCache'

if (!$acl) {
    // Build ACL list
    $acl = new AclList();
    // ... добавить роли, ресурсы, правила ...

    // Cache for 24 hours
    $cache->set(self::CACHE_KEY, $acl, 86400);
}

return $acl;
```

**Инвалидация кэша:**

```php
AclProvider::clearCache();
// → удаляет 'ACLCache' из Redis
// → следующий запрос пересоздаст ACL с новыми правилами
```

**WHY кэш:** ACL построение дорогое (сканирование controllers, hook вызовы), кэшируется на 24 часа.

**WHEN инвалидировать:**
- После enable/disable ModuleUsersUI
- После изменения ролей/прав в ModuleUsersUI
- После обновления модуля

#### JwtProvider - Разделение ответственности

**Где:** `src/Common/Providers/JwtProvider.php`

**WHY отдельный provider:**
- AdminCabinet НЕ должен зависеть от PBXCoreREST
- Общая логика JWT для обеих систем
- Единая точка валидации токенов

**Методы:**

```php
$jwt = $di->get('jwt');

// Валидация токена
$payload = $jwt->validate($token);

// Извлечение роли из Bearer header
$role = $jwt->extractRoleFromHeader('Bearer eyJ...');

// Извлечение роли из refreshToken (Redis lookup)
$role = $jwt->extractRoleFromRefreshToken($cookieValue);

// Извлечение userId для модулей
$userId = $jwt->extractUserIdFromRefreshToken($cookieValue);

// Извлечение homePage для редиректов
$homePage = $jwt->extractHomePageFromRefreshToken($cookieValue);
```

#### Request Class - Хранение контекста авторизации

**Где:** `src/PBXCoreREST/Http/Request.php`

**Поля контекста:**

```php
class Request extends PhRequest
{
    // API Key информация (после TokenValidationService)
    private ?array $tokenInfo = null;

    // JWT payload (после JWTHelper::validate)
    private ?array $jwtPayload = null;

    public function setTokenInfo(array $info): void;
    public function getTokenInfo(): ?array;

    public function setJwtPayload(array $payload): void;
    public function getJwtPayload(): ?array;
}
```

**Уже существующий метод** (строки 279-296):

```php
public function isAllowedAction(Micro $api): bool
{
    $pattern = $api->router->getMatches()[0] ?? '';
    $partsOfPattern = explode('/', $pattern);

    if (count($partsOfPattern) === 5) {
        // Extract role from JWT payload
        $role = $this->jwtPayload['role'] ?? AclProvider::ROLE_GUESTS;

        $acl = $api->getSharedService(AclProvider::SERVICE_NAME);
        $controller = "/$partsOfPattern[1]/$partsOfPattern[2]/$partsOfPattern[3]";
        $action = "/$partsOfPattern[4]";

        $allowed = $acl->isAllowed($role, $controller, $action);
        return $allowed === AclEnum::ALLOW;
    }

    return true;
}
```

**WHY НЕ используется:**
- Парсинг pattern устаревший (только для legacy routes)
- Нет вызова из middleware
- Нужна адаптация для современных REST v3 routes

#### RouterProvider - Где регистрируются middleware

**Где:** `src/PBXCoreREST/Providers/RouterProvider.php:82-93`

**Текущие middleware:**

```php
private function attachMiddleware(Micro $application, Manager $eventsManager): void
{
    // Request preparation
    $application->before(new RequestPreparationMiddleware());

    // Authentication (JWT + API Key validation)
    $application->before(new AuthenticationMiddleware());

    // Response formatting
    $application->after(new ResponseMiddleware());
}
```

**WHY before/after:**
- `before` = выполняется до controller action
- `after` = выполняется после controller action

**Порядок выполнения:**

```
Request → RequestPreparationMiddleware
       → AuthenticationMiddleware  // !!! ЗДЕСЬ нужна ACL проверка
       → Controller Action
       → ResponseMiddleware
       → Response
```

#### API Key Permissions vs Phalcon ACL

**Две системы авторизации:**

1. **API Key Scopes** (`UnifiedSecurityMiddleware`) - НЕ используется
   - Path-based permissions через `ApiKeyPermissionChecker`
   - Format: `resource:action` (например `extensions:read`, `call-queues:write`)
   - Wildcards: `*:*`, `extensions:*`, `*:read`
   - НЕ Phalcon ACL, custom реализация

2. **Phalcon ACL** (`AclProvider`) - используется Web UI, НУЖНО для REST API
   - Role-based permissions через `Phalcon\Acl\Adapter\Memory`
   - Resources: controller paths (`/pbxcore/api/v3/extensions`)
   - Actions: методы (`getList`, `create`, `update`)
   - ModuleUsersUI добавляет роли через hook

**CRITICAL:** API Key scopes НЕ ТРОГАЕМ, это отдельная система для API Keys без JWT.

### Для реализации нужно понять

#### 1. Как определить controller и action из текущего REST API запроса

**Проблема:** Современные REST v3 routes НЕ следуют pattern `/api/controller/action`

**Примеры routes:**

```
GET  /pbxcore/api/v3/extensions          → getList
GET  /pbxcore/api/v3/extensions/{id}     → getRecord
POST /pbxcore/api/v3/extensions          → create
PUT  /pbxcore/api/v3/extensions/{id}     → update
GET  /pbxcore/api/v3/extensions:copy     → copy (custom method)
```

**Доступная информация в middleware:**

```php
public function call(Micro $application): bool
{
    // Router matches
    $matches = $application->router->getMatches();
    // [0] => matched pattern
    // [1], [2], ... => captured groups

    // Matched route
    $matchedRoute = $application->router->getMatchedRoute();
    // → getName(), getPattern(), getHttpMethods()

    // Request
    $request = $application->getService(RequestProvider::SERVICE_NAME);
    $request->getURI();      // /pbxcore/api/v3/extensions/123
    $request->getMethod();   // GET, POST, PUT, DELETE
}
```

**Возможные подходы:**

**A. Парсинг URI и HTTP метод:**

```php
$uri = $request->getURI();  // /pbxcore/api/v3/extensions/123
$method = $request->getMethod();  // GET

// Убрать /pbxcore/api/v3 prefix
$resource = preg_replace('#^/pbxcore/api/v3#', '', $uri);
// → /extensions/123

// Убрать ID из path
$resource = preg_replace('#/[^/:]+$#', '', $resource);
// → /extensions

$controller = '/pbxcore/api/v3' . $resource;
// → /pbxcore/api/v3/extensions

// Определить action по HTTP методу + наличию ID
if ($method === 'GET' && preg_match('#/[^/]+$#', $uri)) {
    $action = 'getRecord';
} elseif ($method === 'GET') {
    $action = 'getList';
} elseif ($method === 'POST') {
    $action = 'create';
}
```

**B. Использовать router metadata (если доступна):**

```php
$matchedRoute = $application->router->getMatchedRoute();
// → может содержать metadata о controller и action
```

**C. Расширить Request с сохранением controller/action при роутинге:**

В RouterProvider при создании routes сохранять metadata.

#### 2. Как SecurityPlugin для Web UI делает это

**SecurityPlugin** (`src/AdminCabinet/Plugins/SecurityPlugin.php:337-355`):

```php
public function isAllowedAction(string $controller, string $action): bool
{
    // Extract role from JWT
    $role = $this->extractRoleFromJwt();

    // Fallback to admins
    if ($role === null) {
        $role = AclProvider::ROLE_ADMINS;
    }

    $acl = $this->di->get(AclProvider::SERVICE_NAME);
    $allowed = $acl->isAllowed($role, $controller, $action);

    return $allowed === AclEnum::ALLOW;
}
```

**Откуда берётся $controller и $action:**

```php
public function beforeDispatch(Event $event, Dispatcher $dispatcher): bool
{
    $action = $dispatcher->getActionName();  // 'modify' (без 'Action')
    $controllerClass = $dispatcher->getHandlerClass();  // Full class name

    if (!$this->isAllowedAction($controllerClass, $action)) {
        $this->forwardTo401Error($dispatcher);
    }
}
```

**CRITICAL отличие:**
- Web UI: Dispatcher знает controller class и action method
- REST API: Micro router НЕ использует dispatcher, нужен другой подход

#### 3. Custom методы и route patterns

**Custom methods используют colon syntax:**

```
GET /pbxcore/api/v3/extensions:getDefault
POST /pbxcore/api/v3/extensions/{id}:copy
```

**Парсинг custom методов:**

```php
if (preg_match('#:([^/]+)$#', $uri, $matches)) {
    $action = $matches[1];  // 'getDefault', 'copy'
    $controller = preg_replace('#:[^/]+$#', '', $uri);  // Убрать :method
}
```

### Implementation Roadmap

**Минимальные изменения для работы:**

1. **AuthenticationMiddleware** - добавить ACL проверку после успешной JWT валидации
   - Метод `checkAclPermission()`
   - Метод `parseRequestToAcl()` - определить controller/action из request

2. **НЕ ТРОГАТЬ:**
   - UnifiedSecurityMiddleware (для API Keys, не для Phalcon ACL)
   - Request::isAllowedAction() (устаревший парсинг, можно удалить или переписать)
   - API Key permissions система

3. **Тестирование:**
   - ModuleUsersUI добавляет роли через hook
   - JWT токен содержит роль
   - ACL проверяет права для REST API paths
   - Localhost bypass работает

### Файлы для изменения

**Основной файл:**
- `src/PBXCoreREST/Middleware/AuthenticationMiddleware.php`
  - Добавить метод `checkAclPermission()`
  - Добавить метод `parseRequestToAcl()`
  - Вызвать проверку после JWT validation

**Возможно потребуется:**
- `src/PBXCoreREST/Http/Request.php` - обновить/удалить `isAllowedAction()`

**НЕ изменять:**
- `src/PBXCoreREST/Middleware/UnifiedSecurityMiddleware.php` (для API Keys)
- `src/Common/Providers/AclProvider.php` (уже работает правильно)
- `src/Common/Providers/JwtProvider.php` (уже работает правильно)

## User Notes
- Возможно использовать `UnifiedSecurityMiddleware` или удалить/переписать его
- Маппинг REST → ACL уже существует через `GetDetailedPermissionsAction`:
  - Контроллер = path (например `/pbxcore/api/v3/extensions`)
  - Action = метод (`getList`, `create`, `update`, `delete`, etc.)
  - ModuleUsersUI через hook `ON_AFTER_ACL_LIST_PREPARED` добавляет правила в ACL
- Localhost обходит все ограничения (IPv4: 127.0.0.1, IPv6: ::1)
- API Keys — не трогаем, там своя система permissions

## Work Log
<!-- Updated as work progresses -->
- [2025-12-05] Task created after analysis of ACL integration
