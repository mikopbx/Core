# Template: UI Recipe Files

## Before generating, READ these canonical examples:

- Controller: `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/App/Controllers/ModuleExampleFormController.php`
- Base Controller (only when shared controller logic exists): `Extensions/ModuleLocalSpeechToText/App/Controllers/LocalSpeechToTextBaseController.php`
- Form: `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/App/Forms/ModuleExampleFormForm.php`
- View: `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/App/Views/ModuleExampleForm/index.volt`
- AssetProvider (optional pattern): `Extensions/ModuleLocalSpeechToText/App/Providers/AssetProvider.php`
- MenuProvider (optional pattern): `Extensions/ModuleLocalSpeechToText/App/Providers/MenuProvider.php`
- JavaScript: `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/public/assets/js/src/module-example-form-index.js`

NOTE: `ModuleExampleForm` has no per-module `App/Providers/` classes — its
`App/Providers/` directory holds only `.gitkeep`, and it registers assets
inline in the controller via the **core** `MikoPBX\AdminCabinet\Providers\AssetProvider`
constants (`HEADER_CSS`, `FOOTER_JS`). Per-module provider classes are an
optional convenience used by `ModuleLocalSpeechToText`, `ModuleRemoteSupport`
and `ModuleAiSupervisor`.

## File Inventory

When `ui` recipe is selected, generate these files:

1. `App/Controllers/Module{Feature}Controller.php`
2. `App/Controllers/{Feature}BaseController.php` — only when there is shared
   controller logic to hold (see "Base controller" below); skip it otherwise
3. `App/Forms/Module{Feature}Form.php`
4. `App/Views/Module{Feature}/index.volt`
5. `public/assets/js/src/module-{kebab}-{action}.js` (one file per controller action)
6. `public/assets/css/module-{kebab}-{action}.css`

Optional — only when the module has several pages or a long asset list, and
only if the user agrees:

7. `App/Providers/AssetProvider.php` — static `addCss()` / `addJs()` helpers
   wrapping the core `AssetProvider` collections
8. `App/Providers/MenuProvider.php` — path constants for the module's pages

Default (single-page module): register assets directly in the controller,
exactly as `ModuleExampleFormController` does.

## Key Patterns

### Controller

```php
// Namespace: Modules\Module{Feature}\App\Controllers
// Extends (default): MikoPBX\AdminCabinet\Controllers\BaseController
// Extends (only if the module has one): {Feature}BaseController,
//         which itself extends MikoPBX\AdminCabinet\Controllers\BaseController
// Standard actions: indexAction(), saveAction(), deleteAction()
```

Keep `indexAction()` limited to registering assets and assigning view
variables. Store its template at
`App/Views/Module{Feature}/index.volt`; `BaseController::beforeExecuteRoute()`
automatically resolves it as
`Modules/Module{Feature}/Module{Feature}/index`.

When an explicit template override is required, use the complete module cache
path beginning with `Modules/Module{Feature}/`. A relative call such as
`$this->view->pick('Module{Feature}/index')` searches the core AdminCabinet
view root and renders an empty module body.

### Base controller — when to generate one

Default: every module controller extends the core
`MikoPBX\AdminCabinet\Controllers\BaseController` directly. Page count is not
the criterion — `ModuleExampleForm`, `ModuleTemplate`, `ModuleAutoDialer` and
`ModuleQualityAssessment` each ship two controllers and still extend the core
class directly.

Generate `{Feature}BaseController` only when there is shared controller logic to
put in it: a common `initialize()` (logo path, `submitMode`, `moduleDir`) plus
shared helpers such as `addModuleAssets()`, form building or data lookups. That
happens either because several controllers reuse it (`ModuleUsersUI` — seven
controllers extend `ModuleUsersUIBaseController`) or to keep that boilerplate
out of one large controller (`ModuleLocalSpeechToText`, `ModuleRemoteSupport`,
`ModuleAiSupervisor`, `ModuleRoutingMap`). Such a base controller always extends
`MikoPBX\AdminCabinet\Controllers\BaseController`.

### View (Volt)

```volt
{# Standard module page layout #}
{% extends 'Modules/index.volt' %}

{% block title %}{{ t._('Breadcrumb{ModuleID}') }}{% endblock %}

{% block content %}
<form class="ui large grey segment form" id="module-{kebab}-form">
    {{ form.render('id') }}
    {# Form fields here #}
    <div class="ui submit button" id="submitbutton">{{ t._('bt_Save') }}</div>
</form>
{% endblock %}
```

### JavaScript (ES6+)

```javascript
// Follow ModuleExampleForm JS structure
// Uses jQuery + Fomantic-UI
// Initialize on document ready
// Form validation via Fomantic-UI rules
// AJAX save via PbxApi
```

### CSS

```css
/* Minimal module-specific styles */
/* Use Fomantic-UI classes for layout */
```

## Post-Generation

After creating JS source file, run babel transpilation:
```bash
# Via /babel-compiler skill
```
