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