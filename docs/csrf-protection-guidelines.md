# CSRF Protection Guidelines for MikoPBX Modules

## Overview

Cross-Site Request Forgery (CSRF) защита предотвращает выполнение несанкционированных действий от имени аутентифицированного пользователя. В MikoPBX применяется многоуровневая защита от CSRF атак.

## 1. Архитектура защиты MikoPBX

### Уровни защиты:

1. **SecurityPlugin** - автоматическая проверка токенов для POST запросов
2. **Session validation** - проверка сессий администратора  
3. **Origin validation** - проверка источника запросов
4. **REST API queue** - изоляция через Redis очередь

## 2. SecurityPlugin - автоматическая защита

### Механизм работы

SecurityPlugin автоматически проверяет все POST запросы:

```php
// В SecurityPlugin::beforeExecuteRoute()
if ($this->request->isPost()) {
    if (!$this->security->checkToken()) {
        // Блокировка CSRF атаки
        $this->response->redirect('/session/index');
        return false;
    }
}
```

### Генерация токенов

Токены автоматически добавляются в формы:

```volt
{# В базовых шаблонах #}
<form class="ui form" method="post">
    {{ security.getToken() }}
    {{ security.getTokenKey() }}
    <!-- остальные поля формы -->
</form>
```

## 3. Формы AdminCabinet

### BaseForm - встроенная защита

```php
class MyModuleForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);
        
        // CSRF токены добавляются автоматически в BaseForm
        
        $this->add(new Text('name'));
        // ... остальные поля
    }
}
```

### Использование в контроллерах

```php
class MyModuleController extends BaseController
{
    public function modifyAction($id = null): void
    {
        $record = MyModel::findFirstById($id) ?? new MyModel();
        $form = new MyModuleForm($record);
        
        $this->view->form = $form;
        // CSRF токены автоматически передаются в представление
    }
    
    public function saveAction(): void
    {
        if (!$this->request->isPost()) {
            return $this->forward('my-module/index');
        }
        
        // SecurityPlugin уже проверил CSRF токен
        // Можно безопасно обрабатывать данные
        $data = $this->request->getPost();
        // ... обработка данных
    }
}
```

## 4. REST API защита

### Сессионная аутентификация

REST API использует сессионную аутентификацию для защиты от CSRF:

```php
// В AuthenticationMiddleware
class AuthenticationMiddleware
{
    public function beforeExecuteRoute(Event $event, Dispatcher $dispatcher): bool
    {
        $request = $dispatcher->getDI()->get('request');
        
        // Проверка источника запроса
        if (!$this->isValidOrigin($request)) {
            return $this->sendUnauthorized();
        }
        
        // Проверка сессии администратора
        if (!$this->isAuthorizedSessionRequest($request)) {
            return $this->sendUnauthorized();
        }
        
        return true;
    }
}
```

### Проверка Origin заголовков

```php
private function isValidOrigin(RequestInterface $request): bool
{
    $origin = $request->getHeader('HTTP_ORIGIN');
    $referer = $request->getHeader('HTTP_REFERER');
    
    // Проверяем, что запрос исходит от того же домена
    return $this->isSameOrigin($origin) || $this->isSameOrigin($referer);
}
```

### Queue isolation

REST API использует Redis очередь для изоляции:

```php
// Запросы обрабатываются через воркеры
class WorkerApiCommands extends WorkerRedisBase
{
    public function processJobDirect(string $jobId, array $requestData): void
    {
        // Обработка в изолированном воркере
        // Дополнительная защита от CSRF через архитектуру
    }
}
```

## 5. JavaScript Frontend

### Автоматическое включение токенов

```javascript
// В PbxAPI все AJAX запросы автоматически включают сессионные данные
$.api({
    url: PbxApi.myEndpoint,
    method: 'POST',
    data: formData,
    // Cookies с сессией передаются автоматически
    onSuccess(response) {
        // обработка ответа
    }
});
```

### SameSite Cookie защита

```php
// В конфигурации сессий
session_set_cookie_params([
    'samesite' => 'Strict',
    'secure' => true,
    'httponly' => true
]);
```

## 6. Модули - рекомендации

### 1. Контроллеры модулей

```php
class ModuleController extends BaseController
{
    public function indexAction(): void
    {
        // GET запросы безопасны от CSRF
    }
    
    public function saveAction(): void
    {
        // POST автоматически защищён SecurityPlugin
        if (!$this->request->isPost()) {
            return $this->forward('module/index');
        }
        
        // Данные можно безопасно обрабатывать
        $this->processData($this->request->getPost());
    }
}
```

### 2. API endpoints модулей

```php
class ModuleNameConf extends ConfigClass implements CoreAPIInterface
{
    public function moduleRestAPICallback(array $request): void
    {
        // REST API уже проверен AuthenticationMiddleware
        $action = $request['action'];
        $data = $request['data'];
        
        switch ($action) {
            case 'save':
                $this->saveData($data);
                break;
            // ...
        }
    }
    
    public function needAuthentication(string $action): bool
    {
        // Только публичные endpoints не требуют аутентификации
        $publicActions = ['webhook', 'callback'];
        return !in_array($action, $publicActions);
    }
}
```

### 3. Webhook endpoints (исключения)

Для webhook'ов, которые должны принимать внешние запросы:

```php
public function needAuthentication(string $action): bool
{
    // Webhook endpoints не требуют CSRF защиты
    if ($action === 'webhook') {
        return false;
    }
    
    // Но требуют дополнительной валидации
    return true;
}

private function processWebhook(array $data): void
{
    // Альтернативная аутентификация
    if (!$this->validateWebhookSignature($data)) {
        ProcessorClass::responseError('Invalid webhook signature');
        return;
    }
    
    // Обработка webhook'а
}
```

## 7. Дополнительная защита

### Double Submit Cookie

Для критически важных операций:

```javascript
// Генерация дополнительного токена
const csrfToken = this.generateCSRFToken();

// Отправка токена в заголовке и cookie
$.api({
    url: PbxApi.criticalAction,
    beforeSend(xhr) {
        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
    },
    data: {
        csrf_token: csrfToken,
        // ... данные
    }
});
```

### Проверка Referer

```php
private function validateReferer(): bool
{
    $referer = $this->request->getHTTPReferer();
    $expectedHost = $this->request->getHttpHost();
    
    return strpos($referer, "https://{$expectedHost}") === 0;
}
```

### Временные токены

Для одноразовых операций:

```php
// Генерация временного токена
$tempToken = $this->security->getToken();
$this->session->set("temp_token_{$action}", $tempToken);

// Проверка и удаление
if ($this->session->get("temp_token_{$action}") !== $providedToken) {
    throw new SecurityException('Invalid temporary token');
}
$this->session->remove("temp_token_{$action}");
```

## 8. Типичные ошибки

### ❌ Неправильно

```php
// Обход проверки CSRF
if ($this->request->isPost() && !$this->security->checkToken()) {
    // ОПАСНО - игнорирование ошибки токена
    // Продолжение обработки
}

// Отключение SecurityPlugin для POST
public function beforeExecuteRoute()
{
    $this->security->disableCSRF(); // ОПАСНО
}
```

```javascript
// Отправка POST без сессии
$.ajax({
    url: '/api/endpoint',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    // ОПАСНО - без сессионных cookies
    data: JSON.stringify(data)
});
```

### ✅ Правильно

```php
// Правильная обработка CSRF ошибок
if ($this->request->isPost() && !$this->security->checkToken()) {
    $this->flash->error('Security token validation failed');
    return $this->forward('login/index');
}

// Использование встроенной защиты
class MyForm extends BaseForm
{
    // CSRF токены добавляются автоматически
}
```

```javascript
// Использование PbxAPI с автоматической защитой
$.api({
    url: PbxApi.myEndpoint,
    method: 'POST',
    data: formData,
    // Сессионные cookies включаются автоматически
});
```

## 9. Тестирование CSRF защиты

### Ручное тестирование

```bash
# Попытка CSRF атаки без токена
curl -X POST http://mikopbx.local/extensions/save \
     -d "number=101&name=test" \
     -H "Cookie: PHPSESSID=valid_session"
# Должно быть заблокировано

# Попытка с неверным токеном  
curl -X POST http://mikopbx.local/extensions/save \
     -d "number=101&name=test&csrf_token=invalid" \
     -H "Cookie: PHPSESSID=valid_session"
# Должно быть заблокировано
```

### Автоматизированное тестирование

```php
class CSRFProtectionTest extends \PHPUnit\Framework\TestCase
{
    public function testCSRFProtectionBlocked(): void
    {
        // Попытка POST без токена
        $response = $this->post('/module/save', ['data' => 'test']);
        $this->assertEquals(403, $response->getStatusCode());
    }
    
    public function testValidCSRFTokenAccepted(): void
    {
        // POST с валидным токеном
        $token = $this->getCSRFToken();
        $response = $this->post('/module/save', [
            'data' => 'test',
            'csrf_token' => $token
        ]);
        $this->assertEquals(200, $response->getStatusCode());
    }
}
```

## 10. Мониторинг и алерты

### Логирование CSRF атак

```php
// В SecurityPlugin
if (!$this->security->checkToken()) {
    $this->logger->warning('CSRF attack detected', [
        'ip' => $this->request->getClientAddress(),
        'user_agent' => $this->request->getUserAgent(),
        'referer' => $this->request->getHTTPReferer(),
        'uri' => $this->request->getURI(),
    ]);
}
```

### Метрики безопасности

```php
// Счётчики для мониторинга
$this->metrics->increment('csrf.attempts');
$this->metrics->increment('csrf.blocked');
```

## 11. Проверочный список

- [ ] SecurityPlugin активен для всех POST запросов
- [ ] Формы используют BaseForm с автоматическими токенами
- [ ] REST API использует сессионную аутентификацию
- [ ] Origin/Referer заголовки проверяются
- [ ] Webhook endpoints правильно настроены
- [ ] SameSite cookies настроены
- [ ] CSRF атаки логируются
- [ ] Тестирование CSRF защиты выполнено

## Заключение

MikoPBX предоставляет комплексную защиту от CSRF атак через SecurityPlugin, сессионную аутентификацию и архитектурные решения. Следование этим рекомендациям обеспечит надёжную защиту модулей от CSRF атак.