# Руководство по унифицированному использованию Tooltips в MikoPBX

## Обзор

Tooltips (всплывающие подсказки) в MikoPBX используются для предоставления контекстной помощи пользователям при работе с расширенными настройками. Система построена на базе Fomantic-UI (Semantic-UI) popup компонента и обеспечивает единообразный пользовательский опыт во всех разделах административного интерфейса.

## Архитектура системы Tooltips

### 1. Компоненты системы

- **HTML-разметка**: Иконки с классом `field-info-icon` и атрибутом `data-field`
- **JavaScript-инициализация**: ВСЕГДА через `TooltipBuilder.initialize(htmlConfigs, options)` — см. `sites/admin-cabinet/assets/js/src/main/TooltipBuilder.js`
- **Генератор контента**: `TooltipBuilder.buildContent(config)` (либо обёртка `form.buildTooltipContent()` страницы, которая делегирует в `TooltipBuilder`)
- **Переводы**: Локализованные тексты в файлах переводов (`src/Common/Messages/*.php`)
- **Глобальная защита от toggle-чекбоксов**: `TooltipBuilder.js` в DOMReady навешивает делегированный `click.global-tooltip` на `.field-info-icon, .special-checkbox-info, .service-info-icon`, который останавливает propagation/preventDefault, если иконка вложена в `<label>`. Дублировать это per-page НЕ нужно.

### ⛔ Запрещено

- **Не вызывайте `$icon.popup({...})` напрямую** для `.field-info-icon`. Голый `popup()` без `on: 'manual'` и без `lastResort: true`:
  - hover не срабатывает стабильно, когда иконка вложена в `<label>` тогл-чекбокса (Semantic UI checkbox перехватывает указатель на всём label),
  - Fomantic скрывает тултип целиком, если ни одна позиция не помещается во вьюпорт (тогда как `lastResort: true` форсирует размещение и включает скролл внутри `.field-info-popup`).
- **Не дублируйте per-page handler `click.tooltip-prevent`** — глобальный делегат в `TooltipBuilder.js` уже это закрывает; per-icon `click.popup-trigger` ставит сам `TooltipBuilder.initialize()`.

### 2. Структура данных Tooltip

```javascript
{
    header: 'Заголовок подсказки',           // Основной заголовок
    description: 'Описание функции',          // Общее описание
    list: [                                   // Основной список
        // Простые элементы списка
        'Элемент списка 1',
        'Элемент списка 2',
        
        // Элементы с определениями
        { term: 'Термин', definition: 'Определение' },
        
        // Заголовки секций (definition: null)
        { term: 'Заголовок секции', definition: null }
    ],
    list2: [...],                            // Дополнительные списки (list2-list10)
    warning: {                               // Предупреждение
        header: 'Внимание',
        text: 'Текст предупреждения'
    },
    examples: [                              // Примеры кода/конфигурации
        '[section]',
        'parameter = value',
        'another_param = value'
    ],
    examplesHeader: 'Примеры',              // Заголовок для примеров
    note: 'Дополнительное примечание'       // Финальное примечание
}
```

## Реализация Tooltips

### 1. HTML-разметка (Volt шаблон)

```html
<!-- Базовая иконка tooltip -->
<label>{{ t._('ex_FieldLabel') }}
    <i class="small info circle icon field-info-icon" 
       data-field="field_name"></i>
</label>

<!-- Tooltip для checkbox -->
<div class="ui toggle checkbox">
    {{ form.render('field_name') }}
    <label for="field_name">{{ t._('ex_CheckboxLabel') }}
        <i class="small info circle icon field-info-icon" 
           data-field="field_name"></i>
    </label>
</div>
```

### 2. JavaScript инициализация (канонический паттерн)

Эталон — `GeneralSettings/general-settings-tooltip-manager.js` (статический класс-менеджер на страницу) + `main/TooltipBuilder.js` (общая фабрика popup-ов).

```javascript
/* global globalTranslate, TooltipBuilder */

class MyPageTooltipManager {
    constructor() {
        throw new Error('MyPageTooltipManager is static');
    }

    static getTooltipConfigurations() {
        return {
            field_name: {
                header: globalTranslate.field_tooltip_header,
                description: globalTranslate.field_tooltip_desc,
                list: [
                    globalTranslate.field_tooltip_item1,
                    { term: globalTranslate.field_tooltip_term,
                      definition: globalTranslate.field_tooltip_definition }
                ],
                warning: {
                    header: globalTranslate.field_tooltip_warning_header,
                    text: globalTranslate.field_tooltip_warning
                }
            },
            // ...
        };
    }

    static initialize() {
        if (typeof TooltipBuilder === 'undefined') {
            console.error('TooltipBuilder is not available');
            return;
        }
        // TooltipBuilder сам выполнит buildContent() для каждого конфига,
        // навесит popup({on: 'manual', lastResort: true, ...}) и
        // click.popup-trigger с stopPropagation/preventDefault.
        TooltipBuilder.initialize(this.getTooltipConfigurations(), {
            selector: '.field-info-icon',
            position: 'top right',
            hoverable: true,
            showDelay: 300,
            hideDelay: 100,
            variation: 'flowing'
        });
    }
}
```

Подключение в `*-modify.js`:

```javascript
const myPage = {
    initialize() {
        // ... другая инициализация
        if (typeof MyPageTooltipManager !== 'undefined') {
            MyPageTooltipManager.initialize();
        }
    }
};

$(document).ready(() => myPage.initialize());
// НЕ добавляйте здесь свой $('.field-info-icon').on('click.tooltip-prevent', ...).
// Это уже сделано глобально в TooltipBuilder.js DOMReady.
```

#### Почему `on: 'manual'` обязателен

Когда иконка вложена в `<label>` для тогл-чекбокса/радио (Semantic UI `.ui.toggle.checkbox`), label-площадь перехватывает указатель — hover на `<i>` не срабатывает. `on: 'manual'` + `click.popup-trigger` явно показывает popup по клику на иконку и НЕ переключает чекбокс (благодаря `stopPropagation()`).

#### Почему `lastResort: true` обязателен

Длинные тултипы (несколько `list1..list10`) на типовых высотах вьюпорта (~720-800px) не помещаются ни в одну позицию из списка кандидатов. Без `lastResort: true` Fomantic скрывает popup целиком вместо того, чтобы разместить его по-умолчанию и включить скролл внутри `.field-info-popup` (CSS делает `overflow-y: auto`).

#### Когда нужна страница-специфичная обёртка `form.buildTooltipContent(...)`

Если вы хотите хранить конфиги в формате *уже-HTML* (например, для динамических вставок типа firewall с iptables-командами), оборачивайте `TooltipBuilder.buildContent()` и передавайте в `TooltipBuilder.initialize()` уже строки HTML. `TooltipBuilder.initialize()` корректно отрабатывает оба варианта (объект-конфиг и готовая HTML-строка).

### 3. Переводы

В файле переводов (`src/Common/Messages/ru.php`):

```php
// Tooltips для поля field_name
'field_tooltip_header' => 'Заголовок подсказки',
'field_tooltip_desc' => 'Описание функциональности поля',
'field_tooltip_item1' => 'Элемент списка 1',
'field_tooltip_term' => 'Термин',
'field_tooltip_definition' => 'Определение термина',
'field_tooltip_warning_header' => 'Внимание',
'field_tooltip_warning' => 'Текст предупреждения о возможных последствиях',
```

## Примеры реализации в проекте

### 1. Расширенные настройки сотрудника (extension-modify.js)

Tooltips для:
- **Транспорт (sip_transport)**: Выбор протокола SIP с описанием каждого варианта
- **Сетевой фильтр (sip_networkfilterid)**: Предупреждение о безопасности
- **DTMF режим (sip_dtmfmode)**: Технические детали каждого режима
- **Дополнительные атрибуты (sip_manualattributes)**: Примеры конфигурации

### 2. Настройки провайдера (provider-base-modify.js)

Базовый класс с универсальным методом `buildTooltipContent()` для:
- SIP провайдеров
- IAX провайдеров
- Общих настроек NAT и qualify

### 3. Настройки файрвола (firewall-modify.js)

Специализированные tooltips:
- Динамическая генерация контента в зависимости от окружения
- Интеграция с ClipboardJS для копирования команд
- Показ iptables правил

## Рекомендации по использованию

### 1. Когда использовать Tooltips

- **Сложные технические настройки**: Параметры, требующие понимания протоколов
- **Настройки безопасности**: Предупреждения о последствиях изменений
- **Редко используемые опции**: Расширенные параметры конфигурации
- **Форматы ввода**: Примеры правильного заполнения полей

### 2. Структура контента

1. **Заголовок**: Краткое название функции
2. **Описание**: 1-2 предложения о назначении
3. **Детали**: Списки опций или технические подробности
4. **Примеры**: Конкретные примеры использования
5. **Предупреждения**: Важная информация о безопасности или совместимости

### 3. Стилистические правила

- Используйте понятный язык, избегайте жаргона где возможно
- Предоставляйте конкретные примеры значений
- Группируйте связанную информацию в списки
- Выделяйте предупреждения оранжевым блоком
- Ограничивайте объем информации для удобства чтения

### 4. Технические требования

- Всегда используйте класс `field-info-icon` для иконок
- Обязательно указывайте атрибут `data-field` с именем поля
- Инициализируйте tooltips после загрузки DOM
- ВСЕГДА используйте `TooltipBuilder.initialize()` — никогда `$icon.popup()` напрямую
- Параметр `hoverable: true` оставляйте включённым (это поведение popup-а, удерживающего его при наведении на сам popup)
- Задавайте задержки показа/скрытия для улучшения UX

## Интеграция с модулями

Модули могут добавлять свои tooltips:

1. Создайте переводы в файле модуля
2. Добавьте иконки в шаблоны представлений
3. Инициализируйте tooltips в JavaScript модуля
4. Используйте существующий метод `buildTooltipContent()`

## Поддержка и расширение

При добавлении новых tooltips:

1. Следуйте установленной структуре данных
2. Добавляйте переводы только на русский язык (остальные через Weblate)
3. Тестируйте отображение на разных разрешениях экрана
4. Проверяйте корректность позиционирования popup
5. Убедитесь в отсутствии конфликтов с другими UI элементами

## Заключение

Система tooltips в MikoPBX обеспечивает единообразный способ предоставления контекстной помощи пользователям. Следование данным рекомендациям гарантирует консистентность пользовательского интерфейса и улучшает общий опыт работы с системой.