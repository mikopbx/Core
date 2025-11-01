# 🚀 Шпаргалка: Перехват сохранения Employee

## 📌 Два способа перехвата

| API Version | Hook Method | When | File |
|-------------|-------------|------|------|
| **v3 (новый)** | `onAfterExecuteRestAPIRoute` | ПОСЛЕ сохранения | YourModuleConf.php |
| **v2 (старый)** | `modelsEventChangeData` | ПОСЛЕ изменения модели | YourModuleConf.php |

## 🔥 Быстрый код

### REST API v3 (новый релиз)

```php
public function onAfterExecuteRestAPIRoute(Micro $app): void
{
    $route = $app->getRouter()->getMatchedRoute();
    $pattern = $route?->getPattern();
    $method = $app->request->getMethod();

    // Перехват /pbxcore/api/v3/employees
    if (preg_match('#^/pbxcore/api/v3/employees#', $pattern ?? '') &&
        in_array($method, ['POST', 'PUT'])) {

        // Данные запроса
        $data = $app->request->getJsonRawBody(true);

        // Результат
        $response = $app->getReturnedValue();

        if ($response['success'] ?? false) {
            $employeeId = $response['data']['id'] ?? null;
            $customField = $data['custom_field'] ?? null;

            // Сохраняем
            $this->saveToModule($employeeId, $customField);
        }
    }
}
```

### Old API v2 (старый релиз)

```php
public function modelsEventChangeData($data): void
{
    $model = $data['model'] ?? null;
    $action = $data['action'] ?? null;

    if ($model === 'Extensions' && in_array($action, ['insert', 'update'])) {
        $recordId = $data['recordId'];
        $extension = Extensions::findFirst("id = {$recordId}");

        if ($extension && $extension->type === 'SIP') {
            $employeeId = $extension->userid;
            $customField = $this->session->get('temp_custom_field');

            $this->saveToModule($employeeId, $customField);
        }
    }
}
```

## 💾 Сохранение данных

```php
private function saveToModule($employeeId, $customField): void
{
    $record = YourModuleModel::findFirst([
        'conditions' => 'employee_id = :id:',
        'bind' => ['id' => $employeeId]
    ]);

    if (!$record) {
        $record = new YourModuleModel();
        $record->employee_id = $employeeId;
    }

    $record->custom_field = $customField;
    $record->save();
}
```

## 🌐 Добавление поля в форму

```php
public function onVoltBlockCompile(string $controller, string $blockName): string
{
    if ($controller === 'Extensions' && $blockName === 'tabBellowForm') {
        return <<<'VOLT'
<div class="field">
    <label>Custom Field</label>
    <input type="text" name="custom_field" id="custom-field">
</div>
VOLT;
    }
    return '';
}
```

## 🔗 Регистрация маршрутов

```php
public function getPBXCoreRESTAdditionalRoutes(): array
{
    return [
        [
            'YourModule\App\Controllers\ApiController',
            'saveTempFieldAction',
            '/your-module/save-temp-field',
            'post',
            '/',
            false
        ]
    ];
}
```

## 📊 Модель данных

```php
/**
 * @Table(name="m_YourModule_employee_data")
 * @Indexes(@Index(columns={"employee_id"}, name="employee_id_idx", type="UNIQUE"))
 */
class YourModuleModel extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public ?int $id = null;

    /**
     * @Column(type="string", nullable=false)
     */
    public string $employee_id = '';

    /**
     * @Column(type="string", nullable=true)
     */
    public ?string $custom_field = null;
}
```

## 🧪 Тестирование

### REST API v3
```bash
curl -X POST http://pbx/pbxcore/api/v3/employees \
  -H "Authorization: Bearer TOKEN" \
  -d '{"number":"301","user_username":"Test","sip_secret":"pass","custom_field":"value"}'
```

### Проверка в БД
```bash
sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_YourModule_employee_data"
```

### Логи
```bash
tail -f /var/log/messages | grep YourModule
```

## ⚡ Интерфейсы для реализации

```php
class YourModuleConf extends ConfigClass implements
    RestAPIConfigInterface,      // Для REST API v3
    SystemConfigInterface,        // Для событий моделей
    WebUIConfigInterface          // Для веб-интерфейса (опционально)
{
    // Обязательные методы
    public function onAfterExecuteRestAPIRoute(Micro $app): void {}
    public function modelsEventChangeData($data): void {}
    public function getPBXCoreRESTAdditionalRoutes(): array {}
}
```

## 🎯 Точки перехвата

```
REST API v3:
Client → POST /pbxcore/api/v3/employees
      → SaveRecordAction
      → onAfterExecuteRestAPIRoute ✅
      → YourModuleModel

Old API v2:
Client → Form Submit
      → Extensions::save()
      → modelsEventChangeData ✅
      → YourModuleModel
```

## 📝 Чеклист

- [ ] Реализован `onAfterExecuteRestAPIRoute`
- [ ] Реализован `modelsEventChangeData`
- [ ] Создана модель с аннотациями
- [ ] Добавлены маршруты
- [ ] Тестирование с REST API v3
- [ ] Тестирование со старым API
- [ ] Проверены логи

## 🔍 Отладка

```php
// Логирование
\MikoPBX\Core\System\Util::sysLogMsg('YourModule', 'Message');

// Определение версии API
$version = version_compare(\MikoPBX\Core\System\Util::getVersionPBX(), '2024.1.0', '>=')
    ? 'v3'
    : 'v2';
```

## 💡 Полезные ссылки

- [Полная документация](MODULE_EMPLOYEE_INTERCEPT_README.md)
- [Пример кода](example_module_employee_intercept.php)
- [Модель](example_module_model.php)
- [API контроллер](example_module_api_controller.php)
