# MikoPBX Translation Infrastructure

## 🚨 Golden Rule
**Add new translations ONLY to `ru/*.php`** - All other languages are automatically translated via https://weblate.mikopbx.com

## Backend (PHP)

### Standard Usage
```php
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Di\Di;

// Get translation service
$di = Di::getDefault();
$translation = $di->get(TranslationProvider::SERVICE_NAME);

// Simple translation
$message = $translation->_('gs_PasswordTooShort');

// With parameters (use %param% format in ru/*.php)
$message = $translation->_('gs_PasswordTooShort', ['min' => 8]);

// In REST API and System Classes
$message = TranslationProvider::translate('ex_ImportStatusNoChanges'));
```

### In Injectable Classes
```php
// Direct access
$message = $this->translation->_('error_message_key');
```

### Without DI Context
```php
private static function translate(string $key, array $params = []): string
{
    try {
        $di = Di::getDefault();
        $translation = $di->get(TranslationProvider::SERVICE_NAME);
        return $translation->_($key, $params);
    } catch (\Exception $e) {
        return $key; // Fallback to key
    }
}
```

## Frontend (JavaScript)

### Simple Translation
```javascript
// Pre-loaded translations
const message = globalTranslate.gs_PasswordTooShort;

// Show messages
UserMessage.showError(globalTranslate.error_message_key);
```

### With Parameters
```javascript
// Use i18n function
const message = i18n('gs_PasswordTooShort', {min: 8});

// DataTable localization
$('#table').DataTable({
    language: SemanticLocalization.dataTableLocalisation
});
```

## Adding New Translations

### 1. Add to ru.php
```php
// src/Common/Messages/ru.php
'gs_PasswordTooShort' => 'Пароль слишком короткий (минимум %min% символов)',
'api_UnknownAction' => 'Неизвестное действие',
```

### 2. Use in Code
```php
// Backend
$translation->_('gs_PasswordTooShort', ['min' => 8]);
```
```javascript
// Frontend
i18n('gs_PasswordTooShort', {min: 8});
```

## Naming Conventions

### Module Prefixes
- `gs_` - General Settings
- `ex_` - Extensions  
- `pr_` - Providers
- `fw_` - Firewall
- `api_` - API messages
- `adv_` - Advisor/Warnings
- `auth_` - Authentication
- `bt_` - Buttons
- [Full list: am_, cq_, cr_, ir_, or_, sf_, tf_, ms_, lic_, log_, bk_, upd_, sys_, msg_]
- It is good habit to create one php file for each controller/module in language folder

### Message Types
- `Validate` - Validation (e.g., `gs_ValidateEmptyPassword`)
- `Error` / `Warning` / `Info` / `Success` - Message types
- `Tooltip` - Tooltip text (e.g., `bt_ToolTipGeneratePassword`)

## Placeholder Format
Always use `%placeholder%` format:
```php
'gs_PasswordLength' => 'Длина: %length% из %max%'
```

## Quick Troubleshooting

**Translation not appearing?**
1. Check key exists in `ru/*.php`
2. Clear cache
3. Verify correct naming convention

**Placeholders not working?**
- Use `%name%` format
- Match parameter names exactly

---
**Remember**: Only edit `ru/*.php`. Weblate handles all other languages automatically!