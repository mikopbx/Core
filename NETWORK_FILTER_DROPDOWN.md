# Network Filter Dropdown Documentation

## Overview

Система инициализации, сохранения и восстановления значений для network filter dropdown в формах провайдеров MikoPBX.

## Функциональность

### 1. Инициализация dropdown
- Автоматическая инициализация при загрузке страницы
- Поддержка как обычных select элементов, так и Semantic UI dropdown
- Загрузка данных из REST API через NetworkFiltersAPI

### 2. Сохранение состояния
- Автоматическое сохранение текущего значения в sessionStorage перед отправкой формы
- Ключ сохранения: `${providerType}_networkfilter_value` (например, `SIP_networkfilter_value`)

### 3. Восстановление состояния
- Автоматическое восстановление сохраненного значения при изменении типа регистрации
- Восстановление происходит только для режимов 'inbound' и 'none', где network filter актуален

## Методы базового класса ProviderBase

### initializeNetworkFilterDropdown()
Инициализирует network filter dropdown:
- Определяет тип элемента (select или dropdown)
- Устанавливает обработчики событий
- Вызывает populateNetworkFilterDropdown()

### populateNetworkFilterDropdown($dropdown, currentValue)
Заполняет dropdown данными из API:
- Загружает список network filters через NetworkFiltersAPI.getAllowedForProviders()
- Добавляет опцию "None" по умолчанию
- Устанавливает текущее значение

### getCurrentNetworkFilterValue()
Получает текущее значение network filter из различных источников:
- Из поля #networkfilterid
- Из атрибута value элемента
- Значение по умолчанию 'none' для новых провайдеров

### saveNetworkFilterState()
Сохраняет текущее значение в sessionStorage.

### restoreNetworkFilterState()
Восстанавливает ранее сохраненное значение из sessionStorage.

### onNetworkFilterChange(value)
Обработчик изменения значения dropdown:
- Обновляет скрытое поле #networkfilterid
- Может быть переопределен в дочерних классах

### buildTooltipContent(tooltipData) **@deprecated**
Устаревший метод для создания содержимого tooltips.
Теперь используется `TooltipBuilder.buildContent()`.

## Система Tooltips

Провайдеры используют унифицированную систему tooltips через `TooltipBuilder`:

### TooltipBuilder.initialize(tooltipConfigs)
Инициализирует все tooltips на основе конфигурации:
```javascript
const tooltipConfigs = {
    'field_name': tooltipDataObject,
    // ...
};
TooltipBuilder.initialize(tooltipConfigs);
```

### TooltipBuilder.buildContent(tooltipData)
Создает HTML содержимое для tooltip из структурированных данных.

## Интернационализация

Провайдеры поддерживают две функции для работы с переводами:

### globalTranslate
Простое получение перевода по ключу:
```javascript
globalTranslate.pr_ProviderName // "Имя провайдера"
```

### i18n(key, params)
Более новая функция с поддержкой параметров для подстановки placeholders:
```javascript
i18n('iax_ManualAttributesTooltip_header') // Простой перевод
i18n('validation_field_required', {field: 'Host'}) // С параметрами (если поддерживается)
```

Рекомендуется использовать `i18n` для новых переводов, особенно если планируется использование параметров.

## Использование

### В формах (PHP)
```php
$networkfilterid = new Select(
    'networkfilterid',
    [],
    [
        'useEmpty' => false,
        'value' => $entity->networkfilterid ?? 'none',
        'class' => 'ui selection dropdown search network-filter-select',
    ]
);
```

### В JavaScript
```javascript
// Инициализация происходит автоматически в initializeUIComponents()
this.initializeNetworkFilterDropdown();

// Ручное сохранение состояния (обычно не требуется)
this.saveNetworkFilterState();

// Ручное восстановление (вызывается в updateVisibilityElements)
this.restoreNetworkFilterState();
```

## API Endpoints

Используется NetworkFiltersAPI:
- `getAllowedForProviders()` - получение списка network filters для провайдеров
- Endpoint: `/pbxcore/api/v2/network-filters/getAllowedForProviders`

## Структура данных

Network filter объект:
```javascript
{
    value: "filter_id",
    text: "Filter Name",
    name: "Filter Name" // альтернативное поле
}
```

## Особенности

1. **Автоматическое управление**: Система автоматически управляет состоянием без необходимости ручного вмешательства.

2. **Fallback значения**: При неудачной загрузке API устанавливается опция "None".

3. **Поддержка различных режимов**: Network filter показывается только для режимов регистрации 'inbound' и 'none'.

4. **SessionStorage**: Используется sessionStorage для временного хранения состояния между изменениями формы.

5. **Совместимость**: Поддерживает как обычные HTML select, так и Semantic UI dropdown элементы.

## Расширение

Для добавления специфичной логики в дочерних классах:

```javascript
onNetworkFilterChange(value) {
    // Вызов базового метода
    super.onNetworkFilterChange(value);
    
    // Дополнительная логика
    console.log('SIP provider network filter changed:', value);
}
```