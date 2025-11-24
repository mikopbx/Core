# CLAUDE.md - MikoPBX AdminCabinet Development

This file provides guidance to Claude Code (claude.ai/code) for AdminCabinet web interface development in MikoPBX.

## AdminCabinet Architecture Overview

The AdminCabinet is MikoPBX's web administration interface built on:
- **Phalcon MVC Framework** - High-performance PHP framework
- **Volt Template Engine** - Fast template system with caching
- **Fomantic UI** (formerly Semantic UI) - Modern CSS framework
- **jQuery + ES6 Modules** - Frontend JavaScript architecture
- **Babel Transpilation** - Modern JS features with compatibility

### Directory Structure

```
src/AdminCabinet/
├── Config/                 # Configuration and DI setup
├── Controllers/           # MVC Controllers (one per section)
├── Forms/                 # Form definitions with validation
├── Library/               # Helper classes and utilities
├── Plugins/               # Application plugins (security, assets)
├── Providers/            # Service providers for DI container
└── Views/                # Volt templates organized by controller

sites/admin-cabinet/
├── assets/
│   ├── css/              # Custom CSS and vendor styles
│   ├── img/              # Images and icons
│   └── js/
│       ├── src/          # Source JavaScript (ES6, Airbnb style)
│       └── pbx/          # Transpiled JavaScript (Babel output)
└── index.php             # Entry point
```

## Core Components

### 1. BaseController

All controllers extend `BaseController` which provides:

```php
class ExtensionsController extends BaseController
{
    public function indexAction(): void
    {
        // List view - usually minimal logic
    }
    
    public function modifyAction($id = null): void
    {
        // Load entity
        $extension = Extensions::findFirstById($id);
        
        // Create form
        $form = new ExtensionEditForm($extension);
        
        // Pass to view
        $this->view->form = $form;
        $this->view->represent = $extension->getRepresent();
    }
    
    public function saveAction(): void
    {
        if (!$this->request->isPost()) {
            return $this->forward('extensions/index');
        }
        
        // Process form data
        $data = $this->request->getPost();
        // ... save logic
        
        // Use saveEntity helper
        $this->saveEntity($extension, 'extensions/modify/{id}');
    }
}
```

Key features:
- Automatic view selection based on controller/action
- Built-in AJAX response handling
- Form validation and flash messages
- Module integration support
- Sanitization helpers

### 2. Forms

Forms use Phalcon's form builder with custom helpers:

```php
class ExtensionEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);
        
        // Hidden fields
        $this->add(new Hidden('id'));
        
        // Text input with input mask
        $this->add(new Text('number', [
            "data-inputmask" => "'mask': '9{2,4}'"
        ]));
        
        // Checkbox helper
        $this->addCheckBox('show_in_phonebook', 
            intval($entity->show_in_phonebook) === 1);
        
        // Select dropdown
        $this->add(new Select('codec', Codecs::find(), [
            'using' => ['name', 'description'],
            'useEmpty' => true,
            'emptyText' => $this->translation->_('ex_SelectCodec'),
        ]));
        
        // Text area with auto-sizing
        $this->addTextArea('description', $entity->description, 80);
    }
}
```

### 3. Views (Volt Templates)

Views use Volt templating with Fomantic UI components:

```volt
{% extends "layouts/main.volt" %}

{% block content %}
<form class="ui form" id="extension-form">
    {{ form.render('id') }}
    
    <div class="field">
        <label>{{ t._('ex_Number') }}</label>
        {{ form.render('number') }}
    </div>
    
    <div class="field">
        <div class="ui checkbox">
            {{ form.render('show_in_phonebook') }}
            <label>{{ t._('ex_ShowInPhonebook') }}</label>
        </div>
    </div>
    
    {{ partial("partials/submitbutton", ['indexurl':'extensions/index']) }}
</form>
{% endblock %}
```

### 4. Service Providers

Services are registered via providers:

```php
class RegisterDIServices
{
    public static function init(DiInterface $di): void
    {
        $providers = [
            LoggerProvider::class,
            ViewProvider::class,
            VoltProvider::class,
            SessionProvider::class,
            // ... more providers
        ];
        
        foreach ($providers as $provider) {
            (new $provider())->register($di);
        }
    }
}
```

## Frontend Architecture

### JavaScript Module Pattern

Each page/section has its own JavaScript module:

```javascript
// src/Extensions/extensions-index.js
/* global globalRootUrl, SemanticLocalization, PbxApi */

const extensionsIndex = {
    $extensionsList: $('#extensions-table'),
    dataTable: {},
    
    initialize() {
        // Initialize DataTable
        extensionsIndex.initializeDataTable();
        
        // Set up event handlers
        $('.extension-row td').on('dblclick', (e) => {
            const id = $(e.target).closest('tr').attr('id');
            window.location = `${globalRootUrl}extensions/modify/${id}`;
        });
        
        // Delete button handler
        $('body').on('click', 'a.delete', (e) => {
            e.preventDefault();
            $(e.target).addClass('loading');
            const id = $(e.target).closest('a').attr('data-value');
            PbxApi.ExtensionsDeleteRecord(id, extensionsIndex.deleteCallback);
        });
    },
    
    deleteCallback(response) {
        if (response.result === true) {
            extensionsIndex.dataTable.ajax.reload();
        } else {
            UserMessage.showMultiString(response.messages);
        }
    }
};

// Initialize when DOM is ready
$(document).ready(() => {
    extensionsIndex.initialize();
});
```

### Form Handling

Forms use a centralized Form object:

```javascript
// src/Extensions/extension-modify.js
const extensionModify = {
    $formObj: $('#extension-form'),
    
    initialize() {
        // Avatar handling
        extensionModify.initializeAvatar();
        
        // Form validation rules
        extensionModify.initializeForm();
        
        // Additional features
        extensionModify.initializeDualList();
    },
    
    initializeForm() {
        Form.$formObj = extensionModify.$formObj;
        Form.url = `${globalRootUrl}extensions/save`;
        Form.validateRules = extensionModify.validateRules;
        Form.cbBeforeSendForm = extensionModify.cbBeforeSendForm;
        Form.cbAfterSendForm = extensionModify.cbAfterSendForm;
        Form.initialize();
    },
    
    validateRules: {
        number: {
            identifier: 'number',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.ex_ValidateNumberIsEmpty,
                },
                {
                    type: 'existRule[number-error]',
                    prompt: globalTranslate.ex_ValidateNumberIsDouble,
                },
            ],
        },
        // ... more rules
    },
    
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = extensionModify.$formObj.form('get values');
        return result;
    },
    
    cbAfterSendForm() {
        // Handle post-save actions
    }
};
```

### API Communication

All API calls go through the centralized PbxApi object:

```javascript
// PbxAPI/extensionsAPI.js
const ExtensionsAPI = {
    /**
     * Get all extensions list
     */
    GetPhonesRepresent(callback) {
        $.api({
            url: PbxApi.extensionsGetPhonesRepresent,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response.data);
            },
        });
    },
    
    /**
     * Delete extension record
     */
    DeleteRecord(id, callback) {
        $.api({
            url: PbxApi.extensionsDeleteRecord,
            on: 'now',
            method: 'POST',
            data: {id: id},
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response);
            },
        });
    }
};
```

## Development Patterns

### 1. Creating a New Section

1. **Create Controller** (`src/AdminCabinet/Controllers/MyFeatureController.php`):
```php
class MyFeatureController extends BaseController
{
    public function indexAction(): void 
    {
        // Index usually requires minimal logic
    }
    
    public function modifyAction($id = null): void
    {
        $record = MyModel::findFirstById($id);
        if (!$record) {
            $record = new MyModel();
        }
        
        $form = new MyFeatureEditForm($record);
        $this->view->form = $form;
        $this->view->represent = $record->getRepresent();
    }
}
```

2. **Create Form** (`src/AdminCabinet/Forms/MyFeatureEditForm.php`):
```php
class MyFeatureEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);
        
        $this->add(new Hidden('id'));
        $this->add(new Text('name'));
        $this->addCheckBox('enabled', $entity->enabled === '1');
    }
}
```

3. **Create Views** (`src/AdminCabinet/Views/MyFeature/`):
   - `index.volt` - List view with DataTable
   - `modify.volt` - Edit form view

4. **Create JavaScript** (`sites/admin-cabinet/assets/js/src/MyFeature/`):
   - `my-feature-index.js` - List page functionality
   - `my-feature-modify.js` - Form handling

### 2. DataTables Integration

For paginated lists with server-side processing:

```javascript
initializeDataTable() {
    myFeature.$table.DataTable({
        ajax: {
            url: `${globalRootUrl}my-feature/getNewRecords`,
            dataSrc: 'data',
        },
        columns: [
            { data: 'name' },
            { data: 'description' },
            { data: null, defaultContent: '', orderable: false }
        ],
        columnDefs: [{
            targets: -1,
            render(data) {
                return `<a href="${globalRootUrl}my-feature/modify/${data.id}" 
                          class="ui icon button">
                          <i class="edit icon"></i>
                        </a>`;
            }
        }],
        order: [[0, 'asc']],
    });
}
```

### 3. Form Validation

Use Fomantic UI validation with custom rules:

```javascript
validateRules: {
    name: {
        identifier: 'name',
        rules: [
            {
                type: 'empty',
                prompt: globalTranslate.mf_ValidateNameEmpty,
            },
            {
                type: 'maxLength[50]',
                prompt: globalTranslate.mf_ValidateNameMaxLength,
            }
        ],
    },
    email: {
        identifier: 'email',
        rules: [
            {
                type: 'email',
                prompt: globalTranslate.mf_ValidateInvalidEmail,
            }
        ],
    }
}
```

### 4. AJAX Responses

Controllers automatically handle AJAX responses:

```php
public function saveAction(): void
{
    if (!$this->request->isPost()) {
        return;
    }
    
    $data = $this->request->getPost();
    $record = MyModel::findFirstById($data['id']) ?: new MyModel();
    
    // Process data...
    
    if ($this->request->isAjax()) {
        // Automatically returns JSON
        $this->view->success = $result;
        $this->view->message = $result ? 'Saved' : 'Error';
        $this->view->data = ['id' => $record->id];
    } else {
        // Regular request - use flash messages
        if ($result) {
            $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        }
        $this->forward('my-feature/index');
    }
}
```

## Module Integration

Modules can extend the AdminCabinet interface:

### 1. Module Views

Place views in: `Modules/{ModuleName}/App/Views/`

### 2. Hook into Volt Blocks

```php
// In module's WebUIConfigInterface implementation
public function onVoltBlockCompile(string $controller, string $blockName, $view): string
{
    if ($blockName === 'FooterJS') {
        return 'Modules/' . $this->moduleUniqueId . '/footerjs';
    }
    return '';
}
```

### 3. Add Menu Items

```php
public function onAfterExecuteRoute($dispatcher): void
{
    $view = $dispatcher->getDI()->get('view');
    $view->MenuItems = array_merge($view->MenuItems ?? [], [
        'mymodule' => [
            'caption' => 'My Module',
            'iconClass' => 'puzzle piece',
            'href' => '/admin-cabinet/my-module/index/',
        ]
    ]);
}
```

## Access Control (ACL) in JavaScript

MikoPBX provides a client-side ACL Helper for checking user permissions in JavaScript code. This is essential for forms that load data via REST API where PHP doesn't render the page.

### How It Works

1. **PHP generates ACL data** - `partials/acl-init.volt` checks permissions using `isAllowed()` and generates JavaScript object
2. **JavaScript reads ACL data** - `ACLHelper` module provides convenient API for permission checks
3. **UI adapts dynamically** - Buttons and form elements are shown/hidden based on permissions

### ACL Helper API

The `ACLHelper` global object provides these methods:

```javascript
// Basic permission check
if (ACLHelper.isAllowed('save')) {
    $('#save-button').show();
}

// Shorthand methods
if (ACLHelper.canSave()) { }
if (ACLHelper.canDelete()) { }
if (ACLHelper.canModify()) { }

// Show/hide elements by permission
ACLHelper.toggleByPermission('#save-button', 'save');
ACLHelper.toggleByPermission('#delete-button', 'delete');

// Enable/disable elements
ACLHelper.toggleEnableByPermission('#submit-form', 'save');

// Batch apply permissions
ACLHelper.applyPermissions({
    save: {
        show: '#save-button',
        enable: '#form-submit'
    },
    delete: {
        show: '#delete-button'
    }
});

// Get all permissions
const permissions = ACLHelper.getPermissions();

// Conditional execution
ACLHelper.ifAllowed('save', () => {
    console.log('User can save');
}, () => {
    console.log('User cannot save');
});

// Debug ACL state
ACLHelper.debug();
```

### Using ACL Helper in Forms

Add ACL checks in your form's `initialize()` method:

```javascript
const myForm = {
    initialize() {
        // ... other initialization ...

        // Apply ACL permissions
        myForm.applyACLPermissions();
    },

    applyACLPermissions() {
        // Check if ACL Helper is available
        if (typeof ACLHelper === 'undefined') {
            console.warn('ACLHelper not available');
            return;
        }

        // Apply permissions
        ACLHelper.applyPermissions({
            save: {
                show: '#submitbutton, #dropdownSubmit',
                enable: '#my-form'
            },
            delete: {
                show: '.delete-button'
            }
        });

        // Additional logic if user cannot save
        if (!ACLHelper.canSave()) {
            // Disable all inputs
            $('#my-form input, #my-form select, #my-form textarea')
                .prop('readonly', true)
                .addClass('disabled');

            // Show info message
            UserMessage.showInformation(globalTranslate.my_NoPermissionToModify);
        }
    }
};
```

### Available Permissions

The ACL system checks these standard actions:
- `index` - View list pages
- `modify` - Edit existing records
- `save` - Save changes
- `delete` - Delete records
- `copy` - Copy records
- `download` - Download files
- `restore` - Restore backups
- `edit` - Edit (alias for modify)
- `modifyiax` - Modify IAX providers
- `modifysip` - Modify SIP providers

### ACL Data Structure

The ACL data is available in `window.CurrentPageACL`:

```javascript
{
    controller: 'MikoPBX\\AdminCabinet\\Controllers\\ExtensionsController',
    controllerName: 'extensions',
    actionName: 'modify',
    permissions: {
        'index': true,
        'modify': true,
        'save': true,
        'delete': false,
        // ... other permissions
    },
    initialized: true
}
```

### Volt Templates (Server-side ACL)

For server-rendered content, use `isAllowed()` in Volt templates:

```volt
{% if isAllowed('save') %}
    <button id="save-button">Save</button>
{% endif %}

{% if isAllowed('delete') %}
    <button id="delete-button">Delete</button>
{% endif %}
```

### Integration with ModuleUsersUI (Future)

When ModuleUsersUI is implemented:
- `SecurityPlugin::isAllowedAction()` will extract role from JWT token
- ACL Helper will continue to work without changes
- Permissions will be based on user's role from JWT claims
- No JavaScript code changes required

### Example: Extension Form

```javascript
/* global ACLHelper */

const extension = {
    initialize() {
        // ... setup code ...

        // Apply ACL permissions
        extension.applyACLPermissions();

        // Load data
        extension.loadExtensionData();
    },

    applyACLPermissions() {
        if (typeof ACLHelper === 'undefined') return;

        ACLHelper.applyPermissions({
            save: {
                show: '#submitbutton, #dropdownSubmit',
                enable: '#extensions-form'
            },
            delete: {
                show: '.delete-button'
            }
        });

        if (!ACLHelper.canSave()) {
            $('#extensions-form input, #extensions-form select, #extensions-form textarea')
                .prop('readonly', true);
            UserMessage.showInformation(globalTranslate.ex_NoPermissionToModify);
        }
    }
};
```

## Security Considerations

1. **CSRF Protection** - Automatically handled by SecurityPlugin
2. **Input Sanitization** - Use `BaseController::sanitizeData()`
3. **Authentication** - Handled by SessionController and SecurityPlugin
4. **XSS Prevention** - Volt auto-escapes output by default
5. **SQL Injection** - Use Phalcon's ORM and query builder
6. **ACL Enforcement** - Use ACLHelper for client-side permission checks

## Performance Optimization

1. **Volt Caching** - Templates are compiled and cached
2. **Asset Management** - CSS/JS minification via AssetManager
3. **Lazy Loading** - DataTables load data on demand
4. **AJAX Updates** - Partial page updates instead of full reload
5. **Service Caching** - DI services are shared by default

## Common Patterns

### 1. Status Checking

Many pages use workers to check status:

```javascript
const statusWorker = new Worker(`${globalRootUrl}js/pbx/Extensions/extension-status-worker.js`);
statusWorker.postMessage({
    actionName: 'initialize',
    data: extensionsList,
});
```

### 2. File Uploads

Use Resumable.js for chunked uploads:

```javascript
const resumable = new Resumable({
    target: PbxApi.filesUploadFile,
    testChunks: false,
    chunkSize: 1 * 1024 * 1024,
});
```

### 3. Sound File Selection

Use the centralized sound file selector:

```javascript
SoundFilesSelector.initialize(
    '#sound-file-select',
    '#sound-file-id',
    SoundFilesSelector.audioPlayer
);
```

### 4. Filter Persistence with sessionStorage

For pages with filters that should persist during browser session but clear on logout:

**Pattern**: sessionStorage-based state management with hash-triggered reset

**Example**: Call Detail Records page (`sites/admin-cabinet/assets/js/src/CallDetailRecords/call-detail-records-index.js`)

```javascript
const myModule = {
    STORAGE_KEY: 'my_filters_state',
    isInitialized: false,  // Prevents saving during initial load

    initialize() {
        // Check for reset hash FIRST, before any initialization
        myModule.checkResetHash();

        // Listen for hash changes (when user clicks menu link while on page)
        window.addEventListener('hashchange', () => {
            myModule.checkResetHash();
        });

        // Continue with normal initialization
        myModule.initializeDataTable();
    },

    checkResetHash() {
        if (window.location.hash === '#reset-cache') {
            myModule.clearFiltersState();
            // Also clear any localStorage preferences if needed
            localStorage.removeItem('myTablePageLength');
            // Remove hash from URL without page reload
            history.replaceState(null, null, window.location.pathname);
            // Reload page to apply reset
            window.location.reload();
        }
    },

    saveFiltersState() {
        try {
            if (typeof sessionStorage === 'undefined') {
                return;
            }

            const state = {
                searchText: myModule.$searchInput.val() || '',
                currentPage: myModule.dataTable.page.info().page,
                // ... other filter values
            };

            sessionStorage.setItem(myModule.STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.error('Failed to save filters:', error);
        }
    },

    loadFiltersState() {
        try {
            if (typeof sessionStorage === 'undefined') {
                return null;
            }

            const rawData = sessionStorage.getItem(myModule.STORAGE_KEY);
            if (!rawData) {
                return null;
            }

            const state = JSON.parse(rawData);
            if (!state || typeof state !== 'object') {
                myModule.clearFiltersState();
                return null;
            }

            return state;
        } catch (error) {
            console.error('Failed to load filters:', error);
            myModule.clearFiltersState();
            return null;
        }
    },

    clearFiltersState() {
        try {
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.removeItem(myModule.STORAGE_KEY);
            }
        } catch (error) {
            console.error('Failed to clear filters:', error);
        }
    },

    initializeDataTable() {
        myModule.$table.DataTable({
            // ... DataTable config
            initComplete() {
                // Set flag FIRST to allow state saving during restoration
                myModule.isInitialized = true;
                // Restore filters AFTER DataTable has loaded initial data
                myModule.restoreFiltersFromState();
            }
        });

        // Save state on every draw event
        myModule.dataTable.on('draw', () => {
            // Skip saving during initial load
            if (!myModule.isInitialized) {
                return;
            }
            myModule.saveFiltersState();
        });
    },

    restoreFiltersFromState() {
        const savedState = myModule.loadFiltersState();
        if (!savedState) {
            return;
        }

        // Restore search text
        if (savedState.searchText) {
            myModule.$searchInput.val(savedState.searchText);
            myModule.dataTable.search(savedState.searchText);
        }

        // Restore page number with setTimeout workaround
        // WHY: DataTable needs time to complete initialization
        if (savedState.currentPage) {
            setTimeout(() => {
                myModule.dataTable.page(savedState.currentPage).draw(false);
            }, 100);
        }
    }
};
```

**Menu Configuration**: Add `#reset-cache` param in `src/AdminCabinet/Library/Elements.php`:

```php
MyFeatureController::class => [
    'caption' => 'mm_MyFeature',
    'iconclass' => 'icon-name',
    'action' => 'index',
    'param' => '#reset-cache',  // Clears filters when clicking menu
    'style' => '',
],
```

**Key Principles**:
- Use **sessionStorage** (not localStorage) - clears on logout/tab close
- Check hash **before** any initialization
- Add **hashchange** event listener for runtime hash changes
- Use **isInitialized** flag to prevent race conditions
- **initComplete** callback is the right place to restore state
- Save state on **draw** event (fires on pagination, search, filter changes)
- Include feature detection for sessionStorage
- Use try-catch for all storage operations
- Clear corrupted data automatically

**Why sessionStorage over localStorage**:
- Security: Different users shouldn't see each other's filters
- Privacy: Each session starts with clean state
- Automatic cleanup: Browser clears sessionStorage on logout

**Critical DataTable Timing Issue**:
- DataTables fires **`draw` event BEFORE `initComplete`** callback
- Without `isInitialized` flag, first draw will overwrite saved state with defaults
- Solution: Skip saving in draw handler until `isInitialized = true` in `initComplete`
- Page restoration requires `setTimeout(100ms)` workaround due to DataTable timing

**Reference Implementation**: See `/Users/nb/PhpstormProjects/mikopbx/Core/sites/admin-cabinet/assets/js/src/CallDetailRecords/call-detail-records-index.js` (lines 74-203, 397-402, 455-465, 526-553) for complete working example with all edge cases handled.

### 5. Hash-based Page Actions

Use URL hash for triggering page-specific actions without full reload:

**Pattern**: `hashchange` event handling for single-page interactions

```javascript
// Check hash on page load
if (window.location.hash === '#my-action') {
    myModule.handleAction();
    // Remove hash to prevent repeat triggers
    history.replaceState(null, null, window.location.pathname);
}

// Listen for hash changes during session
window.addEventListener('hashchange', () => {
    if (window.location.hash === '#my-action') {
        myModule.handleAction();
        history.replaceState(null, null, window.location.pathname);
    }
});
```

**Common Use Cases**:
- `#reset-cache` - Clear filters and reload page
- `#reset-filters` - Reset form filters only
- `#file=asterisk%2Fverbose` - Navigate to specific log file
- `#tab=advanced` - Switch to specific tab

**Why Use Hash**:
- No server request - instant action
- Works with menu links while staying on page
- Browser back/forward compatible
- Can be bookmarked

## Debugging

1. **Enable Debug Mode** - Set in `config.php`
2. **Volt Cache** - Cleared automatically in debug mode
3. **JavaScript Console** - Check for errors and API responses
4. **Network Tab** - Monitor AJAX requests
5. **Sentry Integration** - Automatic error reporting

## Best Practices

1. **Follow MVC Pattern** - Keep logic in controllers, not views
2. **Use Form Classes** - Define forms programmatically
3. **Leverage Base Classes** - Extend BaseController and BaseForm
4. **Consistent Naming** - Controller names match URL structure
5. **Translation Keys** - Use consistent prefixes per module
6. **JavaScript Modules** - One module per page/feature
7. **API Consistency** - All API calls through PbxApi object
8. **Error Handling** - Show user-friendly messages via UserMessage
9. **Loading States** - Show loading indicators during operations
10. **Responsive Design** - Test on various screen sizes

## JavaScript Code Style

For detailed JavaScript coding standards and real-world examples from the project, use:
📖 **mikopbx-js-style** skill - Comprehensive JavaScript style guide with ES6+, Fomantic-UI patterns, and validation

Key principles:
- Modular object-oriented structure with `initialize()` pattern
- jQuery objects prefixed with `$`
- Consistent API communication through PbxApi
- Centralized form handling with validation
- Proper error handling and user feedback
- SessionStorage for filter persistence (see Common Patterns #4)
- Event delegation for dynamic elements
- Loading states for all async operations