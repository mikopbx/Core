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

## Security Considerations

1. **CSRF Protection** - Automatically handled by SecurityPlugin
2. **Input Sanitization** - Use `BaseController::sanitizeData()`
3. **Authentication** - Handled by SessionController and SecurityPlugin
4. **XSS Prevention** - Volt auto-escapes output by default
5. **SQL Injection** - Use Phalcon's ORM and query builder

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

For detailed JavaScript coding standards and real-world examples from the project, see:
📖 **[JavaScript Style Guide](JS-STYLE-GUIDE.md)**

Key principles:
- Modular object-oriented structure with `initialize()` pattern
- jQuery objects prefixed with `$`
- Consistent API communication through PbxApi
- Centralized form handling with validation
- Proper error handling and user feedback
- SessionStorage for caching with error handling
- Event delegation for dynamic elements
- Loading states for all async operations