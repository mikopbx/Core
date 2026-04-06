# MikoPBX Module Naming Conventions

## Module Identity

| Element | Convention | Example |
|---------|-----------|---------|
| Module ID | `Module{Feature}` (PascalCase) | `ModuleBlackList` |
| module.json `moduleUniqueID` | Same as Module ID | `ModuleBlackList` |
| Directory name | Same as Module ID | `Extensions/ModuleBlackList/` |

## PHP Namespaces

```
Modules\{ModuleID}\Setup        → Setup/PbxExtensionSetup.php
Modules\{ModuleID}\Lib          → Lib/{Feature}Conf.php, {Feature}Main.php
Modules\{ModuleID}\Models       → Models/{Entity}.php
Modules\{ModuleID}\App\Controllers → App/Controllers/
Modules\{ModuleID}\App\Forms    → App/Forms/
```

## Class Names

| Type | Pattern | Example |
|------|---------|---------|
| Config class | `{Feature}Conf` | `BlackListConf` |
| Main logic | `{Feature}Main` | `BlackListMain` |
| Setup class | `PbxExtensionSetup` (always) | `PbxExtensionSetup` |
| Model | `{Entity}` (singular or descriptive) | `BlackListNumbers` |
| Main controller | `Module{Feature}Controller` | `ModuleBlackListController` |
| Base controller | `{Feature}BaseController` | `BlackListBaseController` |
| Extra controller | `{Page}Controller` | `StatisticsController` |
| Form | `Module{Feature}Form` | `ModuleBlackListForm` |
| Worker | `Worker{Feature}{Type}` | `WorkerBlackListAMI` |
| REST Controller | `Controller` (in resource dir) | `Lib/RestAPI/Numbers/Controller.php` |
| REST Processor | `Processor` (in resource dir) | `Lib/RestAPI/Numbers/Processor.php` |
| REST DataStructure | `DataStructure` (in resource dir) | `Lib/RestAPI/Numbers/DataStructure.php` |
| REST Action | `{Verb}{Entity}Action` | `GetListAction`, `SaveRecordAction` |

## Database

| Element | Convention | Example |
|---------|-----------|---------|
| Table name | `m_{Entity}` (auto from model) | `m_BlackListNumbers` |
| DB connection | `{moduleId}_module_db` (auto) | `ModuleBlackList_module_db` |
| Primary key | `id` (integer, auto-increment) | — |

## Files

| Type | Pattern | Example |
|------|---------|---------|
| JS source | `public/assets/js/src/module-{kebab}.js` | `module-black-list.js` |
| JS compiled | `public/assets/js/module-{kebab}.js` | `module-black-list.js` |
| CSS | `public/assets/css/module-{kebab}.css` | `module-black-list.css` |
| AGI script | `agi-bin/{descriptive-name}.php` | `agi-bin/check-blacklist.php` |
| Worker binary | `bin/Worker{Feature}{Type}.php` | `bin/WorkerBlackListAMI.php` |
| Translation | `Messages/{lang}.php` | `Messages/ru.php` |

## Translation Keys

```php
// Module description keys (required)
"Breadcrumb{ModuleID}" => "Чёрный список"      // Sidebar title
"SubHeader{ModuleID}" => "Управление ..."        // Page subtitle
"Description{ModuleID}" => "Модуль для ..."      // Module description

// Feature keys (prefix with module-specific abbreviation)
"module_bl_NumberColumn" => "Номер"
"module_bl_ReasonColumn" => "Причина блокировки"
"module_bl_AddNumber" => "Добавить номер"
```

## REST API Paths

```
/pbxcore/api/v3/module-{kebab-case}/{resource}
/pbxcore/api/v3/module-{kebab-case}/{resource}/{id}
/pbxcore/api/v3/module-{kebab-case}/{resource}/{id}:{action}
```

Example:
```
GET    /pbxcore/api/v3/module-black-list/numbers
POST   /pbxcore/api/v3/module-black-list/numbers
GET    /pbxcore/api/v3/module-black-list/numbers/123
PUT    /pbxcore/api/v3/module-black-list/numbers/123
DELETE /pbxcore/api/v3/module-black-list/numbers/123
```

## Sidebar Menu

```php
$value = [
    'uniqid'        => $this->moduleUniqueId,
    'group'         => 'modules',           // or 'integrations', 'maintenance'
    'iconClass'     => 'ban',               // Fomantic-UI icon name
    'caption'       => "Breadcrumb{ModuleID}",
    'showAtSidebar' => true,
];
```

## Dialplan Contexts

```
[module-{kebab}-{purpose}]     → [module-black-list-check]
[module-{kebab}-incoming]      → [module-black-list-incoming]
```

## Firewall Rule Categories

```php
'Module{Feature}' => [
    'rules' => [...],
    'action' => 'allow',
]
```
