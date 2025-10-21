# MikoPBX JavaScript Patterns Reference

Real-world patterns and examples from the MikoPBX codebase.

## Table of Contents

- [Data Table Pattern](#data-table-pattern)
- [Worker and Status Checking](#worker-and-status-checking)
- [Translation and i18n](#translation-and-i18n)
- [Dynamic UI Updates](#dynamic-ui-updates)
- [Drag and Drop](#drag-and-drop)
- [Complex Data Processing](#complex-data-processing)
- [Event Bus Integration](#event-bus-integration)
- [Promise-based API](#promise-based-api)
- [State Management](#state-management)

## Data Table Pattern

Initialize DataTables with Fomantic-UI integration:

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

### Real Example from callqueues-index.js

```javascript
initializeDataTable() {
    callQueuesTable.$queuesTable.DataTable({
        lengthChange: false,
        paging: false,
        columns: [
            null,
            null,
            null,
            null,
            {
                orderable: false,
                searchable: false
            },
        ],
        order: [1, 'asc'],
        language: SemanticLocalization.dataTableLocalisation,
    });

    $('#add-new-button').appendTo($('div.eight.column:eq(0)'));
}
```

### Delete Record from Table

```javascript
// Set up delete functionality on delete button click
$('body').on('click', 'a.delete', (e) => {
    e.preventDefault();
    $(e.target).addClass('disabled');

    // Get the record ID from the closest table row
    const recordId = $(e.target).closest('tr').attr('id');

    // Remove any previous AJAX messages
    $('.message.ajax').remove();

    // Call the API method to delete the record
    RecordAPI.deleteRecord(recordId, table.cbAfterDeleteRecord);
});

cbAfterDeleteRecord(response) {
    if (response.result === true) {
        // Remove the deleted record's table row
        table.$table.find(`tr[id=${response.data.id}]`).remove();
        // Call the callback function for data change
        Extensions.cbOnDataChanged();
    } else {
        // Show an error message
        UserMessage.showError(
            response.messages.error,
            globalTranslate.mod_ImpossibleToDeleteRecord
        );
    }
    $('a.delete').removeClass('disabled');
}
```

## Worker and Status Checking

Pattern for periodic background workers:

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

### Real Example from advice-worker.js

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

    cbAfterResponse(response) {
        if (response.result === false) {
            return;
        }

        adviceWorker.$advice.html('');

        if (response.data.advice !== undefined) {
            const adviceData = response.data.advice;

            // Store raw advice data
            sessionStorage.setItem(
                adviceWorker.storageKeyRawAdvice,
                JSON.stringify(adviceData)
            );

            // Generate HTML and update UI
            const adviceResult = adviceWorker.generateAdviceHtml(adviceData);

            adviceWorker.$advice.html(adviceResult.html);

            // Set timeout for next update
            adviceWorker.timeoutHandle = window.setTimeout(
                adviceWorker.worker,
                adviceWorker.timeOut,
            );
        }
    }
};
```

## Translation and i18n

### Simple Translations

```javascript
const message = globalTranslate.mod_MessageText;
UserMessage.showInformation(message);

const errorTitle = globalTranslate.mod_ErrorTitle;
UserMessage.showMultiString(response.messages, errorTitle);
```

### Parametrized Translations

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
    }
};
```

### Real Example from advice-worker.js

```javascript
generateAdviceHtml(adviceData) {
    let htmlMessages = '';
    let countMessages = 0;

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

    if (adviceData.warning !== undefined && adviceData.warning.length > 0) {
        $.each(adviceData.warning, (key, value) => {
            htmlMessages += '<div class="item">';
            htmlMessages += '<i class="exclamation triangle orange icon"></i>';
            htmlMessages += adviceWorker.translateMessage(value);
            htmlMessages += '</div>';
            countMessages += 1;
        });
    }

    htmlMessages += '</div>';

    return {
        html: htmlMessages,
        count: countMessages
    };
}
```

## Dynamic UI Updates

Pattern for updating UI based on data state:

```javascript
updateExtensionTableView() {
    // Placeholder to be displayed
    const dummy = `
        <tr class="dummy">
            <td colspan="4" class="center aligned">
                ${globalTranslate.cq_AddQueueMembers}
            </td>
        </tr>
    `;

    if ($(callQueue.memberRow).length === 0) {
        // Add placeholder if no rows
        $('#extensionsTable tbody').append(dummy);
    } else {
        // Remove placeholder if rows present
        $('#extensionsTable tbody .dummy').remove();
    }
}
```

### Conditional UI State

```javascript
const uiState = {
    showEmptyState() {
        $('.content-area').hide();
        $('.empty-state').show();
    },

    showContent() {
        $('.empty-state').hide();
        $('.content-area').show();
    },

    updateCount(count) {
        $('.item-count').text(count);

        if (count === 0) {
            uiState.showEmptyState();
        } else {
            uiState.showContent();
        }
    }
};
```

## Drag and Drop

Implement sortable rows with tableDnD:

```javascript
initializeDragAndDropExtensionTableRows() {
    callQueue.$extensionsTable.tableDnD({
        onDragClass: 'hoveringRow',
        dragHandle: '.dragHandle',
        onDrop: () => {
            // Trigger change event
            Form.dataChanged();
        },
    });
}
```

### Advanced Drag and Drop

```javascript
const sortableTable = {
    $table: $('#sortable-table'),

    initialize() {
        sortableTable.$table.tableDnD({
            onDragClass: 'dragging',
            dragHandle: '.drag-handle',
            onDrop(table, row) {
                // Get new order
                const order = $(table).find('tbody tr').map((index, tr) => ({
                    id: $(tr).attr('id'),
                    priority: index
                })).get();

                // Save to backend
                sortableTable.saveOrder(order);
            }
        });

        // Add hover effect
        sortableTable.$table.find('.drag-handle').hover(
            function() {
                $(this).closest('tr').addClass('warning');
            },
            function() {
                $(this).closest('tr').removeClass('warning');
            }
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

## Complex Data Processing

Pattern for processing and transforming data:

```javascript
prepareChangeLogView(repoData) {
    let html = '';

    $.each(repoData.releases, (index, release) => {
        let releaseDate = release.created.split(' ')[0];
        const sizeText = extensionModuleDetail.convertBytesToReadableFormat(release.size);
        let changeLogText = UserMessage.convertToText(release.changelog);

        if (changeLogText === 'null') {
            changeLogText = '';
        }

        html += '<div class="ui clearing segment">';
        html += `
            <div class="ui top attached label">
                ${globalTranslate.ext_InstallModuleReleaseTag}: ${release.version}
                ${globalTranslate.ext_FromDate} ${releaseDate}
            </div>
        `;
        html += `
            <div class="ui top right attached label">
                <i class="icon grey download"></i>
                <span class="ui mini gray text">${release.downloads}</span>
            </div>
        `;
        html += `<div class='ui basic segment'><p>${changeLogText}</p></div>`;
        html += '</div>';
    });

    return html;
}
```

### Array Transformations

```javascript
const dataProcessor = {
    /**
     * Process form rows into data structure
     * @param {string} rowSelector - Selector for rows
     * @returns {Array<Object>} Processed data
     */
    processRows(rowSelector) {
        return $(rowSelector)
            .filter((i, el) => $(el).attr('id'))
            .map((index, element) => {
                const $row = $(element);
                return {
                    id: $row.attr('id'),
                    priority: index,
                    extension: $row.find('.extension').val(),
                    enabled: $row.find('.enabled').checkbox('is checked')
                };
            })
            .get();
    }
};
```

## Event Bus Integration

Subscribe to system-wide events:

```javascript
const eventHandler = {
    subscriptions: [],

    initialize() {
        // Store subscriptions for cleanup
        eventHandler.subscriptions = [
            EventBus.subscribe('models-changed', data => {
                eventHandler.handleModelChange(data);
            }),
            EventBus.subscribe('status-update', data => {
                eventHandler.handleStatusUpdate(data);
            })
        ];
    },

    handleModelChange({ model, recordId, data }) {
        if (model === 'Extensions' && recordId === eventHandler.extensionId) {
            eventHandler.updateExtensionData(data);
        }
    },

    destroy() {
        // Clean up subscriptions
        eventHandler.subscriptions.forEach(unsubscribe => unsubscribe());
    }
};
```

## Promise-based API

Modern promise-based API wrapper:

```javascript
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
                onError(errorMessage) {
                    reject(new Error(errorMessage || 'Network error'));
                }
            });
        });
    },

    /**
     * Usage example with async/await
     */
    async updateExtension(extensionData) {
        try {
            const response = await ApiWrapper.call(
                `${globalRootUrl}extensions/save`,
                extensionData
            );
            return response.data;
        } catch (error) {
            console.error('Failed to update extension:', error);
            UserMessage.showError(error.message);
            throw error;
        }
    }
};
```

## State Management

Simple state management for complex modules:

```javascript
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

// Usage
const unsubscribe = StateManager.subscribe((state) => {
    console.log('State updated:', state);
    updateUI(state);
});

// Update state
StateManager.setState({ isLoading: true });
StateManager.setState({ extensions: newExtensions, isLoading: false });
```

## Debouncing and Throttling

Performance optimization utilities:

```javascript
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
            searchModule.performSearch.bind(searchModule),
            300
        );

        searchModule.$searchInput.on('input', debouncedSearch);
    },

    performSearch(event) {
        const query = $(event.target).val();
        if (query.length > 2) {
            PbxApi.ExtensionsSearch(query, searchModule.cbSearchResults);
        }
    }
};
```

## Slider Implementation

Real example from pbx-extension-module-detail.js:

```javascript
initializeSlider(modalForm) {
    modalForm.find('.slides .right')
        .on('click', () => {
            modalForm.find('.slide')
                .siblings('.active:not(:last-of-type)')
                .removeClass('active')
                .next()
                .addClass('active');
        });

    modalForm.find('.slides .left')
        .on('click', () => {
            modalForm.find('.slide')
                .siblings('.active:not(:first-of-type)')
                .removeClass('active')
                .prev()
                .addClass('active');
        });
}
```

## Best Practices Summary

1. **Always cache jQuery selectors** - Store in module object with $ prefix
2. **Use arrow functions for callbacks** - Preserves context automatically
3. **Handle errors gracefully** - Show user-friendly messages
4. **Clean up resources** - Remove event listeners, clear timeouts
5. **Use template literals** - More readable than string concatenation
6. **Leverage array methods** - map, filter, reduce instead of loops
7. **Store data properly** - Use sessionStorage with try/catch for JSON
8. **Initialize UI components** - After dynamic content updates
9. **Event delegation** - For dynamically added elements
10. **Consistent naming** - camelCase for variables, PascalCase for APIs
