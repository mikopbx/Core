---
name: translations
description: Управление многоязычными переводами на 29 языков с приоритетом русского языка. Использовать при добавлении новых переводов, переводе на все языки, проверке консистентности или удалении устаревших ключей.
allowed-tools: Bash, Read, Grep, Glob
---

# MikoPBX Translation Managing

Translation management for the MikoPBX telephony system across 29 languages with Russian-first workflow.

## What This Skill Does

- Adds new translation keys to Russian (`ru/`) files
- Translates Russian keys to all 28 other languages using AI
- Validates translation consistency across all languages
- Removes obsolete translation keys from all languages
- Creates new translation module files

## When to Use

- Adding translations for new features or UI elements
- Translating Russian keys to all supported languages
- Checking translation consistency across languages
- Removing deprecated or unused translation keys
- Creating new translation modules for major features
- Fixing translation typos or errors
- Debugging missing translation issues

## Quick Start

### File Structure
```
src/Common/Messages/
├── ru/              ⭐ PRIMARY - Edit ONLY this
│   ├── ApiKeys.php
│   ├── Extensions.php
│   └── ... (all modules)
├── en/              🌐 Auto-translated
├── es/              🌐 Auto-translated
└── [27 more langs]  🌐 Auto-translated
```

### Golden Rule
**Developers ONLY modify Russian (`ru/*.php`) translations.**
All other languages are translated via:
- https://weblate.mikopbx.com (automatic sync)
- AI assistance (this skill)

## Core Translation Rules

### 1. Placeholder Format
**ALWAYS** use `%variable%` format:

```php
// ✅ CORRECT
'gs_PasswordLength' => 'Пароль: %length% из %max% символов'

// ❌ WRONG
'gs_PasswordLength' => 'Пароль: {length} из {max} символов'
```

### 2. Technical Terms (Never Translate)
Keep these unchanged across ALL languages:
```
SIP, IAX, AMI, AJAM, PJSIP, NAT, STUN, TURN, RTP, CDR, IVR,
DID, CID, DTMF, codec, trunk, extension, IP, DNS, VPN
```

Example:
```php
// Russian
'pr_SipProviderSettings' => 'Настройки SIP провайдера'

// Thai - SIP stays the same
'pr_SipProviderSettings' => 'การตั้งค่าผู้ให้บริการ SIP'
```

### 3. Quote Escaping
Escape quotes properly for PHP:

```php
// ✅ CORRECT
'msg_Example' => 'He said: "Don\'t forget"'

// ❌ WRONG - breaks PHP
'msg_Example' => 'He said: "Don't forget"'
```

### 4. Consistency Requirement
All languages MUST have:
- ✅ Identical translation keys
- ✅ Identical file structure
- ✅ Same placeholder names
- ✅ Same array structure

**Example:** If Russian has 157 keys in `ApiKeys.php`, ALL 28 other languages must have exactly 157 keys in `ApiKeys.php`.

## Common Tasks

### Task 1: Add New Translations (Russian Only)

**Quick workflow:**

1. Determine module and prefix (see [prefixes.md](reference/prefixes.md))
2. Read existing Russian file
3. Add new keys with proper prefix
4. Maintain alphabetical order
5. Use Edit tool to save changes

**Example:**
```php
// ru/ApiKeys.php
return [
    // ... existing keys

    // API Key Permissions (new feature)
    'ak_PermissionsTitle' => 'Разрешения API ключа',
    'ak_PermissionRead' => 'Чтение',
    'ak_PermissionWrite' => 'Запись',
];
```

**After adding:**
- Report what was added
- Remind about cache clearing
- Ready for translation to other languages

### Task 2: Translate to All Languages

**Quick workflow:**

1. Read Russian source file
2. For each of 28 languages:
   - Use AI translation (see [ai-prompts.md](reference/ai-prompts.md))
   - Batch translate (max 50 keys at once)
   - Apply localization rules
   - Add/update keys in language file
3. Validate consistency across all languages
4. Report results

**Translation with AI:**
- Keep technical terms unchanged
- Preserve `%placeholder%` format
- Adapt examples to local context (phone numbers, etc.)
- Use appropriate quotes for language

### Task 3: Check Translation Consistency

**Quick workflow:**

1. Read Russian baseline
2. Compare each language with Russian
3. Report discrepancies:
   - Missing keys
   - Extra keys
   - Key count mismatches
4. Suggest fixes

**Example report:**
```
✅ en/ApiKeys.php: 157 keys (matches)
✅ es/ApiKeys.php: 157 keys (matches)
⚠️ th/ApiKeys.php: 145 keys (12 missing)
⚠️ ja/ApiKeys.php: 160 keys (3 extra)
```

### Task 4: Remove Obsolete Translations

**Quick workflow:**

1. Ask for keys to remove
2. Verify usage in codebase (optional)
3. Remove from Russian first
4. Remove from all 28 other languages
5. Report cleanup results

### Task 5: Create New Translation File

**Quick workflow:**

1. Gather info (module name, prefix, initial keys)
2. Create Russian template with header
3. Add to `ru/[ModuleName].php`
4. Replicate to all 28 other languages
5. Report completion

## Module Prefixes

Common prefixes (see [prefixes.md](reference/prefixes.md) for complete list):

| Prefix | Module | Example |
|--------|--------|---------|
| `ak_` | API Keys | `ak_AddNewApiKey` |
| `ex_` | Extensions | `ex_AddNewExtension` |
| `pr_` | Providers | `pr_SipProviderSettings` |
| `gs_` | General Settings | `gs_PasswordLength` |
| `api_` | REST API messages | `api_UnknownError` |

**Suffix patterns:**
- `_Validate` - Validation rules
- `_Error` - Error messages
- `_Tooltip` - UI tooltips
- `_header` / `_desc` - Structured content

## Supported Languages

MikoPBX supports **29 languages**. See [language-codes.md](reference/language-codes.md) for complete list.

**Primary language:** Russian (`ru`) ⭐
**Other languages:** 28 languages from Azerbaijani to Simplified Chinese

## File Format Example

```php
<?php
/**
 * API keys translations
 */

return [
    // AK - API Keys module prefix
    'ak_AddNewApiKey' => 'Добавить API ключ',
    'ak_ApiKeyWarning' => 'Сохраните этот ключ сейчас!',

    // With placeholders
    'ak_ConfirmDelete' => 'Удалить API ключ "{0}"?',
    'gs_PasswordLength' => 'Длина: %length% из %max%',

    // Tooltip example
    'ak_ApiKeyUsageTooltip_header' => 'Использование API ключей',
    'ak_ApiKeyUsageTooltip_curl_example' => 'curl -H "Authorization: Bearer KEY" ...',
];
```

## Cache Management

Translations are cached in Redis. After changes:

```bash
# Clear Redis cache
docker exec <container_id> redis-cli FLUSHDB

# Or restart container (clears all caches)
docker restart <container_id>

# Browser cache (hard refresh)
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

## Validation Commands

```bash
# Count keys in Russian file
php -r "echo count(include 'src/Common/Messages/ru/ApiKeys.php');"

# Compare key counts across languages
for lang in en es fr de; do
  echo "$lang: $(php -r "echo count(include 'src/Common/Messages/$lang/ApiKeys.php');")"
done

# Find all translation files for a key
grep -r "ak_ApiKey" src/Common/Messages/

# Check PHP syntax
php -l src/Common/Messages/ru/ApiKeys.php
```

## Error Prevention

### Common Mistakes to Avoid

❌ **Breaking PHP syntax with quotes:**
```php
// WRONG
'msg' => 'He said: "Don't do this"'  // Breaks PHP

// CORRECT
'msg' => 'He said: "Don\'t do this"' // Escaped
```

❌ **Inconsistent placeholders:**
```php
// Russian: %username%
// WRONG translation: %user% (different name!)
// CORRECT: %username% (same name)
```

❌ **Translating technical terms:**
```php
// WRONG: 'pr_SipSettings' => 'Параметры СИП'
// CORRECT: 'pr_SipSettings' => 'Параметры SIP'
```

## Validation Checklist

Before finishing translation work:

- [ ] All 29 languages have identical file structure
- [ ] Each language has same number of keys per file
- [ ] Placeholders use `%variable%` format consistently
- [ ] Technical terms unchanged across languages
- [ ] Quotes properly escaped
- [ ] No PHP syntax errors (run `php -l`)
- [ ] Files have proper headers
- [ ] Keys follow naming conventions
- [ ] Translation cache cleared
- [ ] Tested in UI

## Reporting Format

Always provide clear, structured output:

```
🎯 Translation Task: [Task Name]

📁 Files Modified:
- ru/ApiKeys.php: +5 keys
- en/ApiKeys.php: +5 keys (translated)
- [... 27 more languages]

📊 Statistics:
- Keys added: 5
- Languages updated: 29
- Files modified: 29

✅ Validation:
- All languages consistent: YES
- Placeholder format correct: YES
- Technical terms preserved: YES
- PHP syntax valid: YES

⚠️ Next Steps:
1. Clear Redis cache
2. Clear browser cache
3. Test translations in UI
4. Commit changes if working

📝 Translation Keys Added:
1. ak_Feature - Feature description
2. ak_FeatureTooltip - Help tooltip
3. ak_ValidateFeature - Validation message
```

## Best Practices

1. **Batch Operations** - Process 50 keys at a time to avoid context overflow
2. **Incremental Validation** - Validate after each language
3. **Backup Before Changes** - Git commit before translating 100+ keys
4. **File-per-Module** - Create dedicated files for major features
5. **Consistent Naming** - Always use proper prefix
6. **Context-Aware** - Ask about feature purpose for better translations
7. **Test Early** - Test after small batches, not after everything

## Additional Resources

**Detailed References:**
- [Language Codes](reference/language-codes.md) - All 29 supported languages
- [Module Prefixes](reference/prefixes.md) - Complete prefix reference
- [AI Prompts](reference/ai-prompts.md) - AI translation templates
- [Workflow Examples](examples/workflow-examples.md) - Real-world scenarios

**External Links:**
- https://weblate.mikopbx.com - Weblate translation portal
- Phalcon Translation Docs

## Task Activation Patterns

This skill activates when you say:

- "Add translation for..."
- "Create new translation file..."
- "Translate [file] to all languages"
- "Check translation consistency"
- "Remove translation key..."
- "How do I add translations?"
- "Why is translation not showing?"
- "Translate my Russian keys"

---

**Remember:**
- 🇷🇺 Russian is PRIMARY - always edit Russian first
- 🌐 Other languages follow Russian structure exactly
- 🔧 Technical terms never translate
- 📝 Placeholders always use %format%
- 🎨 Localization adds creativity, not literal translation
- ✅ Consistency check before completing task

---

*Translation management for MikoPBX international development team* 🌍
