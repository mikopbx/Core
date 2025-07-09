# JavaScript Style Guide for MikoPBX AdminCabinet

This guide demonstrates the JavaScript coding standards and patterns used in MikoPBX AdminCabinet based on exemplary code from the project.

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

## Additional Patterns

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