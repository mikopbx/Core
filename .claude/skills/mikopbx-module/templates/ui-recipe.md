# Template: UI Recipe Files

## Before generating, READ these canonical examples:

- Controller: `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/App/Controllers/ModuleExampleFormController.php`
- Base Controller: `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/App/Controllers/ExampleFormBaseController.php`
- Form: `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/App/Forms/ModuleExampleFormForm.php`
- View: `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/App/Views/ModuleExampleForm/index.volt`
- AssetProvider: `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/App/Providers/AssetProvider.php`
- MenuProvider: `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/App/Providers/MenuProvider.php`
- JavaScript: `Extensions/EXAMPLES/WebInterface/ModuleExampleForm/public/assets/js/src/module-example-form.js`

## File Inventory

When `ui` recipe is selected, generate ALL of these files:

1. `App/Controllers/{Feature}BaseController.php`
2. `App/Controllers/Module{Feature}Controller.php`
3. `App/Forms/Module{Feature}Form.php`
4. `App/Views/Module{Feature}/index.volt`
5. `App/Providers/AssetProvider.php`
6. `App/Providers/MenuProvider.php`
7. `public/assets/js/src/module-{kebab}.js`
8. `public/assets/css/module-{kebab}.css`

## Key Patterns

### Controller

```php
// Namespace: Modules\Module{Feature}\App\Controllers
// Extends: {Feature}BaseController (which extends AdminCabinet\Controllers\BaseController)
// Standard actions: indexAction(), saveAction(), deleteAction()
```

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
