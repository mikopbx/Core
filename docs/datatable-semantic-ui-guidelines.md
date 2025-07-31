# DataTable с Semantic UI - Руководство по стилизации и поведению

Это руководство описывает правильные практики работы с DataTables в сочетании с Semantic UI для достижения корректного поведения таблиц и предотвращения проблем с размерами.

## Основные принципы

### 1. HTML структура

```html
<!-- Контейнер таблицы -->
<div id="table-container" style="display:none">
    <table class="ui selectable compact unstackable table" id="data-table">
        <thead>
        <tr>
            <!-- Колонки с правильными классами -->
            <th class="centered collapsing">{{ t._('Column1') }}</th>
            <th class="collapsing">{{ t._('Column2') }}</th>
            <th class="hide-on-mobile collapsing">{{ t._('Column3') }}</th>
            <th class="hide-on-mobile">{{ t._('Column4') }}</th>
            <th class="right aligned collapsing"></th> <!-- Кнопки действий -->
        </tr>
        </thead>
        <tbody>
        <!-- DataTable заполнит данные автоматически -->
        </tbody>
    </table>
</div>
```

**Важные CSS классы для заголовков:**
- `centered` - выравнивание по центру
- `collapsing` - колонка сжимается до минимального размера содержимого
- `hide-on-mobile` - скрывается на мобильных устройствах (≤768px)
- `right aligned` - выравнивание по правому краю (для кнопок действий)

### 2. JavaScript конфигурация DataTable

```javascript
const dataTable = $('#data-table').DataTable({
    ajax: {
        url: API_ENDPOINT,
        dataSrc: function(json) {
            // Управление пустым состоянием
            toggleEmptyPlaceholder(!json.result || !json.data || json.data.length === 0);
            return json.result ? json.data : [];
        }
    },
    columns: [
        {
            data: 'field1',
            className: 'centered collapsing'  // БЕЗ префикса 'ui'
        },
        {
            data: 'field2',
            className: 'collapsing'
        },
        {
            data: 'field3',
            className: 'hide-on-mobile collapsing'
        },
        {
            data: 'field4',
            className: 'hide-on-mobile',
            orderable: false,
            // Колонка без 'collapsing' растягивается на доступное пространство
            render: function(data) {
                return data ? data : '—';
            }
        },
        {
            data: null,
            orderable: false,
            searchable: false,
            className: 'right aligned collapsing',  // БЕЗ префикса 'ui'
            render: function(data, type, row) {
                return `<div class="ui tiny basic icon buttons action-buttons">
                    <a href="${globalRootUrl}module/modify/${row.id}" 
                       class="ui button edit popuped">
                        <i class="icon edit blue"></i>
                    </a>
                    <a href="#" data-value="${row.id}" 
                       class="ui button delete two-steps-delete popuped">
                        <i class="icon trash red"></i>
                    </a>
                </div>`;
            }
        }
    ],
    order: [[0, 'asc']],
    lengthChange: false,
    paging: false,
    info: true,
    language: SemanticLocalization.dataTableLocalisation
});
```

## Ключевые правила стилизации

### 1. Соответствие классов HTML и JavaScript

**HTML заголовок:**
```html
<th class="right aligned collapsing"></th>
```

**JavaScript колонка:**
```javascript
{
    className: 'right aligned collapsing'  // Точно те же классы БЕЗ 'ui'
}
```

### 2. Типы колонок и их поведение

#### Сжимающиеся колонки (`collapsing`)
- Используются для коротких данных (ID, номера, кнопки)
- Занимают минимальное пространство
- Не растягиваются при изменении размера

#### Растягивающиеся колонки (без `collapsing`)
- Используются для описаний, комментариев
- Заполняют оставшееся пространство
- Обычно только одна такая колонка на таблицу

#### Скрываемые колонки (`hide-on-mobile`)
- Автоматически скрываются на экранах ≤768px
- Основные колонки остаются видимыми

### 3. CSS для предотвращения выхода за границы

```css
/* Предотвращение выхода таблицы за границы контейнера */
#table-name {
    max-width: 100%;
}
```

## Чего ИЗБЕГАТЬ

### ❌ Неправильно

```javascript
// НЕ добавляйте обработчики resize с columns.adjust()
$(window).on('resize', function() {
    dataTable.columns.adjust(); // Вызывает проблемы с размерами
});

// НЕ используйте scrollX без необходимости
scrollX: true  // Создает ненужные скроллы

// НЕ добавляйте префикс 'ui' в className
className: 'ui right aligned collapsing'  // Неправильно

// НЕ добавляйте overflow-x на контейнеры без необходимости
#table-container {
    overflow-x: auto;  // Создает скроллы
}
```

### ✅ Правильно

```javascript
// Пусть Semantic UI управляет размерами естественно
// Никаких дополнительных обработчиков resize

// Простая конфигурация DataTable
{
    className: 'right aligned collapsing'  // Без 'ui'
}

// Минимальные CSS ограничения
#table-name {
    max-width: 100%;  // Только это
}
```

## Паттерн управления пустым состоянием

```javascript
/**
 * Переключение отображения пустой таблицы
 */
toggleEmptyPlaceholder(isEmpty) {
    if (isEmpty) {
        $('#table-container').hide();
        $('#add-new-button').hide();
        $('#empty-table-placeholder').show();
    } else {
        $('#empty-table-placeholder').hide();
        $('#add-new-button').show();
        $('#table-container').show();
    }
}
```

## Паттерн кнопок действий

```javascript
// В render функции для колонки действий
render: function(data, type, row) {
    return `<div class="ui tiny basic icon buttons action-buttons">
        <a href="${globalRootUrl}module/modify/${row.uniqid}" 
           class="ui button edit popuped" 
           data-content="${globalTranslate.bt_ToolTipEdit}">
            <i class="icon edit blue"></i>
        </a>
        <a href="#" 
           data-value="${row.uniqid}" 
           class="ui button delete two-steps-delete popuped" 
           data-content="${globalTranslate.bt_ToolTipDelete}">
            <i class="icon trash red"></i>
        </a>
    </div>`;
}
```

## Интеграция с двойным кликом

```javascript
/**
 * Инициализация двойного клика для редактирования
 * ВАЖНО: Исключаем ячейки с кнопками действий
 */
initializeDoubleClickEdit() {
    this.$table.on('dblclick', 'tbody td:not(.ui.right.aligned)', function() {
        const data = dataTable.row(this).data();
        if (data && data.uniqid) {
            window.location = `${globalRootUrl}module/modify/${data.uniqid}`;
        }
    });
}
```

## Обработка удаления

```javascript
// Обработчик для кнопок удаления (интеграция с DeleteSomething.js)
this.$table.on('click', 'a.delete:not(.two-steps-delete)', function(e) {
    e.preventDefault();
    const $button = $(this);
    const recordId = $button.attr('data-value');
    
    $button.addClass('loading disabled');
    
    API.deleteRecord(recordId, callbackAfterDelete);
});
```

## Рекомендуемая структура модуля

```javascript
const moduleIndex = {
    $table: $('#module-table'),
    dataTable: {},
    
    initialize() {
        moduleIndex.toggleEmptyPlaceholder(true);
        moduleIndex.initializeDataTable();
    },
    
    initializeDataTable() {
        // Конфигурация DataTable
    },
    
    toggleEmptyPlaceholder(isEmpty) {
        // Управление пустым состоянием
    },
    
    initializeDoubleClickEdit() {
        // Двойной клик для редактирования
    },
    
    cbAfterDeleteRecord(response) {
        // Обработка после удаления
    },
    
    destroy() {
        if (moduleIndex.dataTable) {
            moduleIndex.dataTable.destroy();
        }
    }
};

$(document).ready(() => {
    moduleIndex.initialize();
});
```

## Заключение

Следуя этим рекомендациям, вы получите:
- ✅ Корректное поведение размеров таблицы
- ✅ Адаптивность на мобильных устройствах  
- ✅ Согласованный внешний вид с остальным интерфейсом
- ✅ Отсутствие ненужных скроллов
- ✅ Правильную работу с контейнерами

**Главное правило**: Минимальное вмешательство в работу Semantic UI и DataTables, использование только необходимых стилей и классов.

## Продвинутые паттерны для MikoPBX

### 1. Двухэтапная адаптивная визуализация

Для оптимального использования пространства экрана используйте двухэтапное скрытие колонок:

```css
/* CSS медиа-запросы для двухэтапного скрытия */
@media only screen and (max-width: 1000px) {
    .hide-on-tablet {
        display: none;
    }
}

@media only screen and (max-width: 768px) {
    .hide-on-mobile {
        display: none;
    }
}
```

**HTML заголовки:**
```html
<th class="collapsing">{{ t._('MainColumn') }}</th>
<th class="hide-on-tablet collapsing">{{ t._('SecondaryColumn') }}</th>
<th class="hide-on-mobile">{{ t._('AdditionalColumn') }}</th>
<th class="right aligned collapsing"></th>
```

**Поведение по экранам:**
- **Десктоп (>1000px):** Все колонки видны
- **Планшет (768-1000px):** Скрывается `.hide-on-tablet`
- **Мобильный (<768px):** Скрывается `.hide-on-mobile` и `.hide-on-tablet`

### 2. Стандартизированное отображение объектов в первой колонке

Используйте метод `getRepresent()` модели с кастомизацией для таблиц:

```php
// В DataStructure::createForList()
public static function createForList($model): array
{
    $data = self::createFromModel($model, []);
    
    // Кастомное представление без повторяющихся префиксов
    $objectName = SecurityHelper::escapeHtml($model->name ?? '');
    $data['represent'] = '<i class="appropriate-icon icon"></i> ' . $objectName . " <$model->extension>";
    
    return $data;
}
```

**JavaScript render:**
```javascript
{
    data: 'represent',
    className: 'collapsing',
    render: function(data, type, row) {
        if (type === 'display') {
            // Добавляем скрытый контент для поиска
            const searchableContent = [
                row.name || '',
                row.extension || '',
                row.uniqid || ''
            ].join(' ').toLowerCase();
            
            return `${data || '—'}<span style="display:none;">${searchableContent}</span>`;
        }
        // Для поиска возвращаем все поля
        return [data, row.name, row.extension, row.uniqid].filter(Boolean).join(' ');
    }
}
```

**Стандартные иконки по типам:**
- `<i class="users icon"></i>` - Call Queues
- `<i class="sitemap icon"></i>` - IVR Menu  
- `<i class="phone volume icon"></i>` - Conference Rooms
- `<i class="user icon"></i>` - Extensions
- `<i class="server icon"></i>` - Providers

### 3. Умное отображение больших текстовых полей

Для описаний и комментариев используйте адаптивное ограничение строк:

```javascript
{
    data: 'description',
    className: 'hide-on-mobile',
    orderable: false,
    render: function(data, type, row) {
        if (!data || data.trim() === '') return '—';

        if (type === 'display') {
            // Сохраняем переводы строк и разбиваем на строки
            const safeDesc = SecurityUtils.escapeHtml(data);
            const descriptionLines = safeDesc.split('\n').filter(line => line.trim() !== '');
            
            // Динамическое ограничение на основе связанных данных
            const relatedItemsCount = (row.members && row.members.length) || 0;
            const maxLines = Math.max(2, Math.min(6, relatedItemsCount || 3));
            
            if (descriptionLines.length <= maxLines) {
                // Помещается - показываем с форматированием
                const formattedDesc = descriptionLines.join('<br>');
                return `<div class="description-text" style="line-height: 1.3;">${formattedDesc}</div>`;
            } else {
                // Не помещается - сокращаем с popup
                const visibleLines = descriptionLines.slice(0, maxLines);
                visibleLines[maxLines - 1] += '...';
                
                const truncatedDesc = visibleLines.join('<br>');
                const fullDesc = descriptionLines.join('\n');
                
                return `<div class="description-text truncated popuped" 
                             data-content="${fullDesc}" 
                             data-position="top right" 
                             data-variation="wide"
                             style="cursor: help; border-bottom: 1px dotted #999; line-height: 1.3;">
                    ${truncatedDesc}
                </div>`;
            }
        }
        return data; // Для поиска и сортировки
    }
}
```

### 4. Многоуровневое содержимое колонок

Для отображения дополнительной информации над основным содержимым:

```javascript
{
    data: 'complexField',
    className: 'hide-on-tablet collapsing',
    render: function(data, type, row) {
        if (!data || data.length === 0) {
            return '<small>—</small>';
        }

        if (type === 'display') {
            // Дополнительная информация над основным содержимым
            const additionalInfo = getAdditionalInfo(row.strategy);
            
            const mainContent = data.map(item => {
                return SecurityUtils.sanitizeExtensionsApiContent(item.represent || item.extension);
            }).join('<br>');

            // Скрытый контент для поиска
            const searchableContent = data.map(item => {
                return [item.extension, item.represent || ''].join(' ');
            }).join(' ').toLowerCase();

            return `<div style="color: #999; font-size: 0.8em; margin-bottom: 3px;">${additionalInfo}</div>
                    <small>${mainContent}</small>
                    <span style="display:none;">${searchableContent}</span>`;
        }
        
        // Для поиска
        return data.map(item => {
            return [item.extension, item.represent || ''].filter(Boolean).join(' ');
        }).join(' ');
    }
}
```

### 5. Интеграция поиска и кнопки добавления

Размещение в одной строке через DataTables wrapper:

```javascript
// В конфигурации DataTable
searching: true,
drawCallback: function() {
    // Инициализация popup элементов
    moduleTable.$table.find('.popuped').popup({
        position: 'top right',
        variation: 'wide',
        hoverable: true,
        delay: { show: 300, hide: 100 }
    });

    // Перемещение кнопки добавления в DataTables grid
    const $addButton = $('#add-new-button');
    const $wrapper = $('#module-table_wrapper');
    const $leftColumn = $wrapper.find('.eight.wide.column').first();
    
    if ($addButton.length && $leftColumn.length) {
        $leftColumn.append($addButton);
        $addButton.show();
    }

    moduleTable.initializeDoubleClickEdit();
}
```

### 6. Оптимизация поиска для сложных данных

Обеспечение поиска по всем релевантным полям:

```javascript
// Для основной колонки объекта
render: function(data, type, row) {
    if (type === 'display') {
        const searchableContent = [
            row.name || '',
            row.extension || '',
            row.uniqid || ''
        ].join(' ').toLowerCase();
        
        return `${data}<span style="display:none;">${searchableContent}</span>`;
    }
    return [data, row.name, row.extension, row.uniqid].filter(Boolean).join(' ');
}

// Для колонок со связанными объектами
render: function(data, type, row) {
    if (type === 'display') {
        const searchableContent = data.map(item => {
            return [item.extension, item.name || '', item.represent || ''].join(' ');
        }).join(' ').toLowerCase();
        
        return `${displayContent}<span style="display:none;">${searchableContent}</span>`;
    }
    return data.map(item => [item.extension, item.name, item.represent].filter(Boolean).join(' ')).join(' ');
}
```

### 7. Унифицированные переводы для стратегий и статусов

Используйте систему переводов для пользовательских описаний:

```php
// В ru.php
'module_strategy_option1_short' => 'Краткое описание опции 1',
'module_strategy_option2_short' => 'Краткое описание опции 2',
```

```javascript
// В JavaScript
getStrategyDescription(strategy) {
    const translationKey = `module_strategy_${strategy}_short`;
    return globalTranslate[translationKey] || strategy;
}
```

### 8. Стандартная обработка popup элементов

```javascript
// В drawCallback всех таблиц
drawCallback: function() {
    // Унифицированная инициализация popup
    moduleTable.$table.find('.popuped').popup({
        position: 'top right',
        variation: 'wide',
        hoverable: true,
        delay: {
            show: 300,
            hide: 100
        }
    });
    
    // Остальная инициализация...
}
```

### 9. CSS класс для ограничения ширины таблиц

Добавляйте к таблицам для предотвращения чрезмерного растяжения:

```html
<table class="ui selectable unstackable compact table datatable-width-constrained" id="module-table">
```

### 10. Стандартные значения конфигурации DataTable

```javascript
// Базовая конфигурация для всех таблиц MikoPBX
const baseConfig = {
    order: [[0, 'asc']],
    lengthChange: false,
    paging: false,
    info: true,
    searching: true,
    language: SemanticLocalization.dataTableLocalisation,
    drawCallback: function() {
        // Стандартная инициализация
    }
};
```

## Типовые паттерны колонок

### Колонка объекта (первая колонка)
```javascript
{
    data: 'represent',
    className: 'collapsing',
    render: standardObjectRender // С поиском по имени, номеру, ID
}
```

### Колонка связанных объектов
```javascript
{
    data: 'relatedObjects',
    className: 'hide-on-tablet collapsing',
    render: relatedObjectsRender // С дополнительной информацией и поиском
}
```

### Колонка описания
```javascript
{
    data: 'description',
    className: 'hide-on-mobile',
    orderable: false,
    render: smartDescriptionRender // Адаптивное ограничение строк
}
```

### Колонка действий
```javascript
{
    data: null,
    orderable: false,
    searchable: false,
    className: 'right aligned collapsing',
    render: standardActionsRender // Редактирование и удаление
}
```

Эти паттерны обеспечивают единообразие всех таблиц в MikoPBX, оптимальную функциональность и профессиональный внешний вид.