# CLAUDE.md - MikoPBX AdminCabinet

Web administration interface built on Phalcon MVC, Volt templates, Fomantic UI, and jQuery + ES6.

## File Inventory

```
AdminCabinet/
├── Module.php                         # Phalcon ModuleDefinitionInterface
├── Config/
│   └── RegisterDIServices.php         # DI container (28 providers)
│
├── Controllers/                       # 33 controllers
│   ├── BaseController.php             # Base class (extends Phalcon\Mvc\Controller)
│   ├── AclController.php              # Access Control Lists
│   ├── ApiKeysController.php          # REST API keys
│   ├── AsteriskManagersController.php # AMI users
│   ├── AsteriskRestUsersController.php # ARI users
│   ├── CallDetailRecordsController.php # CDR viewing/filtering
│   ├── CallQueuesController.php       # Call queues
│   ├── ConferenceRoomsController.php  # Conference rooms
│   ├── ConsoleController.php          # Web terminal
│   ├── CustomFilesController.php      # Custom config files
│   ├── DialplanApplicationsController.php # Dialplan apps
│   ├── ErrorsController.php           # Error pages (401, 404, 500)
│   ├── ExtensionsController.php       # Extensions/phones
│   ├── Fail2BanController.php         # Fail2Ban settings
│   ├── FirewallController.php         # Firewall rules
│   ├── GeneralSettingsController.php  # Core PBX settings (multi-tab)
│   ├── IncomingRoutesController.php   # Incoming routing
│   ├── IvrMenuController.php          # IVR menus
│   ├── LicensingController.php        # License/marketplace
│   ├── LocalizationController.php     # Language settings
│   ├── MailSettingsController.php     # SMTP/OAuth2
│   ├── NetworkController.php          # Network interfaces
│   ├── OffWorkTimesController.php     # After-hours time frames
│   ├── OutboundRoutesController.php   # Outgoing routing
│   ├── PbxExtensionModulesController.php # Module management
│   ├── ProvidersController.php        # SIP/IAX providers
│   ├── RestartController.php          # System restart
│   ├── SessionController.php          # Authentication
│   ├── SoundFilesController.php       # Sound files
│   ├── StorageController.php          # Storage (local, S3)
│   ├── SystemDiagnosticController.php # Diagnostics/logs
│   ├── TimeSettingsController.php     # Time/timezone
│   └── UpdateController.php           # System updates
│
├── Forms/                             # 35 forms + 1 element
│   ├── BaseForm.php                   # Base class with validation helpers
│   ├── Elements/
│   │   └── SemanticUIDropdown.php     # Custom Fomantic UI dropdown
│   ├── ApiKeyEditForm.php
│   ├── AsteriskManagerEditForm.php
│   ├── AsteriskRestUserEditForm.php
│   ├── CallDetailRecordsFilterForm.php
│   ├── CallQueueEditForm.php
│   ├── ConferenceRoomEditForm.php
│   ├── CustomFilesEditForm.php
│   ├── DefaultIncomingRouteForm.php
│   ├── DialplanApplicationEditForm.php
│   ├── ExtensionEditForm.php
│   ├── Fail2BanEditForm.php
│   ├── FirewallEditForm.php
│   ├── GeneralSettingsEditForm.php
│   ├── IaxProviderEditForm.php
│   ├── IncomingRouteEditForm.php
│   ├── IvrMenuEditForm.php
│   ├── LicensingActivateCouponForm.php
│   ├── LicensingChangeLicenseKeyForm.php
│   ├── LicensingGetKeyForm.php
│   ├── LocalStorageEditForm.php
│   ├── LoginForm.php
│   ├── MailSettingsEditForm.php
│   ├── NetworkEditForm.php
│   ├── OutgoingRouteEditForm.php
│   ├── PbxExtensionModuleSettingsForm.php
│   ├── S3StorageEditForm.php
│   ├── SipProviderEditForm.php
│   ├── SoundFilesEditForm.php
│   ├── StorageEditForm.php
│   ├── SystemDiagnosticForm.php
│   ├── TimeFrameEditForm.php
│   └── TimeSettingsEditForm.php
│
├── Library/                           # 3 helper classes
│   ├── Cidr.php                       # CIDR notation parsing (Injectable)
│   ├── Elements.php                   # Menu structure and UI elements (Injectable)
│   └── SecurityHelper.php             # Security helper functions
│
├── Plugins/                           # 4 plugins
│   ├── AssetManager.php               # JS/CSS asset registration (extends Manager)
│   ├── NormalizeControllerNamePlugin.php # Controller name routing (Injectable)
│   ├── NotFoundPlugin.php             # 404 handler (Injectable)
│   └── SecurityPlugin.php             # Auth, ACL, CSRF (Injectable)
│
├── Providers/                         # 7 AdminCabinet-specific providers
│   ├── AssetProvider.php              # CSS/JS assets per page
│   ├── DispatcherProvider.php         # MVC dispatcher config
│   ├── ElementsProvider.php           # Menu/UI elements
│   ├── FlashProvider.php              # Session-based flash messages
│   ├── SecurityPluginProvider.php     # Security plugin registration
│   ├── ViewProvider.php               # Volt view engine config
│   └── VoltProvider.php               # Volt template compilation
│
└── Views/                             # 35 view directories
    ├── layouts/
    │   └── main.volt                  # Main layout template
    ├── partials/                       # 12 reusable partials
    │   ├── acl-init.volt              # ACL initialization
    │   ├── emptyTablePlaceholder.volt
    │   ├── leftsidebar.volt           # Left navigation
    │   ├── mainDimmer.volt            # Loading overlay
    │   ├── mainHeader.volt
    │   ├── modulesHeader.volt
    │   ├── modulesStatusToggle.volt
    │   ├── natqualify.volt
    │   ├── playAddNewSoundWithIcons.volt
    │   ├── submitbutton.volt          # Standard submit group
    │   ├── tablesbuttons.volt         # Table action buttons
    │   └── topMenu.volt               # Top navigation
    ├── ApiKeys/                       # + openapi.volt
    ├── Errors/                        # show401, show404, show500
    ├── Fail2Ban/                      # + IndexTabs/ (tabBanned, tabSettings)
    ├── GeneralSettings/               # 10 tab views (general, api, codecs, ssh, sip, recording, web, passwords, features, deleteall)
    ├── MailSettings/                  # + oauth2-callback.volt
    ├── Network/                       # + partials (interfaces, nat, static-routes)
    ├── SystemDiagnostic/              # show-log-tab, capture-log-tab, show-sysinfo-tab
    └── [30 other directories]         # index.volt + modify.volt each
```

## BaseController

```php
class BaseController extends Controller
{
    protected string $actionName;
    protected string $controllerName;         // CamelCase
    protected string $controllerClass;        // Full class name
    protected string $controllerNameUnCamelized; // kebab-case
    protected bool $isExternalModuleController;

    public function initialize(): void       // Extract dispatcher info, prepareView()
    protected function prepareView(): void   // Timezone, license, support URL, page title
}
```

Key features:
- Automatic view selection based on controller/action
- Built-in AJAX response handling (JSON for AJAX, flash messages otherwise)
- Form validation and `saveEntity()` helper
- Module integration via `isExternalModuleController`

## DI Services (28 providers)

```
Logging:        LoggerAuthProvider, LoggerProvider
Caching:        ManagedCacheProvider, RedisClientProvider
Database:       ModelsAnnotationsProvider, ModelsMetadataProvider,
                MainDatabaseProvider, ModulesDBConnectionsProvider,
                CDRDatabaseProvider, RecordingStorageDatabaseProvider
Web:            DispatcherProvider, RouterProvider, UrlProvider,
                ViewProvider, VoltProvider, FlashProvider,
                ElementsProvider, AssetProvider, SecurityPluginProvider
Session:        SessionProvider
Security:       AclProvider, JwtProvider
Queue:          BeanstalkConnectionModelsProvider
Translation:    MessagesProvider, TranslationProvider, LanguageProvider
License:        MarketPlaceProvider
Modules:        PBXConfModulesProvider
System:         RegistryProvider, CryptProvider, PBXCoreRESTClientProvider, EventBusProvider
```

## Frontend Architecture

### JavaScript Source (`sites/admin-cabinet/assets/js/src/`)

Each section has its own JS module with `initialize()` pattern:

```
src/
├── Advice/               # System advice/tips
├── ApiKeys/              # API key management
├── AsteriskManagers/     # AMI user UI
├── AsteriskRestUsers/    # ARI user UI
├── CallDetailRecords/    # CDR viewer
├── CallQueues/           # Queue management
├── ConferenceRooms/      # Conference rooms
├── CustomFiles/          # Custom files
├── DialplanApplications/ # Dialplan apps
├── Extensions/           # Phone extensions
├── Fail2Ban/             # Fail2Ban settings
├── Firewall/             # Firewall rules
├── FormElements/         # Form helper components
├── GeneralSettings/      # General settings tabs
├── IncomingRoutes/       # Incoming routing
├── IvrMenu/              # IVR menus
├── Language/             # i18n
├── MailSettings/         # Email/OAuth2
├── Network/              # Network config
├── PbxAPI/               # Centralized API communication
├── SoundFiles/           # Sound file management
├── SystemDiagnostic/     # Log viewer with SVG timeline
└── [more sections]
```

### Module Pattern

```javascript
const extensionsIndex = {
    $extensionsList: $('#extensions-table'),
    dataTable: {},

    initialize() {
        extensionsIndex.initializeDataTable();
        // Event handlers...
    },

    deleteCallback(response) {
        if (response.result === true) {
            extensionsIndex.dataTable.ajax.reload();
        } else {
            UserMessage.showMultiString(response.messages);
        }
    }
};

$(document).ready(() => {
    extensionsIndex.initialize();
});
```

### Form Handling

Forms use centralized `Form` object with Fomantic UI validation:

```javascript
const extensionModify = {
    $formObj: $('#extension-form'),

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
                { type: 'empty', prompt: globalTranslate.ex_ValidateNumberIsEmpty },
                { type: 'existRule[number-error]', prompt: globalTranslate.ex_ValidateNumberIsDouble },
            ],
        },
    },
};
```

### API Communication

All API calls go through centralized `PbxApi`:

```javascript
PbxApi.ExtensionsDeleteRecord(id, extensionsIndex.deleteCallback);
```

## ACL System

### Server-side (Volt)

```volt
{% if isAllowed('save') %}
    <button id="save-button">Save</button>
{% endif %}
```

### Client-side (JavaScript)

`ACLHelper` global object reads `window.CurrentPageACL`:

```javascript
ACLHelper.canSave()      // Check permission
ACLHelper.canDelete()
ACLHelper.applyPermissions({
    save: { show: '#submitbutton', enable: '#form' },
    delete: { show: '.delete-button' }
});
```

Standard actions: `index`, `modify`, `save`, `delete`, `copy`, `download`, `restore`, `edit`, `modifyiax`, `modifysip`.

## Filter Persistence Pattern

sessionStorage-based state with `#reset-cache` hash trigger:

```javascript
const myModule = {
    STORAGE_KEY: 'my_filters_state',
    isInitialized: false,  // Prevents saving during initial load

    initialize() {
        myModule.checkResetHash();
        window.addEventListener('hashchange', () => myModule.checkResetHash());
        myModule.initializeDataTable();
    },

    checkResetHash() {
        if (window.location.hash === '#reset-cache') {
            myModule.clearFiltersState();
            history.replaceState(null, null, window.location.pathname);
            window.location.reload();
        }
    },

    // Save/load/clear via sessionStorage with try-catch
    // Restore in DataTable initComplete callback
    // Save on draw event (skip while !isInitialized)
};
```

Menu config in `Elements.php` adds `'param' => '#reset-cache'`.

## Development Patterns

### Creating a New Section

1. **Controller** — extend `BaseController`, implement `indexAction()`, `modifyAction()`, `saveAction()`
2. **Form** — extend `BaseForm`, define fields in `initialize()`
3. **Views** — `Views/{Section}/index.volt`, `modify.volt` extending `layouts/main.volt`
4. **JavaScript** — `js/src/{Section}/section-index.js`, `section-modify.js`
5. **Babel** — transpile ES6+ to ES5 in `js/pbx/`

### Security

- CSRF — handled by `SecurityPlugin`
- Input sanitization — `BaseController::sanitizeData()`
- Authentication — `SessionController` + `SecurityPlugin`
- XSS — Volt auto-escaping
- SQL injection — Phalcon ORM
- ACL — `SecurityPlugin` server-side + `ACLHelper` client-side
