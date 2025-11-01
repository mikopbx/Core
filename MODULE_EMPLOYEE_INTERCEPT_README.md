# Универсальный перехват сохранения Employee/Extension

## 📋 Описание

Полное решение для перехвата сохранения данных employee/extension в модуле MikoPBX с поддержкой:
- **Старый API v2** (MikoPBX до 2024.1) - `/api/extensions/saveRecord`
- **Новый REST API v3** (MikoPBX 2024.1+) - `/pbxcore/api/v3/employees`

## 🏗️ Структура решения

```
YourModule/
├── YourModuleConf.php              # Главный класс модуля
├── Models/
│   └── YourModuleModel.php         # Модель для хранения данных
├── App/
│   └── Controllers/
│       └── ApiController.php        # API контроллер
├── Setup/
│   └── PbxExtensionSetup.php       # Установка модуля
└── Messages/
    ├── ru.php                       # Переводы
    └── en.php
```

## 🚀 Быстрый старт

### 1. Скопируйте файлы в ваш модуль:

```bash
# Основной класс модуля
example_module_employee_intercept.php → YourModule/YourModuleConf.php

# Модель данных
example_module_model.php → YourModule/Models/YourModuleModel.php

# API контроллер
example_module_api_controller.php → YourModule/App/Controllers/ApiController.php

# Хуки веб-интерфейса (опционально)
example_module_webui_hook.php → добавить методы в YourModuleConf.php
```

### 2. Замените имена:

```bash
# Замените 'YourModule' на реальное имя модуля
sed -i 's/YourModule/ModuleRealName/g' *.php
```

### 3. Создайте таблицу в базе данных:

Таблица создается автоматически при установке модуля через аннотации модели.

### 4. Добавьте переводы:

**Messages/ru.php:**
```php
return [
    'ym_CustomFieldLabel' => 'Ваше поле',
    'ym_CustomFieldPlaceholder' => 'Введите значение',
    'ym_CustomFieldError' => 'Значение слишком короткое',
];
```

**Messages/en.php:**
```php
return [
    'ym_CustomFieldLabel' => 'Your field',
    'ym_CustomFieldPlaceholder' => 'Enter value',
    'ym_CustomFieldError' => 'Value is too short',
];
```

## 🔧 Как это работает

### Архитектура перехвата

```
┌─────────────────────────────────────────────────────────────────┐
│                     MikoPBX API Request                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
    ┌────▼────┐                    ┌─────▼─────┐
    │ Old API │                    │ REST API  │
    │   v2    │                    │    v3     │
    └────┬────┘                    └─────┬─────┘
         │                               │
         │ modelsEventChangeData         │ onAfterExecuteRestAPIRoute
         │                               │
         └───────────────┬───────────────┘
                         │
                    ┌────▼────┐
                    │ Module  │
                    │ Handler │
                    └────┬────┘
                         │
              ┌──────────┴──────────┐
              │                     │
         ┌────▼────┐          ┌─────▼─────┐
         │Extract  │          │Validate   │
         │Data     │          │& Save     │
         └────┬────┘          └─────┬─────┘
              │                     │
              └──────────┬──────────┘
                         │
                    ┌────▼────┐
                    │YourModule│
                    │  Table   │
                    └──────────┘
```

### Новый REST API v3 (MikoPBX 2024.1+)

**Перехват через хук `onAfterExecuteRestAPIRoute`:**

```php
// Срабатывает ПОСЛЕ выполнения SaveRecordAction
public function onAfterExecuteRestAPIRoute(Micro $app): void
{
    // 1. Проверяем маршрут: /pbxcore/api/v3/employees
    // 2. Проверяем метод: POST (создание) или PUT (обновление)
    // 3. Получаем данные из $app->request->getJsonRawBody()
    // 4. Проверяем успех в $app->getReturnedValue()
    // 5. Сохраняем в таблицу модуля
}
```

**Поток данных:**
```
Client → REST API → SaveRecordAction → Success → onAfterExecuteRestAPIRoute → Module Table
```

### Старый API v2 (MikoPBX до 2024.1)

**Перехват через хук `modelsEventChangeData`:**

```php
// Срабатывает ПОСЛЕ сохранения модели Extensions
public function modelsEventChangeData($data): void
{
    // 1. Проверяем модель: Extensions
    // 2. Проверяем действие: insert/update
    // 3. Получаем данные из модели Extensions
    // 4. Получаем кастомное поле из сессии
    // 5. Сохраняем в таблицу модуля
}
```

**Поток данных:**
```
Client → Form → saveRecord → Extensions Model → modelsEventChangeData → Module Table
```

## 📊 Структура данных

### Таблица модуля

```sql
CREATE TABLE m_YourModule_employee_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT NOT NULL,           -- Users.id
    extension_number TEXT,               -- Extensions.number
    username TEXT,                       -- Users.username
    email TEXT,                          -- Users.email
    mobile TEXT,                         -- Mobile phone
    custom_field TEXT,                   -- Ваше кастомное поле
    data_source TEXT,                    -- 'rest_api_v3' или 'old_api_v2'
    created_at TEXT,                     -- Дата создания
    updated_at TEXT,                     -- Дата обновления
    metadata TEXT,                       -- JSON метаданные
    UNIQUE(employee_id)
);
```

### Пример данных

```json
{
  "id": 1,
  "employee_id": "42",
  "extension_number": "201",
  "username": "John Doe",
  "email": "john@example.com",
  "mobile": "+1234567890",
  "custom_field": "Custom Value",
  "data_source": "rest_api_v3",
  "created_at": "2024-01-15 10:30:00",
  "updated_at": "2024-01-15 14:25:00"
}
```

## 🎯 API Endpoints модуля

### 1. Получить данные employee
```bash
GET /your-module/employee-data/{id}

Response:
{
  "success": true,
  "data": {
    "id": 1,
    "employee_id": "42",
    "custom_field": "value",
    ...
  }
}
```

### 2. Временное сохранение поля (для старого API)
```bash
POST /your-module/save-temp-field
Content-Type: application/json

{
  "custom_field": "value"
}
```

### 3. Массовое обновление
```bash
POST /your-module/batch-update
Content-Type: application/json

{
  "items": [
    {"employee_id": "1", "custom_field": "value1"},
    {"employee_id": "2", "custom_field": "value2"}
  ]
}
```

### 4. Экспорт данных
```bash
GET /your-module/export

Response: CSV file download
```

### 5. Статистика
```bash
GET /your-module/statistics

Response:
{
  "success": true,
  "data": {
    "total_records": 150,
    "source_statistics": {
      "rest_api_v3": 120,
      "old_api_v2": 30
    },
    "recent_updates": [...]
  }
}
```

## 🔍 Отладка

### Логирование

Модуль автоматически логирует все операции:

```bash
# Системный лог
tail -f /var/log/messages | grep YourModule

# Лог модуля
tail -f /var/log/mikopbx/yourmodule.log
```

### Проверка перехвата

**REST API v3:**
```bash
# Создание employee
curl -X POST http://192.168.1.100/pbxcore/api/v3/employees \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "301",
    "user_username": "Test User",
    "sip_secret": "password123",
    "custom_field": "test_value"
  }'

# Проверка в базе модуля
sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_YourModule_employee_data WHERE extension_number='301'"
```

**Старый API v2:**
```bash
# Сохранение через форму веб-интерфейса
# 1. Откройте форму редактирования extension
# 2. Заполните поле "custom_field"
# 3. Сохраните форму
# 4. Проверьте в базе:

sqlite3 /cf/conf/mikopbx.db \
  "SELECT * FROM m_YourModule_employee_data WHERE data_source='old_api_v2'"
```

## 🐛 Решение проблем

### Проблема: Данные не сохраняются

**Проверка 1: Хук подключен?**
```bash
grep -r "onAfterExecuteRestAPIRoute" /var/www/mikopbx/your_module/
```

**Проверка 2: Таблица создана?**
```bash
sqlite3 /cf/conf/mikopbx.db ".tables" | grep YourModule
```

**Проверка 3: Логи**
```bash
tail -100 /var/log/messages | grep -i "yourmodule\|employee"
```

### Проблема: Старый API не работает

**Решение:** Убедитесь, что кастомное поле сохраняется в сессию:

```javascript
// В форме
$.ajax({
    url: '/your-module/save-temp-field',
    method: 'POST',
    async: false,  // ВАЖНО: синхронный запрос!
    data: { custom_field: value }
});
```

### Проблема: Новый API не работает

**Решение:** Проверьте версию MikoPBX:

```bash
cat /offload/version

# Должна быть 2024.1.0 или выше для REST API v3
```

## 📝 Чеклист внедрения

- [ ] Скопированы все файлы в модуль
- [ ] Изменены имена классов и пространств имен
- [ ] Добавлены переводы (ru.php, en.php)
- [ ] Создана модель YourModuleModel с правильными аннотациями
- [ ] Реализован метод `onAfterExecuteRestAPIRoute` (новый API)
- [ ] Реализован метод `modelsEventChangeData` (старый API)
- [ ] Добавлены дополнительные маршруты в `getPBXCoreRESTAdditionalRoutes`
- [ ] Создан API контроллер для обработки запросов
- [ ] Добавлены хуки веб-интерфейса (если нужно)
- [ ] Протестировано создание employee через REST API v3
- [ ] Протестировано создание extension через веб-форму (старый API)
- [ ] Проверены логи на наличие ошибок
- [ ] Проверена таблица в базе данных

## 🎓 Дополнительные ресурсы

- [Документация разработки модулей](https://github.com/mikopbx/DevelopementDocs)
- [Шаблон модуля](https://github.com/mikopbx/ModuleTemplate)
- [REST API v3 Guide](../src/PBXCoreREST/CLAUDE.md)
- [Модули CLAUDE.md](../src/Modules/CLAUDE.md)

## 💡 Примеры использования

### Синхронизация с внешней системой

```php
private function afterEmployeeDataSaved(array $employeeData, bool $isCreate, string $source): void
{
    // Отправка данных во внешнюю CRM
    $this->sendToCRM($employeeData);

    // Создание почтового ящика
    if ($isCreate && !empty($employeeData['email'])) {
        $this->createEmailAccount($employeeData);
    }

    // Уведомление администратора
    $this->notifyAdmin($employeeData, $isCreate ? 'created' : 'updated');
}
```

### Валидация бизнес-правил

```php
public function onBeforeExecuteRestAPIRoute(Micro $app): void
{
    $pattern = $app->getRouter()->getMatchedRoute()?->getPattern();

    if (preg_match('#^/pbxcore/api/v3/employees#', $pattern ?? '')) {
        $data = $app->request->getJsonRawBody(true);

        // Проверка уникальности кастомного поля
        if (!empty($data['custom_field'])) {
            $exists = YourModuleModel::findFirst([
                'conditions' => 'custom_field = :field: AND employee_id != :id:',
                'bind' => [
                    'field' => $data['custom_field'],
                    'id' => $data['id'] ?? ''
                ]
            ]);

            if ($exists) {
                // Прерываем выполнение
                $app->response->setJsonContent([
                    'success' => false,
                    'message' => 'Custom field must be unique'
                ]);
                $app->response->send();
                exit;
            }
        }
    }
}
```

## ✅ Заключение

Это решение обеспечивает:

1. ✅ **Совместимость** с обеими версиями API
2. ✅ **Автоматический перехват** сохранения данных
3. ✅ **Прозрачность** для пользователя
4. ✅ **Расширяемость** для дополнительной логики
5. ✅ **Надежность** с логированием и обработкой ошибок

Вы можете адаптировать код под свои нужды, добавив:
- Дополнительные поля в модель
- Интеграцию с внешними API
- Сложную бизнес-логику
- Валидацию данных
- Уведомления и алерты
