# Fomantic-UI Components Guide for MikoPBX

Complete guide to using Fomantic-UI components in MikoPBX JavaScript code.

## Table of Contents

- [Component Initialization](#component-initialization)
- [Dropdowns](#dropdowns)
- [Modals](#modals)
- [Forms and Validation](#forms-and-validation)
- [Tables and DataTables](#tables-and-datatables)
- [Accordions and Tabs](#accordions-and-tabs)
- [Messages and Notifications](#messages-and-notifications)
- [Transitions and Animations](#transitions-and-animations)
- [Popups and Tooltips](#popups-and-tooltips)
- [Progress and Loaders](#progress-and-loaders)

## Component Initialization

### Basic Initialization Pattern

```javascript
const uiComponents = {
    /**
     * Initialize all UI components
     */
    initialize() {
        // Basic components
        $('.ui.accordion').accordion();
        $('.ui.dropdown').dropdown();
        $('.ui.checkbox').checkbox();
        $('.ui.tab').tab();
        $('.ui.popup').popup();
        $('.ui.rating').rating();

        // Initialize with specific settings
        uiComponents.initializeDropdowns();
        uiComponents.initializeModals();
    },

    initializeDropdowns() {
        // Specific dropdown configurations
    },

    initializeModals() {
        // Specific modal configurations
    }
};

$(document).ready(() => {
    uiComponents.initialize();
});
```

### Re-initialization After Dynamic Updates

```javascript
const dynamicContent = {
    addRow(html) {
        const $row = $(html);
        $('#table tbody').append($row);

        // Re-initialize components in new row
        $row.find('.ui.dropdown').dropdown();
        $row.find('.ui.checkbox').checkbox();
        $row.find('[data-tooltip]').popup();
    }
};
```

## Dropdowns

### Basic Dropdown

```javascript
// Simple initialization
$('.ui.dropdown').dropdown();

// With settings
$('.ui.dropdown').dropdown({
    onChange(value, text, $choice) {
        console.log('Selected:', value);
    },
    onShow() {
        console.log('Dropdown shown');
    },
    onHide() {
        console.log('Dropdown hidden');
    }
});
```

### Dropdown with Clear Behavior

```javascript
// ✅ CORRECT - Clear on special value
$('#periodic-announce-dropdown').dropdown({
    onChange(value) {
        if (parseInt(value, 10) === -1) {
            $('#periodic-announce-dropdown').dropdown('clear');
        }
    },
});
```

### Searchable Dropdown

```javascript
$('#extension-select').dropdown({
    fullTextSearch: true,
    match: 'text',
    onChange(value) {
        module.handleExtensionChange(value);
    }
});
```

### API-based Dropdown

```javascript
$('#user-search').dropdown({
    apiSettings: {
        url: `${globalRootUrl}users/search?q={query}`,
        cache: false,
        onResponse(response) {
            // Transform API response to dropdown format
            return {
                success: true,
                results: response.data.map(user => ({
                    name: user.name,
                    value: user.id,
                    text: user.email
                }))
            };
        }
    },
    saveRemoteData: false,
    minCharacters: 2
});
```

### Multiple Selection Dropdown

```javascript
$('#tags-dropdown').dropdown({
    allowAdditions: true,
    hideAdditions: false,
    message: {
        addResult: 'Add <b>{term}</b>',
        noResults: 'No results found.'
    }
});
```

### Helper Method Pattern

```javascript
// ✅ CORRECT - Use helper methods from shared modules
$('#extension-select').dropdown(Extensions.getDropdownSettingsWithEmpty());
$('#sound-select').dropdown(SoundFilesSelector.getDropdownSettingsWithEmpty());

// Helper method example
const Extensions = {
    getDropdownSettingsWithEmpty() {
        return {
            apiSettings: {
                url: `${globalRootUrl}extensions/getForSelect`,
                cache: false
            },
            onChange(value) {
                if (value === '') {
                    $(this).dropdown('clear');
                }
            },
            clearable: true
        };
    }
};
```

## Modals

### Basic Modal

```javascript
$('#my-modal').modal({
    closable: false,
    onDeny() {
        // Handle cancel
        return true; // Close modal
    },
    onApprove() {
        // Handle save
        return false; // Keep modal open for validation
    }
}).modal('show');
```

### Modal Manager Pattern

```javascript
const ModalManager = {
    /**
     * Show modal with custom configuration
     * @param {string} modalId - Modal element ID
     * @param {Object} options - Modal options
     */
    showModal(modalId, options = {}) {
        const defaultOptions = {
            closable: false,
            onShow() {
                // Initialize content when modal opens
                ModalManager.initializeModalContent($(`#${modalId}`));
            },
            onVisible() {
                // Focus first input when fully visible
                $(`#${modalId}`).find('input:first').focus();
            },
            onHidden() {
                // Clean up when modal closes
                $(`#${modalId}`).find('form').form('clear');
            },
            onDeny() {
                return true;
            },
            onApprove() {
                return ModalManager.validateAndSave($(`#${modalId}`));
            }
        };

        $(`#${modalId}`).modal({
            ...defaultOptions,
            ...options
        }).modal('show');
    },

    /**
     * Show confirmation dialog
     * @param {string} message - Confirmation message
     * @param {Function} onConfirm - Callback on confirm
     * @param {Function} onCancel - Callback on cancel
     */
    confirm(message, onConfirm, onCancel) {
        $('#confirm-modal .content').html(message);
        $('#confirm-modal').modal({
            closable: false,
            onApprove() {
                if (typeof onConfirm === 'function') {
                    onConfirm();
                }
                return true;
            },
            onDeny() {
                if (typeof onCancel === 'function') {
                    onCancel();
                }
                return true;
            }
        }).modal('show');
    },

    /**
     * Initialize components inside modal
     * @param {jQuery} $modal - Modal jQuery object
     */
    initializeModalContent($modal) {
        $modal.find('.ui.dropdown').dropdown();
        $modal.find('.ui.checkbox').checkbox();
        $modal.find('.ui.accordion').accordion();
    }
};

// Usage
ModalManager.showModal('edit-modal');
ModalManager.confirm('Are you sure?', () => {
    // Confirmed
}, () => {
    // Cancelled
});
```

### Modal with Form

```javascript
const editModal = {
    $modal: $('#edit-modal'),
    $form: $('#edit-form'),

    show(data) {
        // Populate form
        editModal.$form.form('set values', data);

        // Show modal
        editModal.$modal.modal({
            closable: false,
            onApprove() {
                return editModal.save();
            }
        }).modal('show');
    },

    save() {
        // Validate
        if (!editModal.$form.form('is valid')) {
            return false; // Keep modal open
        }

        // Get values
        const data = editModal.$form.form('get values');

        // Save
        PbxApi.Save(data, (result, response) => {
            if (result === true) {
                editModal.$modal.modal('hide');
                UserMessage.showSuccess('Saved');
            } else {
                UserMessage.showError(response.messages.error);
            }
        });

        return false; // Keep modal open until async operation completes
    }
};
```

## Forms and Validation

### Basic Form Setup

```javascript
const formHandler = {
    $formObj: $('#module-form'),

    initialize() {
        formHandler.$formObj.form({
            fields: formHandler.validateRules,
            inline: true,
            on: 'blur',
            onSuccess(event, fields) {
                event.preventDefault();
                formHandler.handleSubmit(fields);
            },
            onFailure() {
                UserMessage.showError(globalTranslate.form_ValidationError);
            }
        });
    },

    validateRules: {
        name: {
            identifier: 'name',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.mod_ValidateNameEmpty,
                },
            ],
        },
        extension: {
            identifier: 'extension',
            rules: [
                {
                    type: 'number',
                    prompt: globalTranslate.mod_ValidateExtensionNumber,
                },
                {
                    type: 'empty',
                    prompt: globalTranslate.mod_ValidateExtensionEmpty,
                },
            ],
        },
    },

    handleSubmit(fields) {
        // Process form submission
    }
};
```

### Custom Validation Rules

```javascript
// Add custom validation rule
$.fn.form.settings.rules.phone = (value) => {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(value) && value.replace(/\D/g, '').length >= 10;
};

$.fn.form.settings.rules.ipAddress = (value) => {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(value)) return false;

    const parts = value.split('.');
    return parts.every(part => parseInt(part) <= 255);
};

// Use in validation rules
validateRules: {
    phoneNumber: {
        identifier: 'phone',
        rules: [
            {
                type: 'phone',
                prompt: 'Please enter a valid phone number'
            }
        ]
    },
    ipAddress: {
        identifier: 'ip',
        rules: [
            {
                type: 'ipAddress',
                prompt: 'Please enter a valid IP address'
            }
        ]
    }
}
```

### Dynamic Form Fields

```javascript
const dynamicForm = {
    /**
     * Add field to form
     * @param {string} container - Container selector
     * @param {string} fieldHtml - Field HTML
     */
    addField(container, fieldHtml) {
        const $field = $(fieldHtml);
        $(container).append($field);

        // Initialize UI components in new field
        $field.find('.ui.dropdown').dropdown();
        $field.find('.ui.checkbox').checkbox();

        // Re-validate form
        $(container).closest('form').form('validate form');
    },

    /**
     * Remove field with animation
     * @param {jQuery} $field - Field to remove
     */
    removeField($field) {
        $field.transition('fade down', {
            duration: 300,
            onComplete() {
                $field.remove();
                Form.dataChanged();
            }
        });
    }
};
```

### Form State Management

```javascript
const formState = {
    /**
     * Save form state to session storage
     * @param {jQuery} $form - Form element
     */
    saveState($form) {
        const formData = $form.form('get values');
        sessionStorage.setItem(
            `form_${$form.attr('id')}`,
            JSON.stringify(formData)
        );
    },

    /**
     * Restore form state from session storage
     * @param {jQuery} $form - Form element
     */
    restoreState($form) {
        const savedData = sessionStorage.getItem(`form_${$form.attr('id')}`);
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                $form.form('set values', data);
            } catch (e) {
                console.error('Error restoring form state:', e);
            }
        }
    }
};
```

## Tables and DataTables

### DataTable Integration

```javascript
const tableManager = {
    $table: $('#data-table'),
    dataTable: null,

    initialize() {
        tableManager.dataTable = tableManager.$table.DataTable({
            lengthChange: false,
            paging: false,
            ordering: true,
            info: false,
            searching: true,
            language: SemanticLocalization.dataTableLocalisation,
            columns: [
                null,
                null,
                { orderable: false, searchable: false }
            ],
            order: [[0, 'asc']],
            drawCallback() {
                // Re-initialize components after redraw
                tableManager.initializeTableComponents();
            }
        });

        // Move add button
        $('#add-new-button').appendTo($('div.eight.column:eq(0)'));
    },

    initializeTableComponents() {
        tableManager.$table.find('.ui.dropdown').dropdown();
        tableManager.$table.find('.ui.checkbox').checkbox();
        tableManager.$table.find('[data-tooltip]').popup();
    }
};
```

### Sortable Tables with Drag & Drop

```javascript
const sortableTable = {
    $table: $('#sortable-table'),

    initialize() {
        sortableTable.$table.tableDnD({
            onDragClass: 'dragging',
            dragHandle: '.drag-handle',
            onDrop(table, row) {
                const order = $(table).find('tbody tr').map((index, tr) => ({
                    id: $(tr).attr('id'),
                    priority: index
                })).get();

                sortableTable.saveOrder(order);
            }
        });

        // Visual feedback
        sortableTable.$table.find('.drag-handle').hover(
            function() { $(this).closest('tr').addClass('warning'); },
            function() { $(this).closest('tr').removeClass('warning'); }
        );
    },

    saveOrder(order) {
        PbxApi.SaveOrder(
            { order: JSON.stringify(order) },
            sortableTable.cbAfterSave
        );
    }
};
```

### Table Row Actions

```javascript
const tableActions = {
    initialize() {
        // Edit action
        $('body').on('click', '.edit.button', (e) => {
            e.preventDefault();
            const $row = $(e.currentTarget).closest('tr');
            const id = $row.attr('id');
            tableActions.editRow(id);
        });

        // Delete action
        $('body').on('click', '.delete.button', (e) => {
            e.preventDefault();
            const $button = $(e.currentTarget);
            $button.addClass('loading disabled');

            const $row = $button.closest('tr');
            const id = $row.attr('id');

            ModalManager.confirm(
                globalTranslate.confirm_DeleteMessage,
                () => {
                    tableActions.deleteRow(id, $row);
                },
                () => {
                    $button.removeClass('loading disabled');
                }
            );
        });
    },

    deleteRow(id, $row) {
        RecordAPI.deleteRecord(id, (result, response) => {
            if (result === true) {
                $row.transition('fade out', {
                    duration: 500,
                    onComplete() {
                        $row.remove();
                        tableActions.checkEmptyState();
                    }
                });
            } else {
                UserMessage.showError(response.messages.error);
                $row.find('.delete.button').removeClass('loading disabled');
            }
        });
    },

    checkEmptyState() {
        const $tbody = $('#data-table tbody');
        if ($tbody.find('tr:not(.empty)').length === 0) {
            $tbody.html(`
                <tr class="empty">
                    <td colspan="100%" class="center aligned">
                        <div class="ui placeholder segment">
                            <div class="ui icon header">
                                <i class="search icon"></i>
                                ${globalTranslate.table_NoRecords}
                            </div>
                        </div>
                    </td>
                </tr>
            `);
        }
    }
};
```

## Accordions and Tabs

### Accordion

```javascript
// Basic accordion
$('.ui.accordion').accordion();

// Exclusive accordion (only one open)
$('.ui.accordion').accordion({
    exclusive: true
});

// Non-exclusive (multiple can be open)
$('.ui.accordion').accordion({
    exclusive: false,
    onOpening() {
        const $content = $(this);
        if ($content.hasClass('lazy')) {
            loadAccordionContent($content);
        }
    },
    onOpen() {
        console.log('Accordion opened');
    }
});
```

### Tabs

```javascript
// Basic tabs
$('.ui.tab').tab();

// Tabs with history
$('.ui.tab').tab({
    history: true,
    historyType: 'hash',
    onLoad(tabPath) {
        updateBreadcrumb(tabPath);
    },
    onVisible(tabPath) {
        console.log('Tab visible:', tabPath);
    }
});
```

## Messages and Notifications

### Show Message

```javascript
const messageHandler = {
    showSuccess(message) {
        $('.message.ajax').remove();
        const $message = $(`
            <div class="ui positive message ajax">
                <i class="close icon"></i>
                <div class="header">${globalTranslate.msg_SuccessTitle}</div>
                <p>${message}</p>
            </div>
        `);

        $message.insertBefore('.main.content');

        // Auto-hide after 5 seconds
        setTimeout(() => {
            $message.transition('fade');
        }, 5000);

        // Close button
        $message.find('.close').on('click', () => {
            $message.transition('fade');
        });
    },

    showError(message, title = globalTranslate.msg_ErrorTitle) {
        $('.message.ajax').remove();
        const $message = $(`
            <div class="ui negative message ajax">
                <i class="close icon"></i>
                <div class="header">${title}</div>
                <p>${message}</p>
            </div>
        `);

        $message.insertBefore('.main.content');

        $message.find('.close').on('click', () => {
            $message.transition('fade');
        });
    }
};
```

## Transitions and Animations

### Basic Transitions

```javascript
// Fade in/out
$element.transition('fade');
$element.transition('fade in');
$element.transition('fade out');

// Slide
$element.transition('slide down');
$element.transition('slide up');

// Scale
$element.transition('scale');

// With callback
$element.transition('fade out', {
    duration: 500,
    onComplete() {
        $element.remove();
    }
});
```

### Sequential Animations

```javascript
// Animate multiple elements with delay
$('.item').transition({
    animation: 'fade up',
    interval: 100,
    reverse: false
});
```

### Animation Helper

```javascript
const animations = {
    animateIn(elements, animation = 'fade up') {
        $(elements).transition({
            animation: animation,
            interval: 100,
            reverse: false
        });
    },

    flashMessage(message, type = 'info') {
        const $message = $(`
            <div class="ui ${type} message transition hidden">
                ${message}
            </div>
        `);

        $('.main.container').prepend($message);

        $message.transition('fade down in', {
            onComplete() {
                setTimeout(() => {
                    $message.transition('fade up out', {
                        onComplete() {
                            $message.remove();
                        }
                    });
                }, 3000);
            }
        });
    }
};
```

## Popups and Tooltips

### Basic Popup

```javascript
// Initialize all popups
$('[data-tooltip]').popup();

// With settings
$('.help-icon').popup({
    position: 'top center',
    variation: 'inverted',
    delay: {
        show: 300,
        hide: 100
    }
});
```

### Dynamic Popup Content

```javascript
$('.info-button').popup({
    popup: $('.custom.popup'),
    on: 'click',
    position: 'bottom left',
    onShow() {
        // Load content when popup shows
        loadPopupContent();
    }
});
```

## Progress and Loaders

### Progress Bar

```javascript
$('#progress').progress({
    percent: 0,
    text: {
        active: '{percent}% complete',
        success: 'Upload complete!'
    },
    onSuccess() {
        console.log('Progress complete');
    }
});

// Update progress
$('#progress').progress('set percent', 50);
$('#progress').progress('increment');
```

### Loading Dimmer

```javascript
const loadingStates = {
    showLoading(element) {
        const $element = $(element);
        $element.addClass('loading');

        if (!$element.find('.ui.dimmer').length) {
            $element.append(`
                <div class="ui active inverted dimmer">
                    <div class="ui text loader">${globalTranslate.loading}</div>
                </div>
            `);
        }
    },

    hideLoading(element) {
        const $element = $(element);
        $element.removeClass('loading');
        $element.find('.ui.dimmer').remove();
    }
};
```

## Best Practices

1. **Initialize after DOM ready** - Always wrap in `$(document).ready()`
2. **Re-initialize after dynamic updates** - Components in new content need initialization
3. **Use semantic class names** - `.ui.dropdown`, `.ui.form`, etc.
4. **Cache jQuery objects** - Store in module for reuse
5. **Handle component state** - Save/restore dropdown values before destroy/recreate
6. **Use callbacks** - `onShow`, `onHide`, `onChange` for logic
7. **Clean up** - Remove event listeners, destroy components when needed
8. **Optimize performance** - Use `cache: true` in API settings where appropriate
9. **Consistent error handling** - Use UserMessage for all user feedback
10. **Accessibility** - Use proper ARIA labels and keyboard navigation
