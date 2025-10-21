---
name: mikopbx-js-style
description: Validate and guide JavaScript code formatting according to ES6+ and MikoPBX project standards. Use when writing or reviewing JavaScript code, checking code style compliance, or when the user mentions JS style, code formatting, or best practices.
---

# MikoPBX JavaScript Style Guide

Ensures JavaScript code follows ES6+ standards and MikoPBX project conventions for consistency and maintainability.

## Core Principles

1. **ES6+ Modern JavaScript**: Use const/let, arrow functions, template literals, destructuring
2. **Module Pattern**: Consistent object-oriented module structure with clear initialization
3. **jQuery Integration**: Proper jQuery usage with $ prefix for cached objects
4. **Fomantic-UI Components**: Correct initialization and lifecycle management
5. **API Communication**: Standardized callback patterns and error handling
6. **Progressive Enhancement**: Graceful degradation and error handling

## Quick Start Checklist

Copy this checklist when reviewing or writing JavaScript code:

- [ ] Module structure follows standard pattern (object literal with initialize method)
- [ ] Variables use const/let (never var)
- [ ] jQuery objects prefixed with $ (e.g., $form, $button)
- [ ] Arrow functions used for callbacks and event handlers
- [ ] Template literals used for string interpolation
- [ ] Strict equality (=== and !==) used everywhere
- [ ] JSDoc comments for all methods
- [ ] Global variables declared with /* global */ comment
- [ ] Proper error handling with try/catch where appropriate
- [ ] Fomantic-UI components initialized correctly
- [ ] Event delegation used for dynamic elements
- [ ] Loading states shown during async operations
- [ ] Translations use globalTranslate or i18n()

## Standard Module Structure

Every JavaScript module follows this pattern:

```javascript
/* global globalRootUrl, globalTranslate, PbxApi */

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
     * Configuration values
     * @type {number}
     */
    timeOut: 10000,

    /**
     * Initialize the module
     */
    initialize() {
        moduleName.initializeEventHandlers();
        moduleName.initializeUIComponents();
        moduleName.loadInitialData();
    },

    /**
     * Initialize event handlers
     */
    initializeEventHandlers() {
        // Use arrow functions to preserve context
        moduleName.$mainElement.on('click', '.button', (e) => {
            e.preventDefault();
            moduleName.handleClick($(e.currentTarget));
        });
    },

    /**
     * Initialize UI components
     */
    initializeUIComponents() {
        $('.ui.dropdown').dropdown();
        $('.ui.checkbox').checkbox();
    },

    /**
     * Load initial data
     */
    loadInitialData() {
        PbxApi.ModuleGetData(moduleName.cbAfterDataReceived);
    },

    /**
     * Callback after data received
     * @param {boolean} result - Success status
     * @param {Object} response - API response
     */
    cbAfterDataReceived(result, response) {
        if (result === false) {
            return;
        }
        moduleName.updateUI(response.data);
    },

    /**
     * Update UI with data
     * @param {Object} data - Data to display
     */
    updateUI(data) {
        // Implementation
    }
};

// Initialize on document ready
$(document).ready(() => {
    moduleName.initialize();
});
```

## ES6+ Essential Patterns

### Variables and Constants

```javascript
// ✅ CORRECT
const timeOut = 10000;
const $element = $('#element');
let counter = 0;

// ❌ WRONG
var timeOut = 10000;
var element = $('#element');
```

### Arrow Functions

```javascript
// ✅ CORRECT - Preserves context
$('.button').on('click', (e) => {
    module.handleClick($(e.currentTarget));
});

// ❌ WRONG - Loses context
$('.button').on('click', function() {
    module.handleClick($(this));
});
```

### Template Literals

```javascript
// ✅ CORRECT
const message = `Extension ${extension} has been ${action}.`;
const html = `
    <div class="ui segment">
        <h3>${title}</h3>
        <p>${content}</p>
    </div>
`;

// ❌ WRONG
const message = 'Extension ' + extension + ' has been ' + action + '.';
const html = '<div class="ui segment">\n' +
    '  <h3>' + title + '</h3>\n' +
    '</div>';
```

### Destructuring

```javascript
// ✅ CORRECT
const { result, data, messages } = response;
const [first, second, ...rest] = items;

// ❌ WRONG
const result = response.result;
const data = response.data;
```

### Spread Operator

```javascript
// ✅ CORRECT
const membersCopy = [...members];
const merged = { ...defaults, ...options };

// ❌ WRONG
const membersCopy = members.slice();
const merged = Object.assign({}, defaults, options);
```

## jQuery Best Practices

### Cache jQuery Objects

```javascript
// ✅ CORRECT
const module = {
    $form: $('#my-form'),
    $submitButton: $('#submit-button'),

    initialize() {
        this.$form.on('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
    }
};

// ❌ WRONG
$('#my-form').on('submit', (e) => {
    $('#submit-button').addClass('loading');
    // ... later
    $('#submit-button').removeClass('loading');
});
```

### Event Delegation

```javascript
// ✅ CORRECT - Handles dynamic elements
$('body').on('click', '.delete-button', (e) => {
    const $row = $(e.currentTarget).closest('tr');
    module.deleteRow($row);
});

// ❌ WRONG - Won't work for dynamically added elements
$('.delete-button').on('click', function() {
    // ...
});
```

### Method Chaining

```javascript
// ✅ CORRECT
$element
    .addClass('active')
    .removeClass('disabled')
    .show()
    .focus();

// ❌ WRONG
$element.addClass('active');
$element.removeClass('disabled');
$element.show();
$element.focus();
```

## API Communication Pattern

```javascript
const apiHandler = {
    /**
     * Save data with proper error handling
     * @param {Object} data - Data to save
     * @param {Function} callback - Success callback
     */
    saveData(data, callback) {
        // Show loading state
        apiHandler.$saveButton.addClass('loading disabled');

        $.api({
            url: PbxApi.moduleSaveUrl,
            method: 'POST',
            data: data,
            successTest: PbxApi.successTest,
            onSuccess(response) {
                if (response.result === true) {
                    callback(response);
                } else {
                    apiHandler.handleError(response);
                }
            },
            onFailure(response) {
                apiHandler.handleError(response);
            },
            onComplete() {
                // Always remove loading state
                apiHandler.$saveButton.removeClass('loading disabled');
            }
        });
    },

    /**
     * Handle API errors
     * @param {Object} response - Error response
     */
    handleError(response) {
        const errorMessage = response.messages?.error || globalTranslate.mod_UnknownError;
        UserMessage.showError(errorMessage, globalTranslate.mod_ErrorTitle);
    }
};
```

## Form Handling Pattern

```javascript
const formHandler = {
    $formObj: $('#module-form'),

    initialize() {
        // Configure form
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
        const result = settings;
        result.data = formHandler.$formObj.form('get values');

        // Add complex data structures
        const members = $('.member-row').map((index, element) => ({
            id: $(element).attr('id'),
            priority: index,
        })).get();

        result.data.members = JSON.stringify(members);
        return result;
    },

    cbAfterSendForm(response) {
        if (response.success === true) {
            UserMessage.showInformation(globalTranslate.mod_SuccessfullySaved);
        }
    }
};
```

## Fomantic-UI Component Initialization

```javascript
const uiComponents = {
    initialize() {
        // Basic components
        $('.ui.accordion').accordion();
        $('.ui.dropdown').dropdown();
        $('.ui.checkbox').checkbox();
        $('.ui.tab').tab();

        // Custom dropdown with onChange
        $('#special-dropdown').dropdown({
            onChange(value) {
                if (parseInt(value, 10) === -1) {
                    $('#special-dropdown').dropdown('clear');
                }
            },
        });

        // Dropdowns with helper methods
        $('#extension-select').dropdown(Extensions.getDropdownSettingsWithEmpty());
        $('#sound-select').dropdown(SoundFilesSelector.getDropdownSettingsWithEmpty());
    }
};
```

## Error Handling and User Feedback

```javascript
const errorHandler = {
    /**
     * Handle API errors gracefully
     * @param {Object} response - API response
     */
    handleApiError(response) {
        // Remove loading states
        $('.loading').removeClass('loading disabled');

        if (response.messages?.error) {
            UserMessage.showError(
                response.messages.error,
                globalTranslate.mod_ErrorHeader
            );
        } else {
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

## Storage and Caching

```javascript
const storageHandler = {
    storageKeyData: 'moduleData',

    /**
     * Save to session storage
     * @param {Object} data - Data to save
     */
    saveToStorage(data) {
        sessionStorage.setItem(
            storageHandler.storageKeyData,
            JSON.stringify(data)
        );
    },

    /**
     * Load from session storage
     * @returns {Object|null} Stored data or null
     */
    loadFromStorage() {
        const rawData = sessionStorage.getItem(storageHandler.storageKeyData);
        if (rawData) {
            try {
                return JSON.parse(rawData);
            } catch (e) {
                console.error('Error parsing stored data:', e);
                sessionStorage.removeItem(storageHandler.storageKeyData);
            }
        }
        return null;
    }
};
```

## Common Mistakes to Avoid

### ❌ Using var instead of const/let
```javascript
// WRONG
var count = 0;
var name = 'test';

// CORRECT
let count = 0;
const name = 'test';
```

### ❌ String concatenation instead of templates
```javascript
// WRONG
const msg = 'User ' + username + ' logged in at ' + time;

// CORRECT
const msg = `User ${username} logged in at ${time}`;
```

### ❌ Loose equality instead of strict
```javascript
// WRONG
if (value == null) { }
if (result == true) { }

// CORRECT
if (value === null) { }
if (result === true) { }
```

### ❌ Not caching jQuery objects
```javascript
// WRONG
$('#element').addClass('active');
$('#element').show();
$('#element').focus();

// CORRECT
const $element = $('#element');
$element.addClass('active').show().focus();
```

### ❌ Not handling async errors
```javascript
// WRONG
PbxApi.getData(callback);

// CORRECT
PbxApi.getData((result, response) => {
    if (result === false) {
        errorHandler.handleApiError(response);
        return;
    }
    // Process data
});
```

## Advanced Patterns

For detailed information on advanced patterns, see:

- **[PATTERNS.md](PATTERNS.md)** - Real-world patterns from MikoPBX codebase
- **[ES6_FEATURES.md](ES6_FEATURES.md)** - Complete ES6+ features guide
- **[FOMANTIC_UI.md](FOMANTIC_UI.md)** - Fomantic-UI component patterns
- **[VALIDATION.md](VALIDATION.md)** - Form validation patterns

## Code Review Workflow

When reviewing JavaScript code:

1. **Check module structure**
   - Follows standard object literal pattern
   - Has initialize() method
   - Properly scoped variables

2. **Verify ES6+ usage**
   - const/let instead of var
   - Arrow functions for callbacks
   - Template literals for strings
   - Destructuring where appropriate

3. **Validate jQuery patterns**
   - Objects cached with $ prefix
   - Event delegation for dynamic elements
   - Proper method chaining

4. **Review API handling**
   - Loading states shown/hidden
   - Errors handled gracefully
   - Callbacks follow standard pattern

5. **Check UI components**
   - Fomantic-UI components initialized
   - Re-initialized after dynamic updates
   - Proper lifecycle management

6. **Inspect error handling**
   - Try/catch for JSON parsing
   - API errors displayed to user
   - Cleanup in finally blocks

## Babel Transpilation

All ES6+ code must be transpiled using project's Babel configuration:

```bash
/Users/nb/PhpstormProjects/mikopbx/MikoPBXUtils/node_modules/.bin/babel \
    "$INPUT_FILE" \
    --out-dir "$OUTPUT_DIR" \
    --source-maps inline \
    --presets airbnb
```

Always transpile after making changes to source files in `sites/admin-cabinet/assets/js/src/`.

## Quick Reference

### Variable Declarations
- **const**: For values that won't be reassigned
- **let**: For values that will change
- **Never use var**

### Function Styles
- **Arrow functions**: For callbacks, event handlers
- **Method shorthand**: For object methods
- **Named functions**: For top-level functions

### String Formatting
- **Template literals**: Always for interpolation
- **Backticks**: For multi-line strings

### Comparisons
- **===, !==**: Always use strict equality
- **Explicit checks**: Prefer explicit over truthy/falsy

### jQuery
- **$ prefix**: All cached jQuery objects
- **Event delegation**: For dynamic elements
- **Method chaining**: When possible

### API Calls
- **Loading states**: Show during operations
- **Error handling**: Always handle failures
- **Callbacks**: Follow (result, response) pattern

## When to Use This Skill

Use this skill when:
- Writing new JavaScript code
- Reviewing pull requests
- Refactoring existing code
- Debugging style-related issues
- Teaching JavaScript best practices
- Ensuring code consistency

## Summary

This skill ensures:
- ✅ Consistent ES6+ modern JavaScript
- ✅ Proper jQuery patterns and optimization
- ✅ Correct Fomantic-UI component usage
- ✅ Standardized API communication
- ✅ Robust error handling
- ✅ Maintainable code structure
