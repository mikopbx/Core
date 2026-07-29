# CLAUDE.md - MikoPBX AdminCabinet

Web administration interface built on Phalcon MVC, Volt templates, Fomantic UI, and jQuery + ES6.

## File Inventory

```
AdminCabinet/
├── Module.php                  # Phalcon ModuleDefinitionInterface
├── Config/RegisterDIServices.php   # DI container registration
├── Controllers/                # one controller per section, all extend BaseController
│   ├── BaseController.php       # Base class (extends Phalcon\Mvc\Controller)
│   ├── AsteriskManagersController     # AMI users
│   ├── AsteriskRestUsersController    # ARI users
│   ├── CallDetailRecordsController    # CDR viewing/filtering
│   ├── GeneralSettingsController      # Core PBX settings (multi-tab)
│   ├── StorageController              # Storage (local, S3)
│   ├── ErrorsController               # Error pages (401, 404, 500)
│   ├── ConsoleController              # Web terminal
│   ├── SystemDiagnosticController     # Diagnostics/logs
│   └── …                              # AclController, ApiKeys, CallQueues, ConferenceRooms,
│                                      #   CustomFiles, DialplanApplications, Extensions, Fail2Ban,
│                                      #   Firewall, IncomingRoutes, IvrMenu, Licensing, Localization,
│                                      #   MailSettings, Network, OffWorkTimes, OutboundRoutes,
│                                      #   PbxExtensionModules, Providers, Restart, Session, SoundFiles,
│                                      #   TimeSettings, Update
├── Forms/                       # mostly one `<Section>EditForm` per section
│   ├── BaseForm.php             # Base class with validation helpers
│   ├── Elements/SemanticUIDropdown.php   # Custom Fomantic UI dropdown
│   └── …                        # exceptions: CallDetailRecordsFilterForm, DefaultIncomingRouteForm,
│                                #   LoginForm, Licensing{ActivateCoupon,ChangeLicenseKey,GetKey}Form
├── Library/                     # Cidr.php (Injectable), Elements.php (menu/UI, Injectable), SecurityHelper.php
├── Plugins/
│   ├── AssetManager.php                 # JS/CSS asset registration (extends Manager)
│   ├── NormalizeControllerNamePlugin.php # Controller name routing (Injectable)
│   ├── NotFoundPlugin.php               # 404 handler (Injectable)
│   └── SecurityPlugin.php               # Auth, ACL, CSRF (Injectable)
├── Providers/                   # AdminCabinet-specific providers
│   ├── AssetProvider.php        # CSS/JS assets per page
│   ├── DispatcherProvider.php   # MVC dispatcher config
│   ├── ElementsProvider.php     # Menu/UI elements
│   ├── FlashProvider.php        # Session-based flash messages
│   ├── SecurityPluginProvider.php
│   ├── ViewProvider.php         # Volt view engine config
│   └── VoltProvider.php         # Volt template compilation
└── Views/
    ├── layouts/main.volt        # Main layout; hosts `#update-banner` DOM populated by `update-banner.js`
    ├── partials/                # leftsidebar, topMenu, mainHeader, modulesHeader, modulesStatusToggle,
    │                            #   mainDimmer, submitbutton, tablesbuttons, acl-init, natqualify,
    │                            #   emptyTablePlaceholder, playAddNewSoundWithIcons
    ├── ApiKeys/                 # + openapi.volt
    ├── Errors/                  # show401, show404, show500
    ├── Fail2Ban/               # + IndexTabs/ (tabBanned, tabWhitelist, tabSettings)
    ├── GeneralSettings/         # tab views: general, api, codecs, ssh, sip, recording, web,
    │                            #   passwords, features, deleteall
    ├── MailSettings/            # + oauth2-callback.volt
    ├── Network/                # + partials (interfaces, nat, static-routes)
    ├── SystemDiagnostic/        # show-log-tab, capture-log-tab, show-sysinfo-tab
    └── <other sections>/        # index.volt + modify.volt each
```

## BaseController

```php
class BaseController extends Controller
{
    protected string $actionName;
    protected string $controllerName;            // CamelCase
    protected string $controllerClass;           // Full class name
    protected string $controllerNameUnCamelized; // kebab-case
    protected bool $isExternalModuleController;

    public function initialize(): void     // Extract dispatcher info, prepareView()
    protected function prepareView(): void // Timezone, license, support URL, page title
}
```

Key features: automatic view selection by controller/action; built-in AJAX response handling (JSON for AJAX, flash messages otherwise); form validation + `saveEntity()` helper; module integration via `isExternalModuleController`.

## DI Services

Registered in `Config/RegisterDIServices.php`, grouped by concern:

```
Logging:      LoggerAuthProvider, LoggerProvider
Caching:      ManagedCacheProvider, RedisClientProvider
Database:     ModelsAnnotationsProvider, ModelsMetadataProvider, MainDatabaseProvider,
              ModulesDBConnectionsProvider, CDRDatabaseProvider, RecordingStorageDatabaseProvider
Web:          DispatcherProvider, RouterProvider, UrlProvider, ViewProvider, VoltProvider,
              FlashProvider, ElementsProvider, AssetProvider, SecurityPluginProvider
Session/Sec:  SessionProvider, AclProvider, JwtProvider
Queue:        BeanstalkConnectionModelsProvider
Translation:  MessagesProvider, TranslationProvider, LanguageProvider
License/Mod:  MarketPlaceProvider, PBXConfModulesProvider
System:       RegistryProvider, CryptProvider, PBXCoreRESTClientProvider, EventBusProvider,
              WafProvider (WAF exemption registry; from Common\Providers)
```

## Frontend Architecture

### Localization Asset Cache
See root CLAUDE.md "Translation Cache Invalidation" — `AssetProvider::makeLocalizationAssets()` regenerates the cache only when the file is missing, and the version hash does NOT recompute from translation content. AdminCabinet-specific path: `sites/admin-cabinet/assets/js/cache/localization-<lang>-<version>.min.js` (the relative web path registered via `addJs()` is `js/cache/localization-<lang>-<version>.min.js`); stale entries surface as wrong `globalTranslate` values.

### JavaScript Source (`sites/admin-cabinet/assets/js/src/`)

Each section is its own JS module following an `initialize()` pattern (Advice, ApiKeys, AsteriskManagers, AsteriskRestUsers, CallDetailRecords, CallQueues, ConferenceRooms, CustomFiles, DialplanApplications, Extensions, Fail2Ban, Firewall, FormElements, GeneralSettings, IncomingRoutes, IvrMenu, Language, MailSettings, Network, PbxAPI, Security, SendMetrics, SoundFiles, SystemDiagnostic, TopMenuSearch, …).

`Advice/` has two pieces: `advice-worker.js` (bell icon, all buckets) and `update-banner.js` (GitLab-style top banner, warning-bucket only — critical/important PBX core updates, uninstalled security modules, and updates of installed security modules; surfaces only the `adv_AvailableNewVersionPBX`, `adv_AvailableNewVersionModule`, `adv_SecurityPatchAvailable` templates; dismiss persisted in localStorage keyed on `messageTpl+module+version`).

### Module Pattern

Declare jQuery properties as `null`, resolve them inside `initialize()`:

```javascript
const extensionsIndex = {
    $extensionsList: null,
    dataTable: {},
    initialize() {
        extensionsIndex.$extensionsList = $('#extensions-table');
        extensionsIndex.initializeDataTable();
    },
};
$(document).ready(() => extensionsIndex.initialize());
```

**Never call `$()` in top-level object-literal initialisers.** Issue #1054 (Sentry MIKOPBX-MG9) was caused by `$formObj: $('#login-form')` in the literal of `loginForm`: `$()` runs at script-parse time, so if jQuery hasn't bound `window.$` yet (extensions, slow CDN, CSP-induced reorder) the whole module throws `ReferenceError: $ is not defined` and never publishes `initialize()`. Always declare jQuery properties as `null` and assign them inside `initialize()` (or via a lazy getter for objects used without an explicit init step, e.g. `UserMessage.getMessagesDiv()`).

### Form Handling

Forms use the centralized `Form` object with Fomantic UI validation. In `initializeForm()`, set `Form.$formObj`, `Form.url` (e.g. `${globalRootUrl}extensions/save`), `Form.validateRules`, `Form.cbBeforeSendForm`, `Form.cbAfterSendForm`, then `Form.initialize()`. Rules use Fomantic identifiers and `globalTranslate.*` prompts, e.g.:

```javascript
validateRules: {
    number: {
        identifier: 'number',
        rules: [
            { type: 'empty', prompt: globalTranslate.ex_ValidateNumberIsEmpty },
            { type: 'existRule[number-error]', prompt: globalTranslate.ex_ValidateNumberIsDouble },
        ],
    },
},
```

### API Communication

All API calls go through the centralized `PbxApi`, e.g. `PbxApi.ExtensionsDeleteRecord(id, cb)`. Callbacks reload the DataTable on success (`dataTable.ajax.reload()`) and surface errors via `UserMessage.showMultiString(response.messages)`.

## ACL System

**Server-side (Volt):** wrap controls in `{% if isAllowed('save') %}…{% endif %}`.

**Client-side (JS):** the `ACLHelper` global reads `window.CurrentPageACL` — `ACLHelper.canSave()`, `canDelete()`, and `applyPermissions({ save: { show: '#submitbutton', enable: '#form' }, delete: { show: '.delete-button' } })`.

Standard actions: `index`, `modify`, `save`, `delete`, `copy`, `download`, `restore`, `edit`, `modifyiax`, `modifysip`.

## Filter Persistence Pattern

sessionStorage-based state with a `#reset-cache` hash trigger:

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
    // Save/load/clear via sessionStorage with try-catch.
    // Restore in DataTable initComplete; save on draw (skip while !isInitialized).
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
