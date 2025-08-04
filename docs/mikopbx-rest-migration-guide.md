# Руководство по миграции MikoPBX на REST API для AI агента

## Оглавление

1. [Введение и общие принципы](#введение)
2. [Архитектура REST API](#архитектура-rest-api)
3. [Пошаговая инструкция миграции](#пошаговая-инструкция)
4. [Базовые классы и компоненты](#базовые-классы)
5. [Работа с санитизацией данных](#санитизация-данных)
6. [Интеграция с UI компонентами](#интеграция-ui)
7. [Примеры реализации](#примеры-реализации)
8. [Тестирование и валидация](#тестирование)

## Введение и общие принципы {#введение}

### Цель миграции

Перевод всех интерфейсов управления учетными записями MikoPBX на единую REST API архитектуру для обеспечения:
- Унификации CRUD операций
- Централизованной санитизации данных
- Готовности к внешним интеграциям
- Автоматической генерации документации

### Ключевые требования

1. **Минимальные изменения в UI** - сохранение существующей логики JavaScript и форм
2. **Двухуровневая санитизация** - базовая в контроллерах, специфичная в Actions
3. **Использование существующих UI механизмов** - Form.js, DeleteSomething.js, DataTable
4. **RESTful подход** - правильные HTTP методы и статус коды

## Архитектура REST API {#архитектура-rest-api}

### Структура URL

```
/api/v2/{entity-type}/{action}/{id}
```

Примеры:
- `GET /api/v2/ami-users/123` - получить AMI пользователя
- `POST /api/v2/ami-users` - создать нового
- `PUT /api/v2/ami-users/123` - обновить существующего
- `DELETE /api/v2/ami-users/123` - удалить

### Организация файлов

```
src/
└── PBXCoreREST/
    ├── Controllers/
    │   └── {Entity}/
    │       ├── GetController.php
    │       ├── PostController.php
    │       ├── PutController.php
    │       └── DeleteController.php
    ├── Lib/
    │   ├── Common/
    │   │   ├── BaseRecordAction.php
    │   │   └── BaseDataStructure.php
    │   └── {Entity}/
    │       ├── GetRecordAction.php
    │       ├── SaveRecordAction.php
    │       ├── DeleteRecordAction.php
    │       └── DataStructure.php
    └── Workers/
        └── {Entity}Processor.php
```

## Пошаговая инструкция миграции {#пошаговая-инструкция}

### Шаг 1: Анализ существующего кода

1. Изучите текущий контроллер в `src/AdminCabinet/Controllers/{Entity}Controller.php`
2. Определите:
   - Поля модели и их типы
   - Правила валидации
   - Специфичную бизнес-логику
   - Связи с другими моделями

### Шаг 2: Создание REST контроллеров

#### 2.1. GetController.php

```php
<?php
namespace MikoPBX\PBXCoreREST\Controllers\AsteriskManagerUsers;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Workers\AsteriskManagerUsersProcessor;

class GetController extends BaseController
{
    public function callAction(string $actionName): void
    {
        $this->sendRequestToBackendWorker(
            AsteriskManagerUsersProcessor::class,
            $actionName,
            $_REQUEST
        );
    }
}
```

#### 2.2. PostController.php

```php
<?php
namespace MikoPBX\PBXCoreREST\Controllers\AsteriskManagerUsers;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Workers\AsteriskManagerUsersProcessor;

class PostController extends BaseController
{
    public function callAction(string $actionName): void
    {
        // Базовая санитизация через BaseController
        $postData = self::sanitizeData($this->request->getPost(), $this->filter);
        
        $this->sendRequestToBackendWorker(
            AsteriskManagerUsersProcessor::class,
            $actionName,
            $postData
        );
    }
}
```

### Шаг 3: Создание Processor

```php
<?php
namespace MikoPBX\PBXCoreREST\Workers;

use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\PBXCoreREST\Lib\AsteriskManagerUsers\{
    GetRecordAction,
    GetListAction,
    SaveRecordAction,
    DeleteRecordAction,
    CheckAvailableAction
};

class AsteriskManagerUsersProcessor extends WorkerBase
{
    public function start(array $argv): void
    {
        $this->setFilter();
        
        if (!isset($argv[3])) {
            return;
        }
        
        [$className, $actionName, $data] = json_decode($argv[3], true);
        
        $mappingActions = [
            'getRecord' => GetRecordAction::class,
            'getList' => GetListAction::class,
            'save' => SaveRecordAction::class,
            'delete' => DeleteRecordAction::class,
            'available' => CheckAvailableAction::class,
        ];
        
        if (isset($mappingActions[$actionName])) {
            $result = call_user_func([$mappingActions[$actionName], 'main'], $data);
            $this->echoResult($result);
        }
    }
}
```

### Шаг 4: Создание Actions

#### 4.1. GetRecordAction.php

```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\AsteriskManagerUsers;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\Common\BaseRecordAction;

class GetRecordAction extends BaseRecordAction
{
    public function process(): void
    {
        $this->processGetRecord(
            AsteriskManagerUsers::class,
            DataStructure::class
        );
    }
    
    protected function getDefaultStructure(): array
    {
        return [
            'id' => '',
            'username' => '',
            'secret' => AsteriskManagerUsers::generateAMIPassword(),
            'uniqid' => Extensions::generateUniqueID('AMI'),
            // Права доступа - дефолтные значения
            'call_read' => 'on',
            'call_write' => 'on',
            'cdr_read' => 'on',
            'cdr_write' => 'off',
            'originate_read' => 'on',
            'originate_write' => 'on',
            'reporting_read' => 'on',
            'reporting_write' => 'off',
            'agent_read' => 'on',
            'agent_write' => 'off',
            'config_read' => 'on',
            'config_write' => 'off',
            'dialplan_read' => 'on',
            'dialplan_write' => 'off',
            'dtmf_read' => 'on',
            'dtmf_write' => 'off',
            'log_read' => 'on',
            'log_write' => 'off',
            'system_read' => 'on',
            'system_write' => 'off',
            'user_read' => 'on',
            'user_write' => 'off',
            'verbose_read' => 'on',
            'verbose_write' => 'off',
            'command_read' => 'on',
            'command_write' => 'off',
            // Дополнительные поля
            'networkfilterid' => 'none',
            'description' => ''
        ];
    }
}
```

#### 4.2. SaveRecordAction.php

```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\AsteriskManagerUsers;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\PBXCoreREST\Lib\Common\BaseRecordAction;
use MikoPBX\Core\System\Util;

class SaveRecordAction extends BaseRecordAction
{
    /**
     * Правила санитизации для полей
     */
    protected array $sanitizationRules = [
        'username' => 'string|alphanumeric|lowercase|max:50',
        'secret' => 'string|raw', // Пароли не санитизируем
        'call_read' => 'string|in:on,off',
        'call_write' => 'string|in:on,off',
        'cdr_read' => 'string|in:on,off',
        'cdr_write' => 'string|in:on,off',
        'originate_read' => 'string|in:on,off',
        'originate_write' => 'string|in:on,off',
        'reporting_read' => 'string|in:on,off',
        'reporting_write' => 'string|in:on,off',
        'agent_read' => 'string|in:on,off',
        'agent_write' => 'string|in:on,off',
        'config_read' => 'string|in:on,off',
        'config_write' => 'string|in:on,off',
        'dialplan_read' => 'string|in:on,off',
        'dialplan_write' => 'string|in:on,off',
        'dtmf_read' => 'string|in:on,off',
        'dtmf_write' => 'string|in:on,off',
        'log_read' => 'string|in:on,off',
        'log_write' => 'string|in:on,off',
        'system_read' => 'string|in:on,off',
        'system_write' => 'string|in:on,off',
        'user_read' => 'string|in:on,off',
        'user_write' => 'string|in:on,off',
        'verbose_read' => 'string|in:on,off',
        'verbose_write' => 'string|in:on,off',
        'command_read' => 'string|in:on,off',
        'command_write' => 'string|in:on,off',
        'networkfilterid' => 'string|empty_to_null',
        'description' => 'string|html_escape|max:255'
    ];
    
    public function process(): void
    {
        $data = $this->request->getPost();
        
        // Применяем санитизацию
        $data = $this->sanitizeData($data);
        
        // Получаем или создаем модель
        if (!empty($data['id'])) {
            $record = AsteriskManagerUsers::findFirstById($data['id']);
            if (!$record) {
                $this->sendResponse([
                    'success' => false,
                    'messages' => ['error' => 'Record not found']
                ]);
                return;
            }
        } else {
            $record = new AsteriskManagerUsers();
            $record->uniqid = Extensions::generateUniqueID('AMI');
        }
        
        // Валидация username
        if (empty($data['username'])) {
            $this->sendResponse([
                'success' => false,
                'errors' => ['username' => 'Username is required']
            ]);
            return;
        }
        
        // Проверка уникальности
        if (!$this->checkUniqueness(
            AsteriskManagerUsers::class, 
            'username', 
            $data['username'], 
            $record->id
        )) {
            $this->sendResponse([
                'success' => false,
                'errors' => ['username' => 'Username already exists']
            ]);
            return;
        }
        
        // Заполнение модели
        $this->fillModel($record, $data);
        
        // Сохранение в транзакции
        $result = $this->executeInTransaction(function() use ($record) {
            if (!$record->save()) {
                throw new \Exception(implode(', ', $record->getMessages()));
            }
            
            // Перезагрузка Asterisk Manager
            Util::invokeActions('AsteriskManager');
            
            return true;
        });
        
        if ($result) {
            // Возвращаем обновленные данные
            $this->sendResponse([
                'success' => true,
                'data' => DataStructure::createFromModel($record)
            ]);
        } else {
            $this->sendResponse([
                'success' => false,
                'messages' => ['error' => 'Failed to save record']
            ]);
        }
    }
    
    private function fillModel(AsteriskManagerUsers $record, array $data): void
    {
        // Основные поля
        $record->username = $data['username'];
        
        if (!empty($data['secret'])) {
            $record->secret = $data['secret'];
        }
        
        // Права доступа
        $permissions = [
            'call', 'cdr', 'originate', 'reporting', 'agent',
            'config', 'dialplan', 'dtmf', 'log', 'system',
            'user', 'verbose', 'command'
        ];
        
        foreach ($permissions as $permission) {
            $readValue = $data["{$permission}_read"] ?? 'off';
            $writeValue = $data["{$permission}_write"] ?? 'off';
            
            if ($readValue === 'on' && $writeValue === 'on') {
                $record->$permission = 'readwrite';
            } elseif ($readValue === 'on') {
                $record->$permission = 'read';
            } elseif ($writeValue === 'on') {
                $record->$permission = 'write';
            } else {
                $record->$permission = '';
            }
        }
        
        // Дополнительные поля
        $record->networkfilterid = $data['networkfilterid'] ?? null;
        $record->description = $data['description'] ?? '';
    }
}
```

### Шаг 5: Создание DataStructure

```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\AsteriskManagerUsers;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\PBXCoreREST\Lib\Common\BaseDataStructure;

class DataStructure extends BaseDataStructure
{
    public static function createFromModel($model): array
    {
        $permissions = [
            'call', 'cdr', 'originate', 'reporting', 'agent',
            'config', 'dialplan', 'dtmf', 'log', 'system',
            'user', 'verbose', 'command'
        ];
        
        $data = [
            'id' => $model->id,
            'username' => $model->username,
            'secret' => $model->secret,
            'uniqid' => $model->uniqid,
            'networkfilterid' => $model->networkfilterid ?? 'none',
            'description' => $model->description ?? ''
        ];
        
        // Преобразование прав доступа
        foreach ($permissions as $permission) {
            $value = $model->$permission ?? '';
            $data["{$permission}_read"] = in_array($value, ['read', 'readwrite']) ? 'on' : 'off';
            $data["{$permission}_write"] = in_array($value, ['write', 'readwrite']) ? 'on' : 'off';
        }
        
        return $data;
    }
}
```

### Шаг 6: Создание JavaScript API

```javascript
// sites/admin-cabinet/assets/js/src/PbxAPI/asteriskManagerUsersAPI.js

const asteriskManagerUsersAPI = {
    /**
     * Базовый URL для API
     */
    apiUrl: `${globalRootUrl}api/v2/ami-users/`,
    
    /**
     * Получить запись по ID
     * @param {string} id - ID записи или пустая строка для новой
     * @param {function} callback - Функция обратного вызова
     */
    getRecord(id, callback) {
        // Для новых записей отправляем 'new'
        const recordId = (!id || id === '') ? 'new' : id;
        
        $.api({
            url: `${this.apiUrl}${recordId}`,
            method: 'GET',
            on: 'now',
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            }
        });
    },
    
    /**
     * Получить список записей
     * @param {function} callback - Функция обратного вызова
     */
    getList(callback) {
        $.api({
            url: this.apiUrl,
            method: 'GET',
            on: 'now',
            onSuccess(response) {
                callback(response);
            }
        });
    },
    
    /**
     * Сохранить запись
     * @param {object} data - Данные для сохранения
     * @param {function} callback - Функция обратного вызова
     */
    saveRecord(data, callback) {
        const method = data.id ? 'PUT' : 'POST';
        const url = data.id ? `${this.apiUrl}${data.id}` : this.apiUrl;
        
        $.api({
            url: url,
            method: method,
            data: data,
            on: 'now',
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            }
        });
    },
    
    /**
     * Удалить запись
     * @param {string} id - ID записи
     * @param {function} callback - Функция обратного вызова
     */
    deleteRecord(id, callback) {
        $.api({
            url: `${this.apiUrl}${id}`,
            method: 'DELETE',
            on: 'now',
            onSuccess(response) {
                callback(response);
            }
        });
    },
    
    /**
     * Проверить доступность username
     * @param {string} username - Имя пользователя
     * @param {string} currentId - ID текущей записи (для исключения)
     * @param {function} callback - Функция обратного вызова
     */
    checkAvailable(username, currentId, callback) {
        const params = currentId ? `?exclude=${currentId}` : '';
        
        $.api({
            url: `${this.apiUrl}available/${username}${params}`,
            method: 'GET',
            on: 'now',
            onSuccess(response) {
                callback(response);
            }
        });
    }
};
```

### Шаг 7: Модификация контроллера AdminCabinet

```php
<?php
namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\AsteriskManagerEditForm;
use MikoPBX\Common\Models\{AsteriskManagerUsers, NetworkFilters};
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;

class AsteriskManagersController extends BaseController
{
    private array $arrCheckBoxes = [
        'call', 'cdr', 'originate', 'reporting', 'agent',
        'config', 'dialplan', 'dtmf', 'log', 'system',
        'user', 'verbose', 'command'
    ];
    
    /**
     * Список AMI пользователей
     */
    public function indexAction(): void
    {
        // Страница списка - данные загружаются через REST API
    }
    
    /**
     * Форма редактирования
     * @param string $id ID записи или пустая строка для новой
     */
    public function modifyAction(string $id = ''): void
    {
        // Получаем данные через REST API
        $restAnswer = $this->di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
            '/pbxcore/api/asterisk-manager-users/getRecord',
            PBXCoreRESTClientProvider::HTTP_METHOD_GET,
            ['id' => $id]
        ]);
        
        if (!$restAnswer->success) {
            $this->flash->error(implode(', ', $restAnswer->messages));
            $this->dispatcher->forward([
                'controller' => 'asterisk-managers',
                'action' => 'index'
            ]);
            return;
        }
        
        $getRecordStructure = (object)$restAnswer->data;
        
        // Подготовка списка сетевых фильтров
        $arrNetworkFilters = [];
        $networkFilters = NetworkFilters::getAllowedFiltersForType(['AJAM', 'AMI']);
        $arrNetworkFilters['none'] = $this->translation->_('ex_NoNetworkFilter');
        foreach ($networkFilters as $filter) {
            $arrNetworkFilters[$filter->id] = $filter->getRepresent();
        }
        
        // Создаем форму на основе структуры данных из API
        $this->view->form = new AsteriskManagerEditForm(
            $getRecordStructure,
            [
                'network_filters' => $arrNetworkFilters,
                'array_of_checkboxes' => $this->arrCheckBoxes,
            ]
        );
        
        $this->view->setVar('arrCheckBoxes', $this->arrCheckBoxes);
        $this->view->setVar('recordId', $id);
        
        // Представление для заголовка
        if (!empty($getRecordStructure->id)) {
            $manager = AsteriskManagerUsers::findFirstById($getRecordStructure->id);
            $this->view->setVar('represent', $manager ? $manager->getRepresent() : '');
        } else {
            $this->view->setVar('represent', '');
        }
    }
}
```

### Шаг 8: Интеграция с Form.js

```javascript
// manager-modify.js
const manager = {
    $formObj: $('#ami-user-form'),
    
    /**
     * Правила валидации
     */
    validateRules: {
        username: {
            identifier: 'username',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.am_ValidateNameIsEmpty
                },
                {
                    type: 'regExp[/^[a-zA-Z0-9]+$/]',
                    prompt: globalTranslate.am_ValidateNameFormat
                }
            ]
        },
        secret: {
            identifier: 'secret',
            rules: [
                {
                    type: 'minLength[8]',
                    prompt: globalTranslate.am_ValidatePasswordTooShort
                }
            ]
        }
    },
    
    /**
     * Инициализация
     */
    initialize() {
        // Настройка Form.js
        Form.$formObj = manager.$formObj;
        Form.url = window.location.href; // Будет переопределен в cbBeforeSendForm
        Form.validateRules = manager.validateRules;
        Form.cbBeforeSendForm = manager.cbBeforeSendForm;
        Form.cbAfterSendForm = manager.cbAfterSendForm;
        
        // Инициализация Form.js
        Form.initialize();
        
        // Загрузка данных
        manager.initializeForm();
        
        // Дополнительные обработчики
        manager.initializeCallbacks();
    },
    
    /**
     * Загрузка данных формы
     */
    initializeForm() {
        const recordId = manager.getRecordId();
        
        asteriskManagerUsersAPI.getRecord(recordId, (response) => {
            if (response.success) {
                manager.populateForm(response.data);
            }
        });
    },
    
    /**
     * Получение ID записи
     */
    getRecordId() {
        // Приоритет: форма -> URL -> пустая строка
        const formId = $('#id').val();
        if (formId) return formId;
        
        const urlParts = window.location.pathname.split('/');
        const modifyIndex = urlParts.indexOf('modify');
        if (modifyIndex !== -1 && urlParts[modifyIndex + 1]) {
            return urlParts[modifyIndex + 1];
        }
        
        return '';
    },
    
    /**
     * Callback перед отправкой формы
     */
    cbBeforeSendForm(settings) {
        const formData = Form.$formObj.form('get values');
        
        // Подготовка данных для API
        const apiData = manager.prepareApiData(formData);
        
        // Настройка для REST API
        settings.method = apiData.id ? 'PUT' : 'POST';
        settings.url = apiData.id ? 
            `${asteriskManagerUsersAPI.apiUrl}${apiData.id}` : 
            asteriskManagerUsersAPI.apiUrl;
        settings.data = JSON.stringify(apiData);
        settings.contentType = 'application/json';
        settings.processData = false;
        
        return settings;
    },
    
    /**
     * Callback после отправки формы
     */
    cbAfterSendForm(response) {
        if (response.success) {
            // Обновляем форму новыми данными
            if (response.data) {
                manager.populateForm(response.data);
            }
            
            // Обновляем URL для новых записей
            const currentId = $('#id').val();
            if (!currentId && response.data && response.data.id) {
                const newUrl = window.location.href.replace(/modify\/?$/, `modify/${response.data.id}`);
                window.history.pushState(null, '', newUrl);
            }
            
            // Показываем сообщение об успехе
            UserMessage.showSuccess(globalTranslate.am_UserSaved);
        } else {
            // Обработка ошибок валидации
            if (response.errors) {
                manager.showValidationErrors(response.errors);
            }
        }
    },
    
    /**
     * Подготовка данных для API
     */
    prepareApiData(formData) {
        // Обработка чекбоксов permissions
        const permissions = [
            'call', 'cdr', 'originate', 'reporting', 'agent',
            'config', 'dialplan', 'dtmf', 'log', 'system',
            'user', 'verbose', 'command'
        ];
        
        permissions.forEach((permission) => {
            // Semantic UI возвращает 'on' для отмеченных чекбоксов
            formData[`${permission}_read`] = formData[`${permission}_read`] === 'on' ? 'on' : 'off';
            formData[`${permission}_write`] = formData[`${permission}_write`] === 'on' ? 'on' : 'off';
        });
        
        return formData;
    },
    
    /**
     * Заполнение формы данными
     */
    populateForm(data) {
        // Используем стандартный метод Form.js
        Form.$formObj.form('set values', data);
        
        // Обработка чекбоксов
        manager.setPermissionCheckboxes(data);
        
        // Сохраняем начальные значения для dirrti checking
        if (Form.enableDirrity) {
            Form.saveInitialValues();
        }
    },
    
    /**
     * Установка значений чекбоксов
     */
    setPermissionCheckboxes(data) {
        const permissions = [
            'call', 'cdr', 'originate', 'reporting', 'agent',
            'config', 'dialplan', 'dtmf', 'log', 'system',
            'user', 'verbose', 'command'
        ];
        
        permissions.forEach((permission) => {
            const readField = `${permission}_read`;
            const writeField = `${permission}_write`;
            
            // Semantic UI checkbox
            if (data[readField] === 'on') {
                $(`#${readField}`).checkbox('check');
            } else {
                $(`#${readField}`).checkbox('uncheck');
            }
            
            if (data[writeField] === 'on') {
                $(`#${writeField}`).checkbox('check');
            } else {
                $(`#${writeField}`).checkbox('uncheck');
            }
        });
    },
    
    /**
     * Показ ошибок валидации
     */
    showValidationErrors(errors) {
        // Очистка предыдущих ошибок
        Form.$formObj.find('.field.error').removeClass('error');
        Form.$formObj.find('.ui.pointing.red.label').remove();
        
        // Отображение новых ошибок
        Object.keys(errors).forEach(field => {
            const $field = Form.$formObj.find(`[name="${field}"]`);
            if ($field.length) {
                $field.closest('.field').addClass('error');
                $field.after(`<div class="ui pointing red label">${errors[field]}</div>`);
            }
        });
    },
    
    /**
     * Дополнительные обработчики
     */
    initializeCallbacks() {
        // Проверка доступности username
        $('#username').on('blur', () => {
            const username = $('#username').val();
            const currentId = $('#id').val();
            
            if (username) {
                asteriskManagerUsersAPI.checkAvailable(username, currentId, (response) => {
                    if (!response.available) {
                        $('#username').closest('.field').addClass('error');
                        $('#username').after(
                            `<div class="ui pointing red label">${globalTranslate.am_UsernameNotAvailable}</div>`
                        );
                    }
                });
            }
        });
        
        // Генерация пароля
        $('#generate-password').on('click', (e) => {
            e.preventDefault();
            $.api({
                url: `${asteriskManagerUsersAPI.apiUrl}generate-password`,
                method: 'GET',
                on: 'now',
                onSuccess(response) {
                    if (response.password) {
                        $('#secret').val(response.password);
                    }
                }
            });
        });
    }
};

// Инициализация при загрузке документа
$(document).ready(() => {
    manager.initialize();
});
```

### Шаг 9: Интеграция с DataTable для списка

```javascript
// managers-index.js
const managersTable = {
    $amiUsersTable: $('#ami-users-table'),
    dataTable: {},
    
    /**
     * Инициализация
     */
    initialize() {
        managersTable.initializeDataTable();
    },
    
    /**
     * Инициализация DataTable
     */
    initializeDataTable() {
        managersTable.dataTable = managersTable.$amiUsersTable.DataTable({
            ajax: {
                url: asteriskManagerUsersAPI.apiUrl + 'getList',
                dataSrc: function(json) {
                    // Управление пустым состоянием
                    managersTable.toggleEmptyPlaceholder(json.data.length === 0);
                    return json.data;
                }
            },
            columns: [
                {
                    data: 'username',
                    render: function(data, type, row) {
                        return `<strong>${data}</strong>`;
                    }
                },
                {
                    data: 'description',
                    className: 'hide-on-mobile',
                    responsivePriority: 2
                },
                {
                    data: 'networkfilterid',
                    className: 'hide-on-mobile',
                    responsivePriority: 3,
                    render: function(data) {
                        return data === 'none' ? 
                            globalTranslate.ex_NoNetworkFilter : 
                            data;
                    }
                },
                {
                    data: null,
                    orderable: false,
                    searchable: false,
                    className: 'right aligned',
                    responsivePriority: 1,
                    render: function(data, type, row) {
                        return `<div class="ui basic icon buttons action-buttons">
                            <a href="${globalRootUrl}asterisk-managers/modify/${row.id}" 
                               class="ui button popuped" 
                               data-content="${globalTranslate.bt_ToolTipEdit}">
                                <i class="edit icon"></i>
                            </a>
                            <a href="#" 
                               data-value="${row.id}" 
                               class="ui button delete two-steps-delete popuped" 
                               data-content="${globalTranslate.bt_ToolTipDelete}">
                                <i class="trash red icon"></i>
                            </a>
                        </div>`;
                    }
                }
            ],
            order: [[0, 'asc']],
            responsive: true,
            searching: false,
            paging: false,
            info: false,
            language: SemanticLocalization.dataTableLocalisation,
            drawCallback: function() {
                // Инициализация Semantic UI элементов
                managersTable.$amiUsersTable.find('.popuped').popup();
                
                // Двойной клик для редактирования
                managersTable.initializeDoubleClickEdit();
            }
        });
        
        // Обработка удаления с использованием DeleteSomething.js
        managersTable.$amiUsersTable.on('click', 'a.delete', function(e) {
            e.preventDefault();
            const $button = $(this);
            
            // Второй клик - выполняем удаление
            if (!$button.hasClass('two-steps-delete')) {
                const managerId = $button.attr('data-value');
                $button.addClass('loading');
                
                asteriskManagerUsersAPI.deleteRecord(managerId, managersTable.cbAfterDeleteRecord);
            }
        });
    },
    
    /**
     * Переключение видимости заглушки
     */
    toggleEmptyPlaceholder(isEmpty) {
        if (isEmpty) {
            managersTable.$amiUsersTable.hide();
            $('#add-new-button').hide();
            $('#empty-table-placeholder').show();
        } else {
            $('#empty-table-placeholder').hide();
            $('#add-new-button').show();
            managersTable.$amiUsersTable.show();
        }
    },
    
    /**
     * Callback после удаления
     */
    cbAfterDeleteRecord(response) {
        if (response.success) {
            managersTable.dataTable.ajax.reload();
            UserMessage.showSuccess(globalTranslate.am_UserDeleted);
        } else {
            UserMessage.showError(
                response.messages?.error || 
                globalTranslate.js_ImpossibleToDeleteRecord
            );
        }
        $('a.delete').removeClass('loading');
    },
    
    /**
     * Двойной клик для редактирования
     */
    initializeDoubleClickEdit() {
        managersTable.$amiUsersTable.on('dblclick', 'tbody tr', function() {
            const data = managersTable.dataTable.row(this).data();
            if (data && data.id) {
                window.location = `${globalRootUrl}asterisk-managers/modify/${data.id}`;
            }
        });
    }
};

// Инициализация при загрузке документа
$(document).ready(() => {
    managersTable.initialize();
});
```

### Шаг 10: Обновление маршрутов Phalcon

```php
// В файле маршрутов добавить:

// REST API маршруты для AMI пользователей
$router->addGet('/api/v2/ami-users', [
    'controller' => 'AsteriskManagerUsers\Get',
    'action' => 'getList'
]);

$router->addGet('/api/v2/ami-users/{id}', [
    'controller' => 'AsteriskManagerUsers\Get',
    'action' => 'getRecord'
]);

$router->addPost('/api/v2/ami-users', [
    'controller' => 'AsteriskManagerUsers\Post',
    'action' => 'save'
]);

$router->addPut('/api/v2/ami-users/{id}', [
    'controller' => 'AsteriskManagerUsers\Put',
    'action' => 'save'
]);

$router->addDelete('/api/v2/ami-users/{id}', [
    'controller' => 'AsteriskManagerUsers\Delete',
    'action' => 'delete'
]);

$router->addGet('/api/v2/ami-users/available/{username}', [
    'controller' => 'AsteriskManagerUsers\Get',
    'action' => 'available'
]);
```

## Базовые классы и компоненты {#базовые-классы}

### BaseRecordAction

```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\Common;

use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Injectable;

abstract class BaseRecordAction extends Injectable
{
    protected array $sanitizationRules = [];
    
    /**
     * Обработка GET запросов для получения записи
     */
    protected function processGetRecord(string $modelClass, string $dataStructureClass): void
    {
        $recordId = $this->request->get('id');
        
        // Обработка новых записей
        if (empty($recordId) || $recordId === 'new') {
            $data = $this->getDefaultStructure();
            
            $this->sendResponse([
                'success' => true,
                'data' => $data
            ]);
            return;
        }
        
        // Обработка существующих записей
        $record = $modelClass::findFirstById($recordId);
        
        if (!$record) {
            $this->sendResponse([
                'success' => false,
                'messages' => ['error' => 'Record not found']
            ]);
            return;
        }
        
        $data = $dataStructureClass::createFromModel($record);
        
        $this->sendResponse([
            'success' => true,
            'data' => $data
        ]);
    }
    
    /**
     * Возвращает структуру данных для новой записи
     */
    abstract protected function getDefaultStructure(): array;
    
    /**
     * Санитизация входных данных
     */
    protected function sanitizeData(array $data): array
    {
        foreach ($this->sanitizationRules as $field => $rules) {
            if (!isset($data[$field])) {
                continue;
            }
            
            $data[$field] = $this->applySanitizationRules(
                $data[$field], 
                $rules
            );
        }
        
        return $data;
    }
    
    /**
     * Применение правил санитизации
     */
    private function applySanitizationRules($value, string $rules)
    {
        $ruleList = explode('|', $rules);
        
        foreach ($ruleList as $rule) {
            $value = $this->applySingleRule($value, $rule);
        }
        
        return $value;
    }
    
    /**
     * Применение одного правила санитизации
     */
    private function applySingleRule($value, string $rule)
    {
        [$ruleName, $parameter] = array_pad(explode(':', $rule), 2, null);
        
        switch ($ruleName) {
            case 'string':
                return (string)$value;
                
            case 'integer':
                return (int)$value;
                
            case 'boolean':
                return filter_var($value, FILTER_VALIDATE_BOOLEAN);
                
            case 'numeric':
                return preg_replace('/\D/', '', $value);
                
            case 'alphanumeric':
                return preg_replace('/[^a-zA-Z0-9]/', '', $value);
                
            case 'lowercase':
                return strtolower($value);
                
            case 'uppercase':
                return strtoupper($value);
                
            case 'html_escape':
                return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
                
            case 'max':
                return mb_substr($value, 0, (int)$parameter);
                
            case 'min':
                return strlen($value) >= (int)$parameter ? $value : '';
                
            case 'empty_to_null':
                return empty($value) ? null : $value;
                
            case 'raw':
                return $value; // Не применять санитизацию
                
            case 'hash':
                return hash($parameter, $value);
                
            case 'encrypt':
                return $this->encryptValue($value);
                
            case 'email':
                return filter_var($value, FILTER_SANITIZE_EMAIL);
                
            case 'url':
                return filter_var($value, FILTER_SANITIZE_URL);
                
            case 'ip':
                return filter_var($value, FILTER_VALIDATE_IP) ? $value : '';
                
            case 'domain':
                return $this->sanitizeDomain($value);
                
            case 'phone':
                return preg_replace('/[^0-9+\-\(\)\s]/', '', $value);
                
            case 'in':
                $allowed = explode(',', $parameter);
                return in_array($value, $allowed) ? $value : $allowed[0];
                
            case 'not_in':
                $disallowed = explode(',', $parameter);
                return in_array($value, $disallowed) ? '' : $value;
                
            case 'range':
                [$min, $max] = explode('-', $parameter);
                return max($min, min($max, $value));
                
            case 'regex':
                preg_match($parameter, $value, $matches);
                return $matches[0] ?? '';
                
            case 'sanitize_callerid':
                return preg_replace('/[^\w\s\-\(\)\+]/', '', $value);
                
            case 'sanitize_sip':
                return preg_replace('/[^a-zA-Z0-9\-_\.]/', '', $value);
                
            case 'ip_or_domain':
                if (filter_var($value, FILTER_VALIDATE_IP)) {
                    return $value;
                }
                return $this->sanitizeDomain($value);
                
            case 'json':
                $decoded = json_decode($value, true);
                return json_last_error() === JSON_ERROR_NONE ? $decoded : [];
                
            case 'array':
                return is_array($value) ? $value : [];
                
            case 'trim':
                return trim($value);
                
            case 'base64':
                return base64_decode($value) !== false ? $value : '';
                
            default:
                return $value;
        }
    }
    
    /**
     * Проверка уникальности значения
     */
    protected function checkUniqueness(string $model, string $field, $value, ?string $excludeId = null): bool
    {
        $conditions = [$field . ' = :value:'];
        $bind = ['value' => $value];
        
        if ($excludeId) {
            $conditions[] = 'id != :id:';
            $bind['id'] = $excludeId;
        }
        
        $record = $model::findFirst([
            'conditions' => implode(' AND ', $conditions),
            'bind' => $bind
        ]);
        
        return $record === null;
    }
    
    /**
     * Выполнение в транзакции
     */
    protected function executeInTransaction(callable $callback)
    {
        $transaction = $this->di->get('db')->beginTransaction();
        
        try {
            $result = $callback($transaction);
            $transaction->commit();
            return $result;
        } catch (\Exception $e) {
            $transaction->rollback();
            $this->logger->error($e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Отправка ответа
     */
    protected function sendResponse(array $data): void
    {
        $result = new PBXApiResult();
        $result->success = $data['success'] ?? false;
        
        if (isset($data['data'])) {
            $result->data = $data['data'];
        }
        
        if (isset($data['messages'])) {
            $result->messages = $data['messages'];
        }
        
        if (isset($data['errors'])) {
            $result->messages['error'] = $data['errors'];
        }
        
        echo json_encode($result);
    }
    
    /**
     * Санитизация домена
     */
    private function sanitizeDomain(string $value): string
    {
        $value = strtolower($value);
        $value = preg_replace('/[^a-z0-9\-\.]/', '', $value);
        $value = preg_replace('/\.{2,}/', '.', $value);
        $value = trim($value, '.');
        
        return $value;
    }
    
    /**
     * Шифрование значения
     */
    private function encryptValue(string $value): string
    {
        // Использовать существующий механизм шифрования MikoPBX
        return $this->security->encrypt($value);
    }
}
```

### CommonRestAPI JavaScript класс

```javascript
/**
 * Базовый класс для REST API
 */
class CommonRestAPI {
    /**
     * Конструктор
     * @param {string} apiUrl - Базовый URL для API
     * @param {string} entityName - Название сущности для логирования
     */
    constructor(apiUrl, entityName) {
        this.apiUrl = globalRootUrl + apiUrl;
        this.entityName = entityName;
    }
    
    /**
     * Получить запись
     * @param {string} id - ID записи или 'new' для новой записи
     * @param {function} callback - Функция обратного вызова
     */
    getRecord(id, callback) {
        const recordId = (!id || id === '') ? 'new' : id;
        
        $.api({
            url: `${this.apiUrl}${recordId}`,
            method: 'GET',
            on: 'now',
            onSuccess: (response) => {
                if (typeof callback === 'function') {
                    callback(response);
                }
            },
            onFailure: (response) => {
                this.handleError(response);
                if (typeof callback === 'function') {
                    callback(response);
                }
            }
        });
    }
    
    /**
     * Получить список записей
     * @param {object} params - Параметры запроса
     * @param {function} callback - Функция обратного вызова
     */
    getList(params = {}, callback) {
        $.api({
            url: this.apiUrl,
            method: 'GET',
            data: params,
            on: 'now',
            onSuccess: (response) => {
                if (typeof callback === 'function') {
                    callback(response);
                }
            },
            onFailure: (response) => {
                this.handleError(response);
                if (typeof callback === 'function') {
                    callback(response);
                }
            }
        });
    }
    
    /**
     * Сохранить запись
     * @param {object} data - Данные для сохранения
     * @param {function} callback - Функция обратного вызова
     */
    saveRecord(data, callback) {
        // Санитизация на клиенте
        data = this.sanitizeData(data);
        
        const method = data.id ? 'PUT' : 'POST';
        const url = data.id ? `${this.apiUrl}${data.id}` : this.apiUrl;
        
        $.api({
            url: url,
            method: method,
            data: data,
            on: 'now',
            onSuccess: (response) => {
                if (response.success) {
                    if (typeof callback === 'function') {
                        callback(response);
                    }
                } else {
                    this.showValidationErrors(response.errors || {});
                    if (typeof callback === 'function') {
                        callback(response);
                    }
                }
            },
            onFailure: (response) => {
                this.handleError(response);
                if (typeof callback === 'function') {
                    callback(response);
                }
            }
        });
    }
    
    /**
     * Удалить запись
     * @param {string} id - ID записи
     * @param {function} callback - Функция обратного вызова
     */
    deleteRecord(id, callback) {
        $.api({
            url: `${this.apiUrl}${id}`,
            method: 'DELETE',
            on: 'now',
            onSuccess: (response) => {
                if (typeof callback === 'function') {
                    callback(response);
                }
            },
            onFailure: (response) => {
                this.handleError(response);
                if (typeof callback === 'function') {
                    callback(response);
                }
            }
        });
    }
    
    /**
     * Выполнить произвольное действие
     * @param {string} action - Название действия
     * @param {object} params - Параметры
     * @param {function} callback - Функция обратного вызова
     * @param {string} method - HTTP метод (по умолчанию GET)
     */
    performAction(action, params = {}, callback, method = 'GET') {
        $.api({
            url: `${this.apiUrl}${action}`,
            method: method,
            data: params,
            on: 'now',
            onSuccess: (response) => {
                if (typeof callback === 'function') {
                    callback(response);
                }
            },
            onFailure: (response) => {
                this.handleError(response);
                if (typeof callback === 'function') {
                    callback(response);
                }
            }
        });
    }
    
    /**
     * Базовая санитизация на клиенте
     * @param {object} data - Данные для санитизации
     * @returns {object} - Санитизированные данные
     */
    sanitizeData(data) {
        const sanitized = {};
        
        Object.keys(data).forEach(key => {
            let value = data[key];
            
            // Удаляем пустые значения (кроме false и 0)
            if (value === '' || value === null || value === undefined) {
                return;
            }
            
            // Базовая санитизация строк
            if (typeof value === 'string') {
                value = value.trim();
            }
            
            sanitized[key] = value;
        });
        
        return sanitized;
    }
    
    /**
     * Обработка ошибок
     * @param {object} response - Ответ с ошибкой
     */
    handleError(response) {
        console.error(`${this.entityName} API Error:`, response);
        
        const message = response.message || 
                       response.messages?.error || 
                       'An error occurred';
                       
        UserMessage.showError(message);
    }
    
    /**
     * Показ ошибок валидации
     * @param {object} errors - Объект с ошибками
     */
    showValidationErrors(errors) {
        // Очистка предыдущих ошибок
        $('.field.error').removeClass('error');
        $('.ui.pointing.red.label').remove();
        
        // Отображение новых ошибок
        Object.keys(errors).forEach(field => {
            const $field = $(`[name="${field}"]`);
            if ($field.length) {
                const $fieldContainer = $field.closest('.field');
                $fieldContainer.addClass('error');
                
                // Создаем сообщение об ошибке
                const $errorLabel = $('<div>')
                    .addClass('ui pointing red label')
                    .text(errors[field]);
                
                // Добавляем после поля
                $field.after($errorLabel);
            }
        });
    }
    
    /**
     * Очистка ошибок валидации
     */
    clearValidationErrors() {
        $('.field.error').removeClass('error');
        $('.ui.pointing.red.label').remove();
    }
}

// Использование:
// const myAPI = new CommonRestAPI('api/v2/my-entity/', 'MyEntity');
// myAPI.getRecord('123', (response) => { ... });
// myAPI.saveRecord(data, (response) => { ... });
// myAPI.deleteRecord('123', (response) => { ... });
```

## Работа с санитизацией данных {#санитизация-данных}

### Правила санитизации

Санитизация происходит в два этапа:

1. **Базовая санитизация в контроллере** - защита от XSS
2. **Специфичная санитизация в Action** - бизнес-правила

### Доступные правила санитизации

#### Базовые типы
- `string` - приведение к строке
- `integer` - приведение к целому числу  
- `boolean` - приведение к булевому значению
- `float` - приведение к числу с плавающей точкой
- `array` - проверка что значение является массивом
- `json` - валидация и декодирование JSON

#### Модификаторы строк
- `alphanumeric` - только буквы и цифры
- `alpha` - только буквы
- `numeric` - только цифры
- `lowercase` - приведение к нижнему регистру
- `uppercase` - приведение к верхнему регистру
- `trim` - удаление пробелов
- `html_escape` - экранирование HTML символов
- `url_encode` - URL кодирование
- `base64` - проверка Base64 формата

#### Валидаторы
- `email` - валидация email адреса
- `url` - валидация URL
- `ip` - валидация IP адреса
- `domain` - валидация доменного имени
- `phone` - валидация телефонного номера

#### Ограничения
- `max:N` - максимальная длина строки
- `min:N` - минимальная длина строки
- `range:MIN-MAX` - диапазон для чисел
- `in:val1,val2,val3` - whitelist значений
- `not_in:val1,val2` - blacklist значений
- `regex:/pattern/` - проверка по регулярному выражению

#### Специальные правила
- `raw` - не применять санитизацию (для паролей)
- `empty_to_null` - пустые значения в NULL
- `encrypt` - шифрование значения
- `hash:algorithm` - хеширование (md5, sha256, etc)
- `sanitize_callerid` - санитизация CallerID
- `sanitize_sip` - санитизация SIP username
- `ip_or_domain` - IP адрес или домен

### Примеры правил для разных типов полей

```php
// Для Extensions
protected array $sanitizationRules = [
    'number' => 'string|numeric|regex:/^[0-9]{2,6}$/',
    'callerid' => 'string|sanitize_callerid|max:50',
    'email' => 'string|email|lowercase|empty_to_null',
    'mobile' => 'string|phone|empty_to_null',
    'is_general_user_number' => 'boolean'
];

// Для Providers
protected array $sanitizationRules = [
    'type' => 'string|in:sip,iax',
    'host' => 'string|ip_or_domain',
    'port' => 'integer|range:1-65535',
    'username' => 'string|alphanumeric',
    'secret' => 'string|encrypt',
    'dtmfmode' => 'string|in:rfc2833,inband,info,auto'
];

// Для CallQueues
protected array $sanitizationRules = [
    'name' => 'string|html_escape|max:100',
    'extension' => 'string|numeric|regex:/^[0-9]{2,6}$/',
    'strategy' => 'string|in:ringall,leastrecent,fewestcalls,random,rrmemory,linear,wrandom',
    'timeout' => 'integer|range:1-300',
    'members' => 'array',
    'description' => 'string|html_escape|max:255'
];
```

## Интеграция с UI компонентами {#интеграция-ui}

### Работа с Fomantic UI формами

#### Инициализация формы

```javascript
// Настройка Fomantic UI формы
$('.ui.form').form({
    fields: {
        username: {
            identifier: 'username',
            rules: [
                {
                    type: 'empty',
                    prompt: 'Please enter username'
                },
                {
                    type: 'regExp[/^[a-zA-Z0-9]+$/]',
                    prompt: 'Username can only contain letters and numbers'
                }
            ]
        },
        email: {
            identifier: 'email',
            rules: [
                {
                    type: 'email',
                    prompt: 'Please enter a valid email'
                }
            ]
        }
    }
});
```

#### Работа с dropdown

```javascript
// Инициализация dropdown
$('.ui.dropdown').dropdown({
    allowAdditions: false,
    fullTextSearch: true,
    onChange: function(value, text, $selectedItem) {
        // Обработка изменения
    }
});

// Установка значения
$('#networkfilterid').dropdown('set selected', 'none');

// Получение значения
const value = $('#networkfilterid').dropdown('get value');
```

#### Работа с checkbox

```javascript
// Инициализация checkbox
$('.ui.checkbox').checkbox();

// Установка значения
$('#call_read').checkbox('check');
$('#call_write').checkbox('uncheck');

// Получение значения
const isChecked = $('#call_read').checkbox('is checked');

// Обработчик изменения
$('#call_read').checkbox({
    onChange: function() {
        const checked = $(this).checkbox('is checked');
        // Дополнительная логика
    }
});
```

### Работа с DataTable

#### Базовая конфигурация

```javascript
const dataTableConfig = {
    ajax: {
        url: myAPI.apiUrl + 'getList',
        dataSrc: function(json) {
            // Проверка на пустые данные
            if (json.data.length === 0) {
                $('#table-container').hide();
                $('#empty-placeholder').show();
            } else {
                $('#empty-placeholder').hide();
                $('#table-container').show();
            }
            return json.data;
        }
    },
    columns: [
        {
            data: 'name',
            render: function(data, type, row) {
                return `<strong>${data}</strong>`;
            }
        },
        {
            data: 'description',
            className: 'hide-on-mobile',
            responsivePriority: 2
        },
        {
            data: null,
            orderable: false,
            searchable: false,
            className: 'right aligned',
            responsivePriority: 1,
            render: function(data, type, row) {
                return `<div class="ui basic icon buttons action-buttons">
                    <a href="${globalRootUrl}entity/modify/${row.id}" 
                       class="ui button popuped" 
                       data-content="${globalTranslate.bt_ToolTipEdit}">
                        <i class="edit icon"></i>
                    </a>
                    <a href="#" 
                       data-value="${row.id}" 
                       class="ui button delete two-steps-delete popuped" 
                       data-content="${globalTranslate.bt_ToolTipDelete}">
                        <i class="trash red icon"></i>
                    </a>
                </div>`;
            }
        }
    ],
    order: [[0, 'asc']],
    responsive: true,
    searching: false,
    paging: false,
    info: false,
    language: SemanticLocalization.dataTableLocalisation,
    drawCallback: function() {
        // Инициализация UI элементов после отрисовки
        $('.popuped').popup();
    }
};
```

### Шаблон пустой таблицы (Volt)

```volt
<table class="ui very compact unstackable table" id="entity-table">
    <thead>
        <tr>
            <th>{{ t._('entity_TableColumnName') }}</th>
            <th>{{ t._('entity_TableColumnDescription') }}</th>
            <th></th>
        </tr>
    </thead>
    <tbody>
    </tbody>
</table>

<div id="empty-table-placeholder" style="display: none;">
    {{ partial("partials/emptyTablePlaceholder", [
        'icon': 'asterisk',
        'title': t._('entity_EmptyTableTitle'),
        'description': t._('entity_EmptyTableDescription'),
        'addButtonText': '<i class="add circle icon"></i> '~t._('entity_AddNewItem'),
        'addButtonLink': 'entity/modify',
        'showButton': isAllowed('save'),
        'documentationLink': 'https://wiki.mikopbx.com/entity'
    ]) }}
</div>
```

## Примеры реализации {#примеры-реализации}

### Пример 1: Providers (SIP/IAX)

#### GetRecordAction.php

```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\Providers;

use MikoPBX\Common\Models\{Providers, Extensions};
use MikoPBX\PBXCoreREST\Lib\Common\BaseRecordAction;

class GetRecordAction extends BaseRecordAction
{
    public function process(): void
    {
        $this->processGetRecord(
            Providers::class,
            DataStructure::class
        );
    }
    
    protected function getDefaultStructure(): array
    {
        return [
            'id' => '',
            'uniqid' => Extensions::generateUniqueID('PROV'),
            'type' => 'sip',
            'provider_name' => '',
            'host' => '',
            'port' => '5060',
            'username' => '',
            'secret' => '',
            'dtmfmode' => 'auto',
            'nat' => 'auto_force_rport',
            'qualify' => 'yes',
            'qualifyfreq' => '60',
            'registration_type' => 'outbound',
            'sip_defaultuser' => '',
            'from_user' => '',
            'from_domain' => '',
            'noregister' => '0',
            'receive_calls_without_auth' => '0',
            'description' => '',
            'manualattributes' => '',
            'disablefromuser' => '0',
            'ipaddr' => '',
            'disabled' => '0'
        ];
    }
}
```

#### SaveRecordAction.php

```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\Providers;

use MikoPBX\Common\Models\{Providers, Extensions, Sip, Iax};
use MikoPBX\PBXCoreREST\Lib\Common\BaseRecordAction;
use MikoPBX\Core\System\Util;

class SaveRecordAction extends BaseRecordAction
{
    protected array $sanitizationRules = [
        'type' => 'string|in:sip,iax',
        'provider_name' => 'string|html_escape|max:100',
        'host' => 'string|ip_or_domain',
        'port' => 'integer|range:1-65535',
        'username' => 'string|sanitize_sip',
        'secret' => 'string|raw',
        'dtmfmode' => 'string|in:rfc2833,inband,info,auto',
        'nat' => 'string|in:yes,no,force_rport,comedia,auto_force_rport,auto_comedia',
        'qualify' => 'string',
        'qualifyfreq' => 'integer|range:10-3600',
        'registration_type' => 'string|in:none,outbound,inbound',
        'sip_defaultuser' => 'string|sanitize_sip|empty_to_null',
        'from_user' => 'string|sanitize_sip|empty_to_null',
        'from_domain' => 'string|domain|empty_to_null',
        'noregister' => 'boolean',
        'receive_calls_without_auth' => 'boolean',
        'description' => 'string|html_escape|max:255',
        'manualattributes' => 'string|max:1000',
        'disablefromuser' => 'boolean',
        'disabled' => 'boolean'
    ];
    
    public function process(): void
    {
        $data = $this->request->getPost();
        $data = $this->sanitizeData($data);
        
        // Валидация обязательных полей
        $errors = $this->validateRequiredFields($data);
        if (!empty($errors)) {
            $this->sendResponse([
                'success' => false,
                'errors' => $errors
            ]);
            return;
        }
        
        // Получаем или создаем модель
        if (!empty($data['id'])) {
            $provider = Providers::findFirstById($data['id']);
            if (!$provider) {
                $this->sendResponse([
                    'success' => false,
                    'messages' => ['error' => 'Provider not found']
                ]);
                return;
            }
        } else {
            $provider = new Providers();
            $provider->uniqid = Extensions::generateUniqueID('PROV');
        }
        
        // Проверка уникальности имени
        if (!$this->checkUniqueness(
            Providers::class,
            'provider_name',
            $data['provider_name'],
            $provider->id
        )) {
            $this->sendResponse([
                'success' => false,
                'errors' => ['provider_name' => 'Provider name already exists']
            ]);
            return;
        }
        
        // Сохранение в транзакции
        $result = $this->executeInTransaction(function($transaction) use ($provider, $data) {
            // Заполнение основной модели
            $this->fillProviderModel($provider, $data);
            
            if (!$provider->save()) {
                throw new \Exception(implode(', ', $provider->getMessages()));
            }
            
            // Сохранение SIP/IAX настроек
            if ($data['type'] === 'sip') {
                $this->saveSipSettings($provider, $data, $transaction);
            } else {
                $this->saveIaxSettings($provider, $data, $transaction);
            }
            
            return true;
        });
        
        if ($result) {
            // Перезагрузка конфигурации
            Util::invokeActions(['DialplanApplications', 'SIPConf', 'IAXConf']);
            
            $this->sendResponse([
                'success' => true,
                'data' => DataStructure::createFromModel($provider)
            ]);
        } else {
            $this->sendResponse([
                'success' => false,
                'messages' => ['error' => 'Failed to save provider']
            ]);
        }
    }
    
    private function validateRequiredFields(array $data): array
    {
        $errors = [];
        
        if (empty($data['provider_name'])) {
            $errors['provider_name'] = 'Provider name is required';
        }
        
        if (empty($data['host'])) {
            $errors['host'] = 'Host is required';
        }
        
        if ($data['registration_type'] !== 'none' && empty($data['username'])) {
            $errors['username'] = 'Username is required for registration';
        }
        
        return $errors;
    }
    
    private function fillProviderModel(Providers $provider, array $data): void
    {
        $provider->type = $data['type'];
        $provider->provider_name = $data['provider_name'];
        $provider->description = $data['description'] ?? '';
        $provider->disabled = $data['disabled'] ? '1' : '0';
    }
    
    private function saveSipSettings(Providers $provider, array $data, $transaction): void
    {
        $sip = Sip::findFirstByUniqid($provider->uniqid);
        if (!$sip) {
            $sip = new Sip();
            $sip->uniqid = $provider->uniqid;
        }
        
        $sip->type = 'friend';
        $sip->host = $data['host'];
        $sip->port = $data['port'];
        $sip->username = $data['username'] ?? '';
        $sip->secret = $data['secret'] ?? '';
        $sip->dtmfmode = $data['dtmfmode'];
        $sip->nat = $data['nat'];
        $sip->qualify = $data['qualify'];
        $sip->qualifyfreq = $data['qualifyfreq'];
        $sip->defaultuser = $data['sip_defaultuser'] ?? '';
        $sip->fromuser = $data['from_user'] ?? '';
        $sip->fromdomain = $data['from_domain'] ?? '';
        $sip->noregister = $data['noregister'] ? '1' : '0';
        $sip->receive_calls_without_auth = $data['receive_calls_without_auth'] ? '1' : '0';
        $sip->manualattributes = $data['manualattributes'] ?? '';
        $sip->disablefromuser = $data['disablefromuser'] ? '1' : '0';
        
        if (!$sip->save()) {
            throw new \Exception(implode(', ', $sip->getMessages()));
        }
    }
    
    private function saveIaxSettings(Providers $provider, array $data, $transaction): void
    {
        $iax = Iax::findFirstByUniqid($provider->uniqid);
        if (!$iax) {
            $iax = new Iax();
            $iax->uniqid = $provider->uniqid;
        }
        
        $iax->host = $data['host'];
        $iax->username = $data['username'] ?? '';
        $iax->secret = $data['secret'] ?? '';
        $iax->qualify = $data['qualify'];
        $iax->noregister = $data['noregister'] ? '1' : '0';
        $iax->manualattributes = $data['manualattributes'] ?? '';
        
        if (!$iax->save()) {
            throw new \Exception(implode(', ', $iax->getMessages()));
        }
    }
}
```

### Пример 2: ConferenceRooms

#### GetListAction.php

```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\ConferenceRooms;

use MikoPBX\Common\Models\ConferenceRooms;
use MikoPBX\PBXCoreREST\Lib\Common\BaseRecordAction;

class GetListAction extends BaseRecordAction
{
    public function process(): void
    {
        $rooms = ConferenceRooms::find([
            'order' => 'name'
        ]);
        
        $data = [];
        foreach ($rooms as $room) {
            $data[] = DataStructure::createFromModel($room);
        }
        
        $this->sendResponse([
            'success' => true,
            'data' => $data
        ]);
    }
}
```

#### DataStructure.php

```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\ConferenceRooms;

use MikoPBX\Common\Models\ConferenceRooms;
use MikoPBX\PBXCoreREST\Lib\Common\BaseDataStructure;

class DataStructure extends BaseDataStructure
{
    public static function createFromModel($model): array
    {
        return [
            'id' => $model->id,
            'uniqid' => $model->uniqid,
            'name' => $model->name,
            'extension' => $model->extension,
            'pinCode' => $model->pinCode ?? '',
            'description' => $model->description ?? ''
        ];
    }
}
```

### Пример 3: JavaScript интеграция для CallQueues

```javascript
// callQueuesAPI.js
const callQueuesAPI = new CommonRestAPI('api/v2/call-queues/', 'CallQueues');

// Дополнительные методы
callQueuesAPI.updateMembers = function(queueId, members, callback) {
    this.performAction(`${queueId}/members`, {
        members: members
    }, callback, 'POST');
};

callQueuesAPI.getAvailableExtensions = function(callback) {
    this.performAction('available-extensions', {}, callback);
};

// callqueue-modify.js
const callQueue = {
    $formObj: $('#call-queue-form'),
    $membersDropdown: $('#members'),
    
    validateRules: {
        name: {
            identifier: 'name',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.cq_ValidateNameEmpty
                }
            ]
        },
        extension: {
            identifier: 'extension',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.cq_ValidateExtensionEmpty
                },
                {
                    type: 'regExp[/^[0-9]{2,6}$/]',
                    prompt: globalTranslate.cq_ValidateExtensionFormat
                }
            ]
        }
    },
    
    initialize() {
        // Настройка Form.js
        Form.$formObj = callQueue.$formObj;
        Form.url = window.location.href;
        Form.validateRules = callQueue.validateRules;
        Form.cbBeforeSendForm = callQueue.cbBeforeSendForm;
        Form.cbAfterSendForm = callQueue.cbAfterSendForm;
        
        Form.initialize();
        
        // Инициализация dropdown для участников
        callQueue.initializeMembersDropdown();
        
        // Загрузка данных
        callQueue.loadQueueData();
    },
    
    initializeMembersDropdown() {
        // Загрузка доступных внутренних номеров
        callQueuesAPI.getAvailableExtensions((response) => {
            if (response.success && response.data) {
                const values = response.data.map(ext => ({
                    name: `${ext.name} <${ext.number}>`,
                    value: ext.number,
                    selected: false
                }));
                
                callQueue.$membersDropdown.dropdown({
                    values: values,
                    multiple: true,
                    fullTextSearch: true,
                    onChange: function(value, text, $selectedItem) {
                        // Обновление списка участников
                        callQueue.updateMembersList(value);
                    }
                });
            }
        });
    },
    
    loadQueueData() {
        const queueId = callQueue.getRecordId();
        
        callQueuesAPI.getRecord(queueId, (response) => {
            if (response.success) {
                callQueue.populateForm(response.data);
                
                // Установка участников очереди
                if (response.data.members && response.data.members.length > 0) {
                    callQueue.$membersDropdown.dropdown('set selected', response.data.members);
                }
            }
        });
    },
    
    cbBeforeSendForm(settings) {
        const formData = Form.$formObj.form('get values');
        
        // Получение участников из dropdown
        formData.members = callQueue.$membersDropdown.dropdown('get value');
        if (typeof formData.members === 'string') {
            formData.members = formData.members.split(',').filter(m => m);
        }
        
        // Подготовка для REST API
        settings.method = formData.id ? 'PUT' : 'POST';
        settings.url = formData.id ? 
            `${callQueuesAPI.apiUrl}${formData.id}` : 
            callQueuesAPI.apiUrl;
        settings.data = JSON.stringify(formData);
        settings.contentType = 'application/json';
        settings.processData = false;
        
        return settings;
    },
    
    updateMembersList(memberNumbers) {
        // Визуальное обновление списка участников
        const $membersList = $('#members-list');
        $membersList.empty();
        
        if (!memberNumbers || memberNumbers.length === 0) {
            $membersList.append(
                '<div class="ui message">' +
                globalTranslate.cq_NoMembersMessage +
                '</div>'
            );
            return;
        }
        
        // Отображение участников
        const members = Array.isArray(memberNumbers) ? 
            memberNumbers : memberNumbers.split(',');
            
        members.forEach(number => {
            $membersList.append(
                `<div class="ui label">
                    <i class="user icon"></i>
                    ${number}
                </div>`
            );
        });
    }
};

$(document).ready(() => {
    callQueue.initialize();
});
```

## Тестирование и валидация {#тестирование}

### Чек-лист тестирования

#### 1. Функциональное тестирование

- [ ] Создание новой записи через REST API
- [ ] Редактирование существующей записи
- [ ] Удаление записи с подтверждением
- [ ] Проверка уникальности полей
- [ ] Валидация обязательных полей
- [ ] Проверка прав доступа

#### 2. Тестирование санитизации

- [ ] XSS векторы: `<script>alert(1)</script>`
- [ ] SQL инъекции: `'; DROP TABLE users; --`
- [ ] Специальные символы в полях
- [ ] Очень длинные строки
- [ ] Пустые и null значения
- [ ] Некорректные типы данных

#### 3. UI тестирование

- [ ] Корректная загрузка данных в форму
- [ ] Работа валидации на клиенте
- [ ] Отображение ошибок валидации
- [ ] Работа DataTable с пустыми данными
- [ ] Responsive поведение на мобильных
- [ ] Двухэтапное удаление

#### 4. Интеграционное тестирование

- [ ] Перезагрузка сервисов после изменений
- [ ] Корректная генерация конфигураций
- [ ] Работа с связанными моделями
- [ ] Транзакционность операций

### Примеры тестовых сценариев

#### Тест санитизации

```php
// Тестовые данные с XSS
$testData = [
    'username' => '<script>alert("xss")</script>admin',
    'description' => 'Test <b>description</b> with HTML',
    'secret' => 'password123!@#',
    'host' => '192.168.1.1<script>',
    'email' => 'test@EXAMPLE.COM'
];

// Ожидаемый результат после санитизации
$expected = [
    'username' => 'scriptalertxssscriptadmin', // alphanumeric
    'description' => 'Test &lt;b&gt;description&lt;/b&gt; with HTML', // html_escape
    'secret' => 'password123!@#', // raw
    'host' => '192.168.1.1', // ip_or_domain
    'email' => 'test@example.com' // email|lowercase
];
```

#### Тест API endpoints

```javascript
// Тест получения записи
QUnit.test("Get record API test", function(assert) {
    const done = assert.async();
    
    myAPI.getRecord('123', function(response) {
        assert.ok(response.success, "Response should be successful");
        assert.ok(response.data, "Response should contain data");
        assert.equal(response.data.id, '123', "ID should match");
        done();
    });
});

// Тест создания новой записи
QUnit.test("Create record API test", function(assert) {
    const done = assert.async();
    
    const newData = {
        name: 'Test Record',
        extension: '1001'
    };
    
    myAPI.saveRecord(newData, function(response) {
        assert.ok(response.success, "Save should be successful");
        assert.ok(response.data.id, "Should return new ID");
        assert.equal(response.data.name, newData.name, "Name should match");
        done();
    });
});
```

### Логирование и отладка

#### Серверная сторона

```php
// В Action классах
$this->logger->debug('SaveRecordAction started', [
    'data' => $data,
    'sanitized' => $sanitizedData
]);

// При ошибках
$this->logger->error('Failed to save record', [
    'errors' => $record->getMessages(),
    'data' => $data
]);
```

#### Клиентская сторона

```javascript
// Включение отладки для API
if (globalDebugMode) {
    $.fn.api.settings.debug = true;
    $.fn.api.settings.verbose = true;
}

// Логирование запросов
console.group('API Request');
console.log('Method:', method);
console.log('URL:', url);
console.log('Data:', data);
console.groupEnd();
```

## Заключение

Данное руководство предоставляет пошаговые инструкции для миграции интерфейсов MikoPBX на REST API архитектуру. Следуя этим инструкциям, AI агент сможет:

1. Правильно структурировать код согласно архитектуре MikoPBX
2. Реализовать двухуровневую санитизацию данных
3. Интегрировать REST API с существующими UI компонентами
4. Обеспечить обратную совместимость
5. Следовать best practices разработки

Ключевые принципы:
- Минимальные изменения в UI
- Использование существующих механизмов (Form.js, DataTable)
- Строгая санитизация данных
- RESTful подход к API
- Транзакционность операций
- Правильная обработка ошибок

При возникновении вопросов обращайтесь к примерам реализации и существующему коду MikoPBX для понимания специфики системы.