---
name: mikopbx-module
description: Генерация и доработка модулей MikoPBX. Создание новых модулей по описанию на естественном языке, добавление функциональности в существующие модули, оптимизация и унификация кода модулей. Использовать когда пользователь хочет создать новый модуль, добавить фичу в модуль, оптимизировать модуль или узнать как устроена система модулей.
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Agent
---

# MikoPBX Module Generator & Optimizer

Создание, доработка и оптимизация модулей для MikoPBX 2025.1.1+.

## What This Skill Does

1. **Создание новых модулей** — по описанию на естественном языке генерирует полную структуру модуля с нужными интеграционными паттернами
2. **Доработка существующих модулей** — добавляет новую функциональность (REST API, workers, dialplan hooks и т.д.)
3. **Оптимизация и унификация** — находит антипаттерны и приводит код к эталонным стандартам
4. **Консультация** — отвечает на вопросы по архитектуре модулей

## When to Use

- "Создай модуль для ..." / "Create module for ..."
- "Добавь REST API в ModuleXxx" / "Add REST API to ModuleXxx"
- "Оптимизируй ModuleXxx" / "Optimize ModuleXxx"
- "Как сделать ... в модуле?" / "How to ... in a module?"
- Любые запросы про создание, доработку или архитектуру модулей MikoPBX

## Target Platform

```
PHP: 8.3
min_pbx_version: 2025.1.1
Framework: Phalcon 5.8
NO legacy compatibility (no MikoPBXVersion.php)
```

## Core Workflow

### Mode 1: Create New Module

#### Phase 1 — Discovery Dialog

Parse user's natural language description and determine:

1. **Module purpose** — what problem it solves
2. **Module name** — suggest `ModuleXxxYyy` following MikoPBX conventions
3. **Target location** — ask user:
   - `Extensions/` — for production modules
   - `Extensions/EXAMPLES/{Category}/` — for example/learning modules
4. **Required recipes** — analyze description and propose:

| Recipe | Trigger words / signals |
|--------|------------------------|
| base (always) | — |
| ui | "настройки", "страница", "форма", "интерфейс", "settings", "page", "UI" |
| rest-api | "API", "REST", "эндпоинт", "endpoint", "CRUD" |
| dialplan | "звонки", "маршрут", "IVR", "входящие", "исходящие", "calls", "routing" |
| agi | "AGI", "скрипт", "lookup", "CallerID", "перед набором" |
| workers | "фоновый", "воркер", "очередь", "события", "background", "worker", "queue", "events" |
| firewall | "порт", "фаервол", "fail2ban", "безопасность", "firewall", "port" |
| acl | "доступ", "права", "роли", "ACL", "permissions", "roles" |
| system | "cron", "nginx", "периодический", "запуск", "scheduled" |

5. **Confirm plan** — present proposed structure and get user approval before generating

**Ask many questions!** It's better to clarify intent than to guess wrong. Examples:
- "Модуль будет иметь свою страницу настроек в админке?"
- "Нужен ли REST API для внешних интеграций?"
- "Модуль должен реагировать на события звонков?"
- "Есть ли данные, которые нужно хранить в базе?"

#### Phase 2 — Generation

Generate files using reference templates in `templates/` directory. For each recipe, create the corresponding files.

**File generation order:**

1. `module.json` — module metadata
2. `Setup/PbxExtensionSetup.php` — installer
3. `Models/*.php` — database models
4. `Lib/{Name}Conf.php` — configuration class with hooks
5. `Lib/{Name}Main.php` — business logic (if needed)
6. `App/Controllers/` — web controllers (if ui recipe)
7. `App/Forms/` — Phalcon forms (if ui recipe)
8. `App/Views/` — Volt templates (if ui recipe)
9. `App/Providers/` — Asset and Menu providers (if ui recipe)
10. `public/assets/js/src/` — ES6+ JavaScript (if ui recipe)
11. `public/assets/css/` — CSS styles (if ui recipe)
12. `Lib/RestAPI/` — REST API controllers and actions (if rest-api recipe)
13. `bin/` — Worker scripts (if workers recipe)
14. `agi-bin/` — AGI scripts (if agi recipe)
15. `Messages/` — Translation files (call `/translations` skill)

**Code references:** When generating code, study existing EXAMPLES for patterns:
- REST API v3: `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/`
- Web UI: `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/`
- AMI Workers: `Extensions/EXAMPLES/AMI/ModuleExampleAmi/`
- REST API v1/v2: `Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv{1,2}/`

Read the actual source code from these examples before generating — they are the canonical reference.

#### Phase 3 — Post-Generation Checks

After generating all files, run:

```bash
# 1. PHP syntax check on all generated PHP files
find {module_dir} -name "*.php" -exec php -l {} \;

# 2. Babel transpilation for JS files (if ui recipe)
# Use /babel-compiler skill

# 3. module.json validation
php -r "json_decode(file_get_contents('{module_dir}/module.json'), true) ?: exit(1);"
```

Report results and suggest fixes for any issues found.

#### Phase 4 — Report

```
Module: ModuleBlackList
Location: Extensions/ModuleBlackList/
Recipes: base, ui, rest-api, dialplan, agi

Files created:
  Setup/PbxExtensionSetup.php
  Lib/BlackListConf.php
  Lib/BlackListMain.php
  Models/BlackListNumbers.php
  App/Controllers/ModuleBlackListController.php
  App/Forms/ModuleBlackListForm.php
  App/Views/ModuleBlackList/index.volt
  App/Providers/AssetProvider.php
  App/Providers/MenuProvider.php
  public/assets/js/src/module-black-list.js
  public/assets/css/module-black-list.css
  Lib/RestAPI/Numbers/Controller.php
  Lib/RestAPI/Numbers/Processor.php
  Lib/RestAPI/Numbers/DataStructure.php
  Lib/RestAPI/Numbers/Actions/GetListAction.php
  ...
  agi-bin/check-blacklist.php
  Messages/ru.php (+ 28 languages via /translations)
  module.json

Checks:
  PHP syntax: PASS (18/18 files)
  Babel: PASS
  module.json: VALID

Next steps:
  1. Review generated code
  2. Install module in MikoPBX
  3. Test functionality
  4. Customize business logic
```

### Mode 2: Augment Existing Module

#### Phase 1 — Analysis

1. Read module directory structure
2. Identify what's already implemented:
   - Which recipes are present
   - Which hooks are used in Conf.php
   - Models, controllers, workers count
3. Check for anti-patterns (see Anti-Patterns section)
4. Present findings to user

#### Phase 2 — Plan Changes

Based on user request, determine:
- New files to create
- Existing files to modify (especially Conf.php)
- Dependencies between changes

#### Phase 3 — Implementation

Apply changes following the same patterns as Mode 1.
When modifying Conf.php, add new hook methods without breaking existing ones.

#### Phase 4 — Optimization (if requested)

Run anti-pattern checker and suggest improvements.

### Mode 3: Optimize Module

Analyze module code against best practices:

1. **Read all module files**
2. **Check anti-patterns** (see reference/anti-patterns.md)
3. **Report findings** with severity and fix suggestions
4. **Apply fixes** if user approves

## Code Standards

### PHP 8.3 Features to Use

```php
// Typed properties (for non-model classes: Conf, Main, Worker, etc.)
public string $name = '';
public readonly string $moduleUniqueId;

// Constructor promotion
public function __construct(
    private readonly string $moduleUniqueId,
) {}

// Match expressions
$result = match($action) {
    'check' => $this->check(),
    'reload' => $this->reload(),
    default => throw new \InvalidArgumentException("Unknown action: $action"),
};

// Named arguments
PBX::dialplanReload(timeout: 30);

// Enums where appropriate
enum CallDirection: string {
    case Incoming = 'incoming';
    case Outgoing = 'outgoing';
}
```

### Phalcon ORM Model Properties (IMPORTANT)

Model column properties follow Phalcon/SQLite conventions — do NOT apply PHP 8.3 typed properties rules here:

```php
// Primary key — ALWAYS untyped
public $id;

// String columns — nullable with string default
public ?string $name = '';

// Integer columns stored as string in SQLite
public ?string $enabled = '0';

// Integer foreign keys — nullable int
public ?int $userid = null;
```

This pattern matches core models in `src/Common/Models/`. See `Extensions.php`, `Sip.php`, `CallQueues.php` for reference.

### Import Rules

```php
// CORRECT
use Phalcon\Di\Di;

// WRONG - will cause errors
use Phalcon\Di;
```

### Naming Conventions

| Entity | Pattern | Example |
|--------|---------|---------|
| Module ID | `Module{Feature}` | `ModuleBlackList` |
| Namespace | `Modules\{ModuleID}\...` | `Modules\ModuleBlackList\Lib` |
| Config class | `{Feature}Conf` | `BlackListConf` |
| Main class | `{Feature}Main` | `BlackListMain` |
| Model | `{Entity}` | `BlackListNumbers` |
| DB table | `m_{Entity}` | `m_BlackListNumbers` |
| Controller | `Module{Feature}Controller` | `ModuleBlackListController` |
| Worker | `Worker{Feature}{Type}` | `WorkerBlackListAMI` |
| JS file | `module-{kebab-case}` | `module-black-list.js` |
| CSS file | `module-{kebab-case}` | `module-black-list.css` |
| Translation prefix | `module_{feature}_` | `module_black_list_` |
| Sidebar group | `modules` or `integrations` | — |

### File Headers

All PHP files must start with:
```php
<?php

declare(strict_types=1);
```

No closing `?>` tag.

## Recipe Details

See [recipes.md](reference/recipes.md) for detailed recipe specifications.

## Hook Reference

See [hook-reference.md](reference/hook-reference.md) for complete list of 60+ hooks with signatures and examples.

## Anti-Patterns

See [anti-patterns.md](reference/anti-patterns.md) for common mistakes to detect and fix.

## Templates

See `templates/` directory for code generation templates.

## Translation Integration

After generating PHP code, invoke the `/translations` skill to create Messages files for all 29 languages.

Workflow:
1. Collect all translation keys used in generated code (controllers, views, forms)
2. Create Russian translations first (`Messages/ru.php`)
3. Call `/translations` skill to translate to remaining 28 languages

## Important Directories

- **Production modules**: `/Users/nb/PhpstormProjects/mikopbx/Extensions/`
- **Example modules**: `/Users/nb/PhpstormProjects/mikopbx/Extensions/EXAMPLES/`
- **Core module system**: `/Users/nb/PhpstormProjects/mikopbx/Core/src/Modules/`
- **Core configs**: `/Users/nb/PhpstormProjects/mikopbx/Core/src/Core/Asterisk/Configs/`

## Task Activation Patterns

This skill activates when you say:
- "Создай модуль ..." / "Create module ..."
- "Сгенерируй модуль ..." / "Generate module ..."
- "Добавь в модуль ..." / "Add to module ..."
- "Оптимизируй модуль ..." / "Optimize module ..."
- "Как сделать модуль ..." / "How to make module ..."
- "Доработай модуль ..." / "Improve module ..."
- "/mikopbx-module ..."
