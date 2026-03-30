# MikoPBX Module Structure (2025.1.1+)

## Standard Directory Layout

```
Module{Feature}/
├── module.json                           # Module metadata (required)
├── Setup/
│   └── PbxExtensionSetup.php             # Install/uninstall (required)
├── Lib/
│   ├── {Feature}Conf.php                 # Config hooks (required)
│   ├── {Feature}Main.php                 # Business logic (optional)
│   └── RestAPI/                          # REST API v3 (optional)
│       └── {Resource}/
│           ├── Controller.php            # HTTP interface (attributes)
│           ├── Processor.php             # Request router
│           ├── DataStructure.php         # Parameter schema
│           └── Actions/
│               ├── GetListAction.php
│               ├── GetRecordAction.php
│               ├── SaveRecordAction.php
│               └── DeleteRecordAction.php
├── Models/
│   └── {Entity}.php                      # Phalcon model(s)
├── App/                                  # Admin UI (optional)
│   ├── Controllers/
│   │   ├── {Feature}BaseController.php
│   │   └── Module{Feature}Controller.php
│   ├── Forms/
│   │   └── Module{Feature}Form.php
│   ├── Providers/
│   │   ├── AssetProvider.php
│   │   └── MenuProvider.php
│   └── Views/
│       └── Module{Feature}/
│           └── index.volt
├── bin/                                  # Workers (optional)
│   └── Worker{Feature}{Type}.php
├── agi-bin/                              # AGI scripts (optional)
│   └── {script-name}.php
├── public/                               # Static assets (optional)
│   └── assets/
│       ├── js/
│       │   └── src/
│       │       └── module-{kebab}.js     # ES6+ source
│       ├── css/
│       │   └── module-{kebab}.css
│       └── img/
│           └── logo.svg
├── Messages/                             # Translations (required)
│   ├── ru.php
│   ├── en.php
│   └── ... (29 languages total)
└── db/                                   # Runtime data (auto-created)
```

## Required Files (every module)

1. **module.json** — Module identity and version
2. **Setup/PbxExtensionSetup.php** — Database schema, registration, sidebar menu
3. **Lib/{Feature}Conf.php** — Hook implementations (even if empty)
4. **Models/{Entity}.php** — At least one model for settings
5. **Messages/ru.php** — Russian translations (primary language)

## File Dependencies

```
module.json
    ↓ (read by installer)
Setup/PbxExtensionSetup.php
    ↓ (creates tables from)
Models/*.php
    ↓ (registered in DI, hooks loaded from)
Lib/{Feature}Conf.php
    ↓ (delegates to)
Lib/{Feature}Main.php
    ↓ (optionally provides)
Lib/RestAPI/*/Controller.php → auto-discovered
bin/Worker*.php → registered via getModuleWorkers()
agi-bin/*.php → symlinked via createAgiBinSymlinks()
App/ → symlinked via createViewSymlinks()
public/ → symlinked via createAssetsSymlinks()
```

## Symlink Targets (created on enable)

| Source | Target |
|--------|--------|
| `public/assets/js` | `/sites/admin-cabinet/assets/js/cache/{ModuleID}` |
| `public/assets/css` | `/sites/admin-cabinet/assets/css/cache/{ModuleID}` |
| `public/assets/img` | `/sites/admin-cabinet/assets/img/cache/{ModuleID}` |
| `agi-bin/*` | `/var/lib/asterisk/agi-bin/` |
| `App/Views/*` | Admin cabinet views directory |

## Installed Location

Modules are deployed to:
```
/var/www/mikopbx/modules/{ModuleID}/
```

Module database is stored in:
```
/var/www/mikopbx/modules/{ModuleID}/db/module.db
```
