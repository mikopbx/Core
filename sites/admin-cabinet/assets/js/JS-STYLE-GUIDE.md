# JavaScript Style Guide for MikoPBX AdminCabinet

This guide demonstrates the JavaScript coding standards and patterns used in MikoPBX AdminCabinet based on exemplary code from the project and incorporates best practices from the Airbnb JavaScript Style Guide.

## Table of Contents

1. [Module Structure Pattern](#1-module-structure-pattern)
2. [jQuery and DOM Manipulation](#2-jquery-and-dom-manipulation)
3. [API Communication Pattern](#3-api-communication-pattern)
4. [Form Handling](#4-form-handling)
5. [UI Component Initialization](#5-ui-component-initialization)
6. [Data Table Pattern](#6-data-table-pattern)
7. [Worker and Status Checking](#7-worker-and-status-checking)
8. [Translation and i18n](#8-translation-and-i18n)
9. [Storage and Caching](#9-storage-and-caching)
10. [Error Handling and User Feedback](#10-error-handling-and-user-feedback)
11. [ES6+ Features and Modern JavaScript](#11-es6-features-and-modern-javascript)
12. [Variables and Constants](#12-variables-and-constants)
13. [Functions and Arrow Functions](#13-functions-and-arrow-functions)
14. [Arrays and Iterations](#14-arrays-and-iterations)
15. [Objects and Destructuring](#15-objects-and-destructuring)
16. [Strings and Template Literals](#16-strings-and-template-literals)
17. [Comparison and Type Coercion](#17-comparison-and-type-coercion)
18. [Code Style and Formatting](#18-code-style-and-formatting)
19. [Fomantic-UI Components](#19-fomantic-ui-components)
20. [Fomantic-UI Forms and Validation](#20-fomantic-ui-forms-and-validation)
21. [Fomantic-UI Tables and Data Display](#21-fomantic-ui-tables-and-data-display)
22. [Fomantic-UI Layout and Responsive Design](#22-fomantic-ui-layout-and-responsive-design)

## 1. Module Structure Pattern

Each JavaScript module follows a consistent object-oriented pattern:

```javascript
/* global globalRootUrl, globalTranslate, PbxApi, i18n */

/**
 * Module description explaining its purpose
 * @module moduleName
 */
const moduleName = {
    /**
     * jQuery object for the main element
     * @type {jQuery}
     */
    $mainElement: $('#main-element'),
    
    /**
     * Configuration or constant values
     * @type {number}
     */
    timeOut: 10000,
    
    /**
     * Storage keys for sessionStorage/localStorage
     * @type {string}
     */
    storageKeyExample: 'moduleNameExample',

    /**
     * Initialize the module
     */
    initialize() {
        // Initialize sub-components
        moduleName.initializeEventHandlers();
        moduleName.initializeUIComponents();
        
        // Set up data subscriptions
        EventBus.subscribe('event-name', data => {
            moduleName.handleEventData(data);
        });
        
        // Load initial data
        PbxApi.ModuleGetData(moduleName.cbAfterDataReceived);
    },
    
    /**
     * Initialize event handlers
     */
    initializeEventHandlers() {
        // Use arrow functions for event handlers to preserve context
        moduleName.$mainElement.on('click', '.button-class', (e) => {
            e.preventDefault();
            const $target = $(e.target);
            const id = $target.closest('tr').attr('id');
            moduleName.handleButtonClick(id);
        });
    },
    
    /**
     * Callback for API responses
     * @param {boolean} result - Success status
     * @param {Object} response - API response data
     */
    cbAfterDataReceived(result, response) {
        if (result === false) {
            return;
        }
        
        // Process response data
        if (response.data && response.data.items) {
            moduleName.updateUI(response.data.items);
        }
    }
};

// Initialize on document ready
$(document).ready(() => {
    moduleName.initialize();
});
```

### Real Example from advice-worker.js:

```javascript
const adviceWorker = {
    timeOut: 10000,
    timeOutHandle: 0,
    $advice: $('#advice'),
    $adviceBellButton: $('#show-advice-button'),
    storageKeyRawAdvice: 'rawAdviceData',
    storageKeyBellState: 'adviceBellState',

    initialize() {
        adviceWorker.showPreviousAdvice();
        EventBus.subscribe('advice', data => {
            adviceWorker.cbAfterResponse(data);
        });
        EventBus.subscribe('models-changed', data => {
            if (data.model === 'MikoPBX\\Common\\Models\\PbxSettings' 
                && (data.recordId === 'WebAdminPassword' || data.recordId === 'SSHPassword')
            ) {
                PbxApi.AdviceGetList(adviceWorker.cbAfterResponse);
            }
        });
        PbxApi.AdviceGetList(adviceWorker.cbAfterResponse);
    },
    
    translateMessage(messageData) {
        return i18n(messageData.messageTpl, messageData.messageParams);
    }
};
```

## 2. jQuery and DOM Manipulation

### Best Practices:

```javascript
// Cache jQuery objects with $ prefix
const component = {
    $form: $('#my-form'),
    $submitButton: $('#submit-button'),
    $statusDiv: $('.status-indicator'),
    
    // Use descriptive jQuery object names
    $extensionsTable: $('#extensions-table'),
    $deleteButtons: $('.delete-row-button'),
};

// Efficient event delegation
$('body').on('click', '.dynamic-button', (e) => {
    // Handle dynamically added elements
});

// Chain jQuery methods for efficiency
$element
    .addClass('active')
    .removeClass('disabled')
    .show();
```

### Real Example from callqueue-modify.js:

```javascript
const callQueue = {
    $extension: $('#extension'),
    $formObj: $('#queue-form'),
    $accordions: $('#queue-form .ui.accordion'),
    $dropDowns: $('#queue-form .dropdown'),
    $errorMessages: $('#form-error-messages'),
    $checkBoxes: $('#queue-form .checkbox'),
    forwardingSelect: '#queue-form .forwarding-select',
    $deleteRowButton: $('.delete-row-button'),
    
    initialize() {
        // Initialize UI components
        callQueue.$accordions.accordion();
        callQueue.$dropDowns.dropdown();
        callQueue.$checkBoxes.checkbox();
        
        // Set up row deletion from queue members table
        callQueue.$deleteRowButton.on('click', (e) => {
            e.preventDefault();
            $(e.target).closest('tr').remove();
            callQueue.reinitializeExtensionSelect();
            callQueue.updateExtensionTableView();
            Form.dataChanged();
            return false;
        });
    }
};
```

## 3. API Communication Pattern

### Best Practices:

```javascript
// Consistent API callback pattern
const moduleAPI = {
    /**
     * Get module data with proper JSDoc
     * @param {Function} callback - Callback function
     */
    getModuleData(callback) {
        $.api({
            url: PbxApi.moduleGetDataUrl,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.result === true, response);
            },
            onError() {
                callback(false, {});
            }
        });
    },
    
    /**
     * Save data with loading states
     * @param {Object} data - Data to save
     * @param {Function} callback - Callback function
     */
    saveData(data, callback) {
        // Show loading state
        $('.save-button').addClass('loading disabled');
        
        $.api({
            url: PbxApi.moduleSaveUrl,
            method: 'POST',
            data: data,
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response);
            },
            onComplete() {
                // Always remove loading state
                $('.save-button').removeClass('loading disabled');
            }
        });
    }
};
```

### Real Example from callqueues-index.js:

```javascript
// Set up delete functionality on delete button click
$('body').on('click', 'a.delete', (e) => {
    e.preventDefault();
    $(e.target).addClass('disabled');
    // Get the call queue ID from the closest table row
    const callQueueId = $(e.target).closest('tr').attr('id');
    
    // Remove any previous AJAX messages
    $('.message.ajax').remove();
    
    // Call the PbxApi method to delete the call queue record
    CallQueuesAPI.deleteRecord(callQueueId, callQueuesTable.cbAfterDeleteRecord);
});

cbAfterDeleteRecord(response){
    if (response.result === true) {
        // Remove the deleted record's table row
        callQueuesTable.$queuesTable.find(`tr[id=${response.data.id}]`).remove();
        // Call the callback function for data change
        Extensions.cbOnDataChanged();
    } else {
        // Show an error message if deletion was not successful
        UserMessage.showError(response.messages.error, globalTranslate.cq_ImpossibleToDeleteCallQueue);
    }
    $('a.delete').removeClass('disabled');
}
```

## 4. Form Handling

### Best Practices:

```javascript
const formHandler = {
    $formObj: $('#module-form'),
    
    initialize() {
        // Set up form with centralized Form object
        Form.$formObj = formHandler.$formObj;
        Form.url = `${globalRootUrl}module/save`;
        Form.validateRules = formHandler.validateRules;
        Form.cbBeforeSendForm = formHandler.cbBeforeSendForm;
        Form.cbAfterSendForm = formHandler.cbAfterSendForm;
        Form.initialize();
    },
    
    validateRules: {
        fieldName: {
            identifier: 'field-name',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.mod_ValidateFieldEmpty,
                },
                {
                    type: 'regExp[/^[0-9]+$/]',
                    prompt: globalTranslate.mod_ValidateFieldFormat,
                }
            ],
        },
    },
    
    cbBeforeSendForm(settings) {
        // Prepare data before sending
        const result = settings;
        result.data = formHandler.$formObj.form('get values');
        
        // Add complex data structures
        const members = [];
        $('.member-row').each((index, obj) => {
            members.push({
                id: $(obj).attr('id'),
                priority: index,
            });
        });
        result.data.members = JSON.stringify(members);
        
        return result;
    }
};
```

### Real Example from callqueue-modify.js:

```javascript
validateRules: {
    name: {
        identifier: 'name',
        rules: [
            {
                type: 'empty',
                prompt: globalTranslate.cq_ValidateNameEmpty,
            },
        ],
    },
    extension: {
        identifier: 'extension',
        rules: [
            {
                type: 'number',
                prompt: globalTranslate.cq_ValidateExtensionNumber,
            },
            {
                type: 'empty',
                prompt: globalTranslate.cq_ValidateExtensionEmpty,
            },
            {
                type: 'existRule[extension-error]',
                prompt: globalTranslate.cq_ValidateExtensionDouble,
            },
        ],
    },
},

cbBeforeSendForm(settings) {
    let result = settings;
    result.data = callQueue.$formObj.form('get values');
    
    const arrMembers = [];
    $(callQueue.memberRow).each((index, obj) => {
        if ($(obj).attr('id')) {
            arrMembers.push({
                number: $(obj).attr('id'),
                priority: index,
            });
        }
    });
    
    if (arrMembers.length === 0) {
        result = false;
        callQueue.$errorMessages.html(globalTranslate.cq_ValidateNoExtensions);
        callQueue.$formObj.addClass('error');
    } else {
        result.data.members = JSON.stringify(arrMembers);
    }
    
    return result;
}
```

## 5. UI Component Initialization

### Best Practices:

```javascript
const uiComponents = {
    /**
     * Initialize all UI components
     */
    initialize() {
        // Semantic UI components
        $('.ui.accordion').accordion();
        $('.ui.dropdown').dropdown();
        $('.ui.checkbox').checkbox();
        $('.ui.tab').tab();
        
        // Custom dropdown settings
        $('#special-dropdown').dropdown({
            onChange(value) {
                if (parseInt(value, 10) === -1) {
                    $('#special-dropdown').dropdown('clear');
                }
            },
        });
        
        // Initialize with helper methods
        $('#extension-select').dropdown(Extensions.getDropdownSettingsWithEmpty());
        $('#sound-select').dropdown(SoundFilesSelector.getDropdownSettingsWithEmpty());
    }
};
```

### Real Example from callqueue-modify.js:

```javascript
// Initialize UI components
callQueue.$accordions.accordion();
callQueue.$dropDowns.dropdown();
callQueue.$checkBoxes.checkbox();

// Set up periodic announce dropdown behaviour
callQueue.$periodicAnnounceDropdown.dropdown({
    onChange(value) {
        if (parseInt(value, 10) === -1) {
            callQueue.$periodicAnnounceDropdown.dropdown('clear');
        }
    },
});

// Initialize forwarding select
$(callQueue.forwardingSelect).dropdown(Extensions.getDropdownSettingsWithEmpty());

// Initialize audio message select
$('#queue-form .audio-message-select').dropdown(SoundFilesSelector.getDropdownSettingsWithEmpty());
```

## 6. Data Table Pattern

### Best Practices:

```javascript
const dataTableHandler = {
    $table: $('#data-table'),
    dataTable: {},
    
    initializeDataTable() {
        dataTableHandler.dataTable = dataTableHandler.$table.DataTable({
            lengthChange: false,
            paging: false,
            columns: [
                null,  // Column 1
                null,  // Column 2
                { orderable: false, searchable: false }, // Actions column
            ],
            order: [[0, 'asc']],
            language: SemanticLocalization.dataTableLocalisation,
            drawCallback() {
                // Re-initialize UI components after table redraw
                Extensions.updatePhonesRepresent();
            }
        });
        
        // Move UI elements after table initialization
        $('#add-new-button').appendTo($('div.eight.column:eq(0)'));
    }
};
```

### Real Example from callqueues-index.js:

```javascript
initializeDataTable() {
    // Initialize DataTable on $queuesTable element with custom settings
    callQueuesTable.$queuesTable.DataTable({
        lengthChange: false,  // Disable user to change records per page
        paging: false, // Disable pagination
        
        // Define the characteristics of each column in the table
        columns: [
            null,
            null,
            null,
            null,
            {
                orderable: false,  // This column is not orderable
                searchable: false  // This column is not searchable
            },
        ],
        order: [1, 'asc'],  // By default, order by the second column ascending
        language: SemanticLocalization.dataTableLocalisation, // Set localisation options
    });
    
    // Move the "add new" button to the first eight column div
    $('#add-new-button').appendTo($('div.eight.column:eq(0)'));
}
```

## 7. Worker and Status Checking

### Best Practices:

```javascript
const statusChecker = {
    timeOut: 10000,
    timeOutHandle: 0,
    
    initialize() {
        // Initial check
        statusChecker.checkStatus();
        
        // Set up periodic checking
        statusChecker.timeOutHandle = setTimeout(
            statusChecker.worker,
            statusChecker.timeOut
        );
    },
    
    worker() {
        // Clear previous timeout
        window.clearTimeout(statusChecker.timeOutHandle);
        
        // Perform status check
        PbxApi.SystemGetStatus(statusChecker.cbAfterStatusCheck);
    },
    
    cbAfterStatusCheck(response) {
        if (response.result === true) {
            // Update UI based on status
            statusChecker.updateStatusDisplay(response.data);
        }
        
        // Schedule next check
        statusChecker.timeOutHandle = setTimeout(
            statusChecker.worker,
            statusChecker.timeOut
        );
    }
};
```

### Real Example from advice-worker.js:

```javascript
cbAfterResponse(response) {
    if (response.result === false) {
        return;
    }
    
    adviceWorker.$advice.html('');
    
    if (response.data.advice !== undefined) {
        const adviceData = response.data.advice;
        
        // Store raw advice data for later use
        sessionStorage.setItem(adviceWorker.storageKeyRawAdvice, JSON.stringify(adviceData));
        
        // Generate HTML and update UI
        const adviceResult = adviceWorker.generateAdviceHtml(adviceData);
        
        // ... update UI ...
        
        // Set timeout for next update
        adviceWorker.timeoutHandle = window.setTimeout(
            adviceWorker.worker,
            adviceWorker.timeOut,
        );
    }
}
```

## 8. Translation and i18n

### Best Practices:

```javascript
const translationExample = {
    /**
     * Translate message with parameters
     * @param {Object} messageData - Message template and parameters
     * @returns {string} - Translated message
     */
    translateMessage(messageData) {
        // Use i18n function for translations with parameters
        return i18n(messageData.messageTpl, messageData.messageParams);
    },
    
    showMessage() {
        // Use globalTranslate for simple translations
        const message = globalTranslate.mod_MessageText;
        UserMessage.showInformation(message);
        
        // Multi-language error messages
        const errorTitle = globalTranslate.mod_ErrorTitle;
        UserMessage.showMultiString(response.messages, errorTitle);
    }
};
```

### Real Example from advice-worker.js:

```javascript
translateMessage(messageData) {
    return i18n(messageData.messageTpl, messageData.messageParams);
},

generateAdviceHtml(adviceData) {
    let htmlMessages = '';
    let countMessages = 0;
    let iconBellClass = '';
    
    htmlMessages += `<div class="ui header">${globalTranslate.adv_PopupHeader}</div>`;
    htmlMessages += '<div class="ui relaxed divided list">';
    
    if (adviceData.error !== undefined && adviceData.error.length > 0) {
        $.each(adviceData.error, (key, value) => {
            htmlMessages += '<div class="item">';
            htmlMessages += '<i class="frown outline red icon"></i>';
            htmlMessages += adviceWorker.translateMessage(value);
            htmlMessages += '</div>';
            countMessages += 1;
        });
    }
    // ... continue processing
}
```

## 9. Storage and Caching

### Best Practices:

```javascript
const storageHandler = {
    storageKeyData: 'moduleData',
    storageKeySettings: 'moduleSettings',
    
    saveToStorage(data) {
        // Use sessionStorage for temporary data
        sessionStorage.setItem(
            storageHandler.storageKeyData, 
            JSON.stringify(data)
        );
    },
    
    loadFromStorage() {
        const rawData = sessionStorage.getItem(storageHandler.storageKeyData);
        if (rawData) {
            try {
                return JSON.parse(rawData);
            } catch (e) {
                console.error('Error parsing stored data', e);
                sessionStorage.removeItem(storageHandler.storageKeyData);
            }
        }
        return null;
    },
    
    clearStorage() {
        sessionStorage.removeItem(storageHandler.storageKeyData);
        sessionStorage.removeItem(storageHandler.storageKeySettings);
    }
};
```

### Real Example from advice-worker.js:

```javascript
showPreviousAdvice() {
    // Get raw bell state
    const bellState = sessionStorage.getItem(adviceWorker.storageKeyBellState);
    if (bellState) {
        adviceWorker.$adviceBellButton.html(bellState);
    }
    
    // Get and process raw advice data
    const rawAdviceData = sessionStorage.getItem(adviceWorker.storageKeyRawAdvice);
    if (rawAdviceData) {
        try {
            const adviceData = JSON.parse(rawAdviceData);
            const adviceResult = adviceWorker.generateAdviceHtml(adviceData);
            
            adviceWorker.$advice.html(adviceResult.html);
            // ... continue setup
        } catch (e) {
            console.error('Error parsing cached advice data', e);
            // Clear invalid cache
            sessionStorage.removeItem(adviceWorker.storageKeyRawAdvice);
        }
    }
}
```

## 10. Error Handling and User Feedback

### Best Practices:

```javascript
const errorHandler = {
    /**
     * Handle API errors gracefully
     * @param {Object} response - API response
     */
    handleApiError(response) {
        // Remove loading states
        $('.loading').removeClass('loading disabled');
        
        if (response.messages && response.messages.error) {
            // Show specific error message
            UserMessage.showError(
                response.messages.error, 
                globalTranslate.mod_ErrorHeader
            );
        } else {
            // Show generic error
            UserMessage.showError(globalTranslate.mod_UnknownError);
        }
    },
    
    /**
     * Show success message with auto-hide
     * @param {string} message - Success message
     */
    showSuccess(message) {
        $('.message.ajax').remove();
        const $message = $('<div class="ui positive message ajax">');
        $message.html(message);
        $message.insertBefore(errorHandler.$formObj);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            $message.transition('fade');
        }, 5000);
    }
};
```

### Real Example from callqueues-index.js:

```javascript
cbAfterDeleteRecord(response){
    if (response.result === true) {
        // Remove the deleted record's table row
        callQueuesTable.$queuesTable.find(`tr[id=${response.data.id}]`).remove();
        // Call the callback function for data change
        Extensions.cbOnDataChanged();
    } else {
        // Show an error message if deletion was not successful
        UserMessage.showError(response.messages.error, globalTranslate.cq_ImpossibleToDeleteCallQueue);
    }
    $('a.delete').removeClass('disabled');
}
```

### Real Example from pbx-extension-module-detail.js:

```javascript
initializeSlider(modalForm){
    modalForm.find('.slides .right')
        .on('click', ()=> {
            modalForm.find('.slide')
                .siblings('.active:not(:last-of-type)')
                .removeClass('active')
                .next()
                .addClass('active');
        });
    
    modalForm.find('.slides .left')
        .on('click', ()=> {
            modalForm.find('.slide')
                .siblings('.active:not(:first-of-type)')
                .removeClass('active')
                .prev()
                .addClass('active');
        });
}
```

## 11. ES6+ Features and Modern JavaScript

### Use ES6 modules when possible:

```javascript
// Bad - old style
var Module = Module || {};

// Good - ES6 modules (when build system supports)
import { PbxApi } from './pbx-api';
import Extensions from './extensions';

export default moduleName;
```

### For current jQuery-based modules, follow consistent patterns:

```javascript
// Good - consistent module pattern for jQuery environment
/* global globalRootUrl, globalTranslate, PbxApi */
const moduleName = {
    // Module code
};

// Initialize only after DOM ready
$(document).ready(() => {
    moduleName.initialize();
});
```

## 12. Variables and Constants

### Always use const or let, never var:

```javascript
// Bad
var timeOut = 10000;
var $element = $('#element');

// Good
const timeOut = 10000;
const $element = $('#element');
let counter = 0;
```

### Group declarations by type:

```javascript
const module = {
    // Constants first
    timeOut: 10000,
    maxRetries: 3,
    
    // jQuery objects
    $form: $('#form'),
    $submitButton: $('#submit'),
    
    // Mutable state
    currentIndex: 0,
    isLoading: false,
};
```

### Use descriptive names:

```javascript
// Bad
const d = new Date();
const yrs = calcAge(d);

// Good
const currentDate = new Date();
const ageInYears = calcAge(currentDate);
```

## 13. Functions and Arrow Functions

### Use arrow functions for callbacks and preserve context:

```javascript
// Bad - loses context
$('.button').on('click', function() {
    // 'this' refers to the button, not the module
    module.handleClick(this);
});

// Good - preserves module context
$('.button').on('click', (e) => {
    // Can access module properties directly
    module.handleClick($(e.currentTarget));
});
```

### Use method shorthand in objects:

```javascript
// Bad
const module = {
    initialize: function() {
        // code
    },
    handleClick: function(element) {
        // code
    }
};

// Good
const module = {
    initialize() {
        // code
    },
    handleClick(element) {
        // code
    }
};
```

### Default parameters:

```javascript
// Bad
function createUser(name, role) {
    role = role || 'user';
    // code
}

// Good
function createUser(name, role = 'user') {
    // code
}
```

## 14. Arrays and Iterations

### Use array methods instead of loops:

```javascript
// Bad
const enabledExtensions = [];
for (let i = 0; i < extensions.length; i++) {
    if (extensions[i].enabled) {
        enabledExtensions.push(extensions[i]);
    }
}

// Good
const enabledExtensions = extensions.filter(ext => ext.enabled);
```

### Use spread operator for array operations:

```javascript
// Bad
const items = Array.prototype.slice.call(arguments);

// Good
const items = [...arguments];

// Copying arrays
const membersCopy = [...members];

// Converting NodeList to array
const elements = [...document.querySelectorAll('.element')];
```

### Processing form data:

```javascript
// Good - using map for transformation
const members = $('.member-row').map((index, element) => ({
    id: $(element).attr('id'),
    priority: index,
    extension: $(element).find('.extension').val()
})).get();
```

## 15. Objects and Destructuring

### Use object shorthand:

```javascript
// Bad
const extension = extension;
const priority = priority;
return {
    extension: extension,
    priority: priority
};

// Good
return {
    extension,
    priority
};
```

### Use destructuring for multiple values:

```javascript
// Bad
function processResponse(response) {
    const result = response.result;
    const data = response.data;
    const messages = response.messages;
}

// Good
function processResponse(response) {
    const { result, data, messages } = response;
}

// With default values
function processResponse({ result = false, data = {}, messages = [] } = {}) {
    // code
}
```

### Dynamic property names:

```javascript
// Good
const fieldName = 'extension';
const errors = {
    [fieldName]: 'Invalid extension number',
    [`${fieldName}_duplicate`]: 'Extension already exists'
};
```

## 16. Strings and Template Literals

### Always use template literals for string interpolation:

```javascript
// Bad
const message = 'Extension ' + extension + ' has been ' + action + '.';
const html = '<div class="item">' + value + '</div>';

// Good
const message = `Extension ${extension} has been ${action}.`;
const html = `<div class="item">${value}</div>`;
```

### Multi-line strings:

```javascript
// Bad
const html = '<div class="ui segment">\n' +
    '  <h3 class="header">' + title + '</h3>\n' +
    '  <p>' + content + '</p>\n' +
    '</div>';

// Good
const html = `
    <div class="ui segment">
        <h3 class="header">${title}</h3>
        <p>${content}</p>
    </div>
`;
```

## 17. Comparison and Type Coercion

### Always use strict equality:

```javascript
// Bad
if (result == true) { }
if (value != null) { }

// Good
if (result === true) { }
if (value !== null) { }
```

### Be explicit with type checks:

```javascript
// Bad
if (extensions.length) { }
if (name) { }

// Good
if (extensions.length > 0) { }
if (name !== '') { }
if (typeof callback === 'function') { }
```

### Use shortcuts appropriately:

```javascript
// Good - for booleans
if (isEnabled) { }
if (!isDisabled) { }

// Good - check for undefined/null
const value = input ?? defaultValue; // Nullish coalescing
const name = user.name || 'Anonymous'; // With fallback
```

## 18. Code Style and Formatting

### Consistent spacing and indentation:

```javascript
// Good - 4 spaces for tab (or configure to match project)
const module = {
    initialize() {
        if (condition) {
            // code
        }
    }
};
```

### Proper semicolon usage:

```javascript
// Always use semicolons
const name = 'Module';
import Extensions from './extensions';

// Be careful with return statements
// Bad
return
    result;

// Good
return result;
```

### Line length and wrapping:

```javascript
// Break long lines appropriately
// Bad
PbxApi.SystemSaveSettings(data, callbackSuccess, callbackError, additionalParams);

// Good
PbxApi.SystemSaveSettings(
    data,
    callbackSuccess,
    callbackError,
    additionalParams
);

// Good - logical grouping
const isValid = 
    hasValidExtension 
    && hasValidPassword 
    && (isAdmin || hasPermission);
```

### Comments and documentation:

```javascript
/**
 * Process the queue members and prepare them for saving
 * @param {jQuery} $rows - jQuery collection of member rows
 * @returns {Array<Object>} Array of member objects with id and priority
 */
processQueueMembers($rows) {
    // Filter out empty rows and transform to required format
    return $rows
        .filter((i, el) => $(el).attr('id'))
        .map((index, element) => ({
            id: $(element).attr('id'),
            priority: index
        }))
        .get();
}
```

## Key Style Points Summary

1. **Consistent naming**: camelCase for variables/functions, PascalCase for classes/APIs
2. **jQuery objects**: Always prefix with `$`
3. **JSDoc comments**: Document all public methods and complex logic
4. **Arrow functions**: Use for event handlers and callbacks to preserve context
5. **Method chaining**: Chain jQuery methods for efficiency
6. **Error handling**: Always handle API errors gracefully
7. **Loading states**: Show/hide loading indicators during operations
8. **Storage**: Use session/localStorage appropriately with try/catch
9. **Event delegation**: Use for dynamically added elements
10. **Modular structure**: Each file is a self-contained module with clear initialization
11. **Modern JavaScript**: Use const/let, arrow functions, template literals
12. **Strict equality**: Always use === and !==
13. **Array methods**: Prefer map, filter, reduce over loops
14. **Destructuring**: Use for cleaner code with objects and arrays
15. **Template literals**: Use for all string interpolation

## Additional Patterns

### Modern Error Handling Pattern

```javascript
// Use try-catch with async operations
const module = {
    async loadData() {
        try {
            const response = await $.ajax({
                url: PbxApi.getDataUrl,
                method: 'GET'
            });
            
            if (response.result === true) {
                this.processData(response.data);
            } else {
                throw new Error(response.messages?.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            UserMessage.showError(
                error.message,
                globalTranslate.mod_ErrorLoadingData
            );
        } finally {
            this.$loadingIndicator.removeClass('loading');
        }
    }
};
```

### Event Bus Pattern with Modern JS

```javascript
// Consistent event subscription pattern
const module = {
    subscriptions: [],
    
    initialize() {
        // Store subscriptions for cleanup
        this.subscriptions = [
            EventBus.subscribe('models-changed', data => this.handleModelChange(data)),
            EventBus.subscribe('status-update', data => this.handleStatusUpdate(data))
        ];
    },
    
    handleModelChange({ model, recordId, data }) {
        // Use destructuring for event data
        if (model === 'Extensions' && recordId === this.extensionId) {
            this.updateExtensionData(data);
        }
    },
    
    destroy() {
        // Clean up subscriptions
        this.subscriptions.forEach(unsubscribe => unsubscribe());
    }
};
```

### Drag and Drop Implementation

```javascript
initializeDragAndDropExtensionTableRows() {
    callQueue.$extensionsTable.tableDnD({
        onDragClass: 'hoveringRow',  // CSS class to be applied while a row is being dragged
        dragHandle: '.dragHandle',  // Class of the handler to initiate the drag action
        onDrop: () => { // Callback to be executed after a row has been dropped
            // Trigger change event to acknowledge the modification
            Form.dataChanged();
        },
    });
}
```

### Dynamic UI Updates

```javascript
updateExtensionTableView() {
    // Placeholder to be displayed
    const dummy = `<tr class="dummy"><td colspan="4" class="center aligned">${globalTranslate.cq_AddQueueMembers}</td></tr>`;
    
    if ($(callQueue.memberRow).length === 0) {
        $('#extensionsTable tbody').append(dummy); // Add the placeholder if there are no rows
    } else {
        $('#extensionsTable tbody .dummy').remove(); // Remove the placeholder if rows are present
    }
}
```

### Complex Data Processing

```javascript
prepareChangeLogView(repoData) {
    let html = '';
    $.each(repoData.releases, function (index, release) {
        let releaseDate = release.created;
        releaseDate = releaseDate.split(" ")[0];
        const sizeText = extensionModuleDetail.convertBytesToReadableFormat(release.size);
        let changeLogText = UserMessage.convertToText(release.changelog);
        if (changeLogText === 'null') {
            changeLogText = '';
        }
        html += '<div class="ui clearing segment">';
        html += `<div class="ui top attached label">${globalTranslate.ext_InstallModuleReleaseTag}: ${release.version} ${globalTranslate.ext_FromDate} ${releaseDate}</div>`;
        html += `<div class="ui top right attached label"><i class="icon grey download"></i> <span class="ui mini gray text">${release.downloads}</span></div>`;
        html += `<div class='ui basic segment'><p>${changeLogText}</p>`;
        // ... continue building HTML
    });
    return html;
}
```

### Promise-based API Pattern

```javascript
// Modern promise-based API wrapper
const ApiWrapper = {
    /**
     * Generic API call with promise support
     * @param {string} url - API endpoint
     * @param {Object} data - Request data
     * @returns {Promise<Object>} Response data
     */
    call(url, data = {}) {
        return new Promise((resolve, reject) => {
            $.api({
                url,
                data,
                on: 'now',
                successTest: PbxApi.successTest,
                onSuccess(response) {
                    if (response.result === true) {
                        resolve(response);
                    } else {
                        reject(new Error(response.messages?.error || 'API call failed'));
                    }
                },
                onError(errorMessage, element, xhr) {
                    reject(new Error(errorMessage || 'Network error'));
                }
            });
        });
    },
    
    // Usage example
    async updateExtension(extensionData) {
        try {
            const response = await ApiWrapper.call(
                `${globalRootUrl}extensions/save`,
                extensionData
            );
            return response.data;
        } catch (error) {
            console.error('Failed to update extension:', error);
            throw error;
        }
    }
};
```

### State Management Pattern

```javascript
// Simple state management for complex modules
const StateManager = {
    state: {
        extensions: [],
        selectedExtension: null,
        isLoading: false,
        filters: {
            type: 'all',
            search: ''
        }
    },
    
    subscribers: [],
    
    setState(updates) {
        // Merge updates with current state
        this.state = { ...this.state, ...updates };
        this.notifySubscribers();
    },
    
    subscribe(callback) {
        this.subscribers.push(callback);
        // Return unsubscribe function
        return () => {
            const index = this.subscribers.indexOf(callback);
            if (index > -1) {
                this.subscribers.splice(index, 1);
            }
        };
    },
    
    notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.state));
    }
};
```

### Debouncing and Throttling

```javascript
// Utility functions for performance optimization
const Utils = {
    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Throttle function calls
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Usage example
const searchModule = {
    $searchInput: $('#search-input'),
    
    initialize() {
        // Debounce search to avoid too many API calls
        const debouncedSearch = Utils.debounce(
            this.performSearch.bind(this),
            300
        );
        
        this.$searchInput.on('input', debouncedSearch);
    },
    
    performSearch(event) {
        const query = $(event.target).val();
        if (query.length > 2) {
            PbxApi.ExtensionsSearch(query, this.cbSearchResults);
        }
    }
};
```

### Validation Helpers

```javascript
// Enhanced validation utilities
const Validation = {
    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} Is valid
     */
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    /**
     * Validate phone number
     * @param {string} phone - Phone number to validate
     * @returns {boolean} Is valid
     */
    isValidPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10;
    },
    
    /**
     * Custom validation rule for Semantic UI
     * @returns {Object} Validation rule object
     */
    getCustomRules() {
        return {
            strongPassword: {
                identifier: 'password',
                rules: [{
                    type: 'regExp',
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                    prompt: 'Password must be at least 8 characters with uppercase, lowercase, number and special character'
                }]
            }
        };
    }
};
```

## 19. Fomantic-UI Components

### Initialize Components Pattern

```javascript
// Good - Initialize all UI components in one place
const UIComponents = {
    initialize() {
        // Initialize dropdowns with different configurations
        $('.ui.dropdown').dropdown();
        $('.ui.selection.dropdown').dropdown();
        $('.ui.menu .ui.dropdown').dropdown({
            on: 'hover'
        });
        
        // Initialize other components
        $('.ui.accordion').accordion();
        $('.ui.checkbox').checkbox();
        $('.ui.rating').rating();
        $('.ui.tab').tab();
        
        // Initialize modals
        $('.ui.modal').modal();
        
        // Initialize popups
        $('.ui.popup').popup();
    }
};
```

### Dropdown Best Practices

```javascript
// Configure dropdowns with custom behaviors
const DropdownHelpers = {
    /**
     * Initialize dropdown with clear on special value
     */
    initializeClearableDropdown($element, clearValue = -1) {
        $element.dropdown({
            onChange(value) {
                if (parseInt(value, 10) === clearValue) {
                    $element.dropdown('clear');
                }
            }
        });
    },
    
    /**
     * Initialize combo dropdown (allows text input)
     */
    initializeComboDropdown($element) {
        $element.dropdown({
            action: 'combo',
            allowAdditions: true,
            hideAdditions: false
        });
    },
    
    /**
     * Initialize searchable dropdown with API
     */
    initializeApiDropdown($element, apiUrl) {
        $element.dropdown({
            apiSettings: {
                url: apiUrl,
                cache: false
            },
            saveRemoteData: false
        });
    }
};

// Real-world example from project
$('#extension-select').dropdown(Extensions.getDropdownSettingsWithEmpty());
$('#sound-select').dropdown(SoundFilesSelector.getDropdownSettingsWithEmpty());
```

### Modal Management

```javascript
const ModalManager = {
    /**
     * Show modal with custom configuration
     */
    showModal(modalId, options = {}) {
        const defaultOptions = {
            closable: false,
            onDeny() {
                // Handle cancel
                return true;
            },
            onApprove() {
                // Handle save
                return false; // Keep modal open for validation
            }
        };
        
        $(`#${modalId}`).modal({
            ...defaultOptions,
            ...options
        }).modal('show');
    },
    
    /**
     * Show confirmation dialog
     */
    confirm(message, onConfirm, onCancel) {
        $('#confirm-modal .content').html(message);
        $('#confirm-modal').modal({
            onApprove: onConfirm,
            onDeny: onCancel
        }).modal('show');
    }
};
```

### Accordion and Tab Management

```javascript
// Initialize accordions with callbacks
$('.ui.accordion').accordion({
    exclusive: false,
    onOpening() {
        // Load content if needed
        const $content = $(this);
        if ($content.hasClass('lazy')) {
            loadAccordionContent($content);
        }
    }
});

// Tab initialization with history support
$('.ui.tab').tab({
    history: true,
    historyType: 'hash',
    onLoad(tabPath) {
        // Update breadcrumb or other UI elements
        updateBreadcrumb(tabPath);
    }
});
```

### Visibility and Sticky Components

```javascript
// Sticky menu implementation
$('.main.menu').visibility({
    type: 'fixed',
    offset: 80
});

// Lazy loading images
$('.lazy.image').visibility({
    type: 'image',
    transition: 'fade in',
    duration: 1000,
    onLoad(image) {
        console.log('Image loaded:', image);
    }
});

// Sticky sidebar
$('.ui.sticky').sticky({
    context: '.main.container',
    offset: 50,
    observeChanges: true
});
```

## 20. Fomantic-UI Forms and Validation

### Form Validation Setup

```javascript
const FormValidator = {
    /**
     * Initialize form with validation rules
     */
    initializeValidation($form, customRules = {}) {
        const defaultRules = {
            email: {
                identifier: 'email',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.validation_email_empty
                    },
                    {
                        type: 'email',
                        prompt: globalTranslate.validation_email_invalid
                    }
                ]
            },
            password: {
                identifier: 'password',
                rules: [
                    {
                        type: 'empty',
                        prompt: globalTranslate.validation_password_empty
                    },
                    {
                        type: 'minLength[6]',
                        prompt: globalTranslate.validation_password_short
                    }
                ]
            }
        };
        
        $form.form({
            fields: { ...defaultRules, ...customRules },
            inline: true,
            on: 'blur',
            onSuccess(event, fields) {
                // Process form submission
                event.preventDefault();
                FormValidator.handleSubmit($form, fields);
            }
        });
    },
    
    /**
     * Custom validation rules
     */
    addCustomRules() {
        // Add phone number validation
        $.fn.form.settings.rules.phone = (value) => {
            const phoneRegex = /^[\d\s\-\+\(\)]+$/;
            return phoneRegex.test(value) && value.replace(/\D/g, '').length >= 10;
        };
        
        // Add IP address validation
        $.fn.form.settings.rules.ipAddress = (value) => {
            const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
            if (!ipRegex.test(value)) return false;
            
            const parts = value.split('.');
            return parts.every(part => parseInt(part) <= 255);
        };
    }
};

// Real-world validation example
validateRules: {
    name: {
        identifier: 'name',
        rules: [
            {
                type: 'empty',
                prompt: globalTranslate.cq_ValidateNameEmpty,
            },
        ],
    },
    extension: {
        identifier: 'extension',
        rules: [
            {
                type: 'number',
                prompt: globalTranslate.cq_ValidateExtensionNumber,
            },
            {
                type: 'empty',
                prompt: globalTranslate.cq_ValidateExtensionEmpty,
            },
            {
                type: 'existRule[extension-error]',
                prompt: globalTranslate.cq_ValidateExtensionDouble,
            },
        ],
    },
}
```

### Dynamic Form Fields

```javascript
const DynamicForm = {
    /**
     * Add dynamic form field
     */
    addField(container, fieldHtml) {
        const $field = $(fieldHtml);
        $(container).append($field);
        
        // Re-initialize UI components in new field
        $field.find('.ui.dropdown').dropdown();
        $field.find('.ui.checkbox').checkbox();
        
        // Re-validate form
        $(container).closest('form').form('validate form');
    },
    
    /**
     * Remove field with animation
     */
    removeField($field) {
        $field.transition('fade down', {
            duration: 300,
            onComplete() {
                $field.remove();
                // Update form validation
                Form.dataChanged();
            }
        });
    }
};
```

### Form State Management

```javascript
const FormState = {
    /**
     * Save form state to session storage
     */
    saveState($form) {
        const formData = $form.form('get values');
        sessionStorage.setItem(
            `form_${$form.attr('id')}`,
            JSON.stringify(formData)
        );
    },
    
    /**
     * Restore form state
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
    },
    
    /**
     * Clear saved state
     */
    clearState($form) {
        sessionStorage.removeItem(`form_${$form.attr('id')}`);
    }
};
```

## 21. Fomantic-UI Tables and Data Display

### Enhanced DataTable Integration

```javascript
const TableManager = {
    /**
     * Initialize Fomantic UI table with DataTables
     */
    initializeDataTable($table, customOptions = {}) {
        const defaultOptions = {
            lengthChange: false,
            paging: false,
            ordering: true,
            info: false,
            searching: true,
            language: SemanticLocalization.dataTableLocalisation,
            dom: '<"ui grid"<"eight wide column"l><"right aligned eight wide column"f>><"ui segment"t>',
            drawCallback() {
                // Re-initialize Fomantic UI components after draw
                TableManager.initializeTableComponents($table);
            }
        };
        
        return $table.DataTable({
            ...defaultOptions,
            ...customOptions
        });
    },
    
    /**
     * Initialize components within table
     */
    initializeTableComponents($table) {
        $table.find('.ui.dropdown').dropdown();
        $table.find('.ui.checkbox').checkbox();
        $table.find('[data-tooltip]').popup();
    }
};
```

### Table Actions and Row Management

```javascript
const TableActions = {
    /**
     * Add action buttons to table rows
     */
    addRowActions($table) {
        $table.on('click', '.edit.button', function(e) {
            e.preventDefault();
            const $row = $(this).closest('tr');
            const id = $row.attr('id');
            TableActions.editRow(id);
        });
        
        $table.on('click', '.delete.button', function(e) {
            e.preventDefault();
            const $button = $(this);
            $button.addClass('loading disabled');
            
            const $row = $button.closest('tr');
            const id = $row.attr('id');
            
            TableActions.confirmDelete(id, () => {
                TableActions.deleteRow($row);
                $button.removeClass('loading disabled');
            });
        });
    },
    
    /**
     * Delete row with animation
     */
    deleteRow($row) {
        $row.transition('fade out', {
            duration: 500,
            onComplete() {
                $row.remove();
                // Update table if empty
                TableActions.checkEmptyTable();
            }
        });
    },
    
    /**
     * Check and show empty state
     */
    checkEmptyTable() {
        const $tbody = $('table tbody');
        if ($tbody.find('tr:not(.empty)').length === 0) {
            $tbody.html(`
                <tr class="empty">
                    <td colspan="100%" class="center aligned">
                        <div class="ui placeholder segment">
                            <div class="ui icon header">
                                <i class="search icon"></i>
                                ${globalTranslate.table_no_records_found}
                            </div>
                        </div>
                    </td>
                </tr>
            `);
        }
    }
};
```

### Sortable Tables

```javascript
// Initialize sortable table with drag and drop
const SortableTable = {
    initialize($table) {
        $table.tableDnD({
            onDragClass: 'dragging',
            dragHandle: '.drag.handle',
            onDrop(table, row) {
                // Update order in backend
                const order = $(table).find('tbody tr').map((index, tr) => ({
                    id: $(tr).attr('id'),
                    priority: index
                })).get();
                
                SortableTable.saveOrder(order);
            }
        });
        
        // Add visual feedback
        $table.find('.drag.handle').hover(
            function() { $(this).closest('tr').addClass('warning'); },
            function() { $(this).closest('tr').removeClass('warning'); }
        );
    }
};
```

## 22. Fomantic-UI Layout and Responsive Design

### Responsive Menu Pattern

```javascript
const ResponsiveMenu = {
    initialize() {
        // Create sidebar for mobile
        $('.ui.sidebar').sidebar({
            context: '.bottom.segment',
            dimPage: true,
            transition: 'overlay'
        });
        
        // Attach sidebar to menu button
        $('.toc.item').on('click', function() {
            $('.ui.sidebar').sidebar('toggle');
        });
        
        // Handle visibility based on scroll
        $('.masthead').visibility({
            once: false,
            onBottomPassed() {
                $('.fixed.menu').transition('fade in');
            },
            onBottomPassedReverse() {
                $('.fixed.menu').transition('fade out');
            }
        });
    }
};
```

### Grid and Layout Helpers

```javascript
const LayoutHelpers = {
    /**
     * Make columns equal height
     */
    equalizeHeights(selector) {
        const $elements = $(selector);
        let maxHeight = 0;
        
        // Reset heights
        $elements.css('height', 'auto');
        
        // Find max height
        $elements.each(function() {
            const height = $(this).outerHeight();
            if (height > maxHeight) {
                maxHeight = height;
            }
        });
        
        // Apply max height
        $elements.css('height', maxHeight);
    },
    
    /**
     * Handle responsive tables
     */
    makeTablesResponsive() {
        $('table.ui.table').each(function() {
            if (!$(this).parent().hasClass('ui.container')) {
                $(this).wrap('<div class="ui container"></div>');
            }
            
            $(this).addClass('unstackable');
        });
    }
};
```

### Container and Spacing Utilities

```javascript
// Consistent spacing patterns
const Spacing = {
    applyStandardSpacing() {
        // Main containers
        $('.main.container').css({
            'margin-top': '7em',
            'margin-bottom': '7em'
        });
        
        // Sections
        $('.ui.vertical.stripe').css({
            'padding': '8em 0em'
        });
        
        // Headers
        $('h1.ui.header').css('margin-top', '3em');
        $('h2.ui.header').css('margin', '4em 0em 2em');
        $('h3.ui.header').css('margin-top', '2em');
    }
};
```

### Loading States

```javascript
const LoadingStates = {
    /**
     * Show loading overlay
     */
    showLoading(element) {
        const $element = $(element);
        $element.addClass('loading');
        
        // Add dimmer if not exists
        if (!$element.find('.ui.dimmer').length) {
            $element.append(`
                <div class="ui active inverted dimmer">
                    <div class="ui text loader">${globalTranslate.loading}</div>
                </div>
            `);
        }
    },
    
    /**
     * Hide loading overlay
     */
    hideLoading(element) {
        const $element = $(element);
        $element.removeClass('loading');
        $element.find('.ui.dimmer').remove();
    },
    
    /**
     * Progress indicator
     */
    showProgress(element, percent, label) {
        const $progress = $(element).find('.ui.progress');
        $progress.progress({
            percent: percent,
            label: 'ratio',
            text: {
                ratio: label || '{value} of {total}'
            }
        });
    }
};
```

### Transitions and Animations

```javascript
const Animations = {
    /**
     * Animate element appearance
     */
    animateIn(elements, animation = 'fade up') {
        $(elements).transition({
            animation: animation,
            interval: 100,
            reverse: false
        });
    },
    
    /**
     * Smooth scroll to element
     */
    scrollTo(target, offset = 0) {
        $('html, body').animate({
            scrollTop: $(target).offset().top - offset
        }, 500);
    },
    
    /**
     * Flash message animation
     */
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

### Best Practices Summary for Fomantic-UI

1. **Initialize components after DOM ready**
   ```javascript
   $(document).ready(() => {
       UIComponents.initialize();
   });
   ```

2. **Use semantic class names**
   ```javascript
   // Good
   $('.ui.form').form();
   $('.ui.dropdown').dropdown();
   
   // Bad
   $('form').form(); // Too generic
   ```

3. **Handle component state properly**
   ```javascript
   // Save state before destroying
   const dropdownValue = $('#my-dropdown').dropdown('get value');
   $('#my-dropdown').dropdown('destroy');
   // ... recreate and restore
   $('#my-dropdown').dropdown('set selected', dropdownValue);
   ```

4. **Use Fomantic callbacks effectively**
   ```javascript
   $('.ui.modal').modal({
       onShow() {
           // Initialize content
       },
       onVisible() {
           // Focus first input
           $(this).find('input:first').focus();
       },
       onHidden() {
           // Clean up
           $(this).find('form').form('clear');
       }
   });
   ```

5. **Optimize performance**
   ```javascript
   // Cache jQuery objects
   const $dropdown = $('#heavy-dropdown');
   
   // Use appropriate initialization
   $dropdown.dropdown({
       apiSettings: {
           cache: true,
           throttle: 300
       }
   });
   ```