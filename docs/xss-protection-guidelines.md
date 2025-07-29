# XSS Protection Guidelines for MikoPBX Modules

## Overview

Cross-Site Scripting (XSS) защита является критически важной для безопасности веб-интерфейса MikoPBX. Данные рекомендации основаны на применённых подходах в системе и должны соблюдаться при разработке новых модулей.

## 1. PHP Backend Protection

### SecurityHelper Class

Используйте класс `SecurityHelper` для контекстно-зависимого экранирования:

```php
use MikoPBX\AdminCabinet\Library\SecurityHelper;

// HTML контекст
$safeHtml = SecurityHelper::escapeHtml($userInput);

// JavaScript строки
$safeJs = SecurityHelper::escapeJs($userInput);

// URL параметры
$safeUrl = SecurityHelper::escapeUrl($userInput);

// CSS значения
$safeCss = SecurityHelper::escapeCss($userInput);

// HTML атрибуты
$safeAttr = SecurityHelper::escapeAttribute($userInput);
```

### В Volt шаблонах

**Всегда используйте автоматическое экранирование:**

```volt
{# Рекомендуется - автоматическое экранирование #}
{{ userInput|e }}

{# Для сложных случаев #}
{{ userInput|escape('html') }}
{{ userInput|escape('js') }}
{{ userInput|escape('url') }}
```

### Проверка опасного контента

```php
// Проверить на наличие опасных паттернов
if (SecurityHelper::containsDangerousContent($input)) {
    // Дополнительная валидация или логирование
    $safeInput = SecurityHelper::escapeHtml($input);
}
```

### Санитизация имён файлов

```php
$safeFilename = SecurityHelper::sanitizeFilename($userFilename);
```

## 2. JavaScript Frontend Protection

### SecurityUtils Class

Используйте глобальный класс `SecurityUtils` для безопасного отображения:

```javascript
// Базовое экранирование HTML
const safeContent = SecurityUtils.escapeHtml(userInput);

// С разрешением безопасных иконок
const safeContentWithIcons = SecurityUtils.escapeHtml(userInput, true);

// Для атрибутов
const safeAttr = SecurityUtils.sanitizeAttribute(userInput);

// Для dropdown элементов (строгий режим)
const safeDropdownText = SecurityUtils.sanitizeForDropdown(userInput);

// Для отображения с выбором режима строгости
const safeDisplay = SecurityUtils.sanitizeForDisplay(userInput, strictMode);
```

### Безопасные иконки

SecurityUtils поддерживает безопасные иконки Fomantic UI:

```javascript
// Разрешённые иконки
const safeIcon = '<i class="phone icon"></i>';
const safeNestedIcon = '<i class="icons"><i class="user outline icon"></i></i>';

// Опасные иконки будут экранированы
const dangerousIcon = '<i class="phone icon" onclick="alert(1)"></i>';
```

### Создание безопасных элементов

```javascript
// Безопасные option элементы
const safeOption = SecurityUtils.createSafeOption(value, text, strictMode);

// Безопасная установка HTML содержимого
SecurityUtils.setHtmlContent($element, content, strictMode);
```

### Extensions API санитизация

Для контента Extensions API используйте специальный метод:

```javascript
const safeExtensionContent = SecurityUtils.sanitizeExtensionsApiContent(apiContent);
```

## 3. SystemSanitizer для REST API

Для полей с системными значениями используйте `SystemSanitizer`:

```php
use MikoPBX\PBXCoreREST\Lib\Common\SystemSanitizer;

// Правила санитизации для extension полей
$extensionRule = SystemSanitizer::getExtensionSanitizationRule(20, true);

// Правила для routing полей  
$routingRule = SystemSanitizer::getRoutingSanitizationRule(20, true);

// Валидация
if (SystemSanitizer::isValidExtension($value)) {
    // Значение корректно
}

// Санитизация
$cleanValue = SystemSanitizer::sanitizeExtension($userInput);
```

## 4. Контекстно-зависимая защита

### HTML контекст

```php
// PHP
echo SecurityHelper::escapeHtml($data);
```

```volt
{# Volt #}
{{ data|e }}
```

```javascript
// JavaScript
element.textContent = data; // Безопасно
// ИЛИ
$(element).text(data); // Безопасно с jQuery
```

### HTML атрибуты

```php
// PHP
echo '<div id="' . SecurityHelper::escapeAttribute($id) . '">';
```

```volt
{# Volt #}
<div id="{{ id|escape('html_attr') }}">
```

### JavaScript строки

```php
// PHP в JavaScript
echo 'var message = "' . SecurityHelper::escapeJs($message) . '";';
```

### URL параметры

```php
// PHP
$url = 'search?q=' . SecurityHelper::escapeUrl($query);
```

## 5. Опасные паттерны - ЗАПРЕЩЕНО

### Никогда не используйте:

```php
// ОПАСНО - прямой вывод
echo $userInput;

// ОПАСНО - в атрибутах
echo '<div onclick="' . $userInput . '">';
```

```volt
{# ОПАСНО - без экранирования #}
{{ userInput|raw }}

{# ОПАСНО - в JavaScript #}
<script>var data = "{{ userInput }}";</script>
```

```javascript
// ОПАСНО - innerHTML с пользовательскими данными
element.innerHTML = userInput;

// ОПАСНО - eval или Function
eval(userInput);
new Function(userInput);

// ОПАСНО - document.write
document.write(userInput);
```

## 6. Проверка безопасности

### Автоматическая проверка

```javascript
// Проверка на опасные паттерны
const isDangerous = SecurityUtils.containsDangerousPatterns(input);

// Проверка безопасности для dropdown
const isSafeForDropdown = SecurityUtils.isSafeForDropdown(input);

// Статистика обработки
const stats = SecurityUtils.getProcessingStats(input);
console.log('Safe icons:', stats.safeSimpleIcons);
console.log('Dangerous patterns:', stats.dangerousPatterns);
```

## 7. Рекомендации для модулей

### 1. Валидация на входе

```php
// В контроллерах
$data = self::sanitizeData($this->request->getPost(), $this->filter);
```

### 2. Экранирование на выходе

```php
// В представлениях
$this->view->safeData = SecurityHelper::escapeHtml($data);
```

### 3. Использование форм

```php
// В формах Phalcon
$this->add(new Text('name', [
    'filters' => ['trim', 'string']
]));
```

### 4. AJAX ответы

```javascript
// Безопасная обработка AJAX
$.api({
    onSuccess(response) {
        const safeMessage = SecurityUtils.escapeHtml(response.message);
        UserMessage.showInfo(safeMessage);
    }
});
```

## 8. Отладка и мониторинг

### Режим отладки

```javascript
// Включить отладку SecurityUtils
SecurityUtils.debug = true;

// Логи будут показывать процесс санитизации
```

### Логирование подозрительного контента

```php
if (SecurityHelper::containsDangerousContent($input)) {
    error_log("Suspicious content detected: " . $input);
}
```

## 9. Типичные ошибки

### ❌ Неправильно

```php
echo "<div>" . $_POST['data'] . "</div>";
```

```javascript
$('#content').html(userInput);
```

### ✅ Правильно

```php
echo "<div>" . SecurityHelper::escapeHtml($_POST['data']) . "</div>";
```

```javascript
SecurityUtils.setHtmlContent($('#content'), userInput, true);
```

## 10. Проверочный список

- [ ] Все пользовательские данные экранируются перед выводом
- [ ] Используется контекстно-зависимое экранирование
- [ ] Опасные паттерны проверяются на входе
- [ ] SecurityHelper/SecurityUtils используются во всех модулях
- [ ] Тестирование с XSS payloads выполнено
- [ ] Логирование подозрительного контента настроено

## Заключение

Следование этим рекомендациям обеспечит надёжную защиту от XSS атак в модулях MikoPBX. Всегда помните принцип: **экранировать на выходе, валидировать на входе**.