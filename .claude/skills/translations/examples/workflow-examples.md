# MikoPBX Translation Workflow Examples

Real-world scenarios for managing translations in MikoPBX.

## Workflow 1: Adding New Feature Translations

### Scenario
You're implementing a new "API Key Permissions" feature and need to add 10 new translation keys.

### Step-by-Step

**1. Determine Module and Prefix**
```
Feature: API Key Permissions
Module: API Keys
Prefix: ak_
File: ApiKeys.php
```

**2. Add to Russian (`ru/ApiKeys.php`)**

```php
<?php
// ... existing translations

// API Key Permissions (new feature)
'ak_PermissionsTitle' => 'Разрешения API ключа',
'ak_PermissionsDesc' => 'Настройте доступ к конкретным API эндпоинтам',
'ak_PermissionRead' => 'Чтение',
'ak_PermissionWrite' => 'Запись',
'ak_PermissionDelete' => 'Удаление',
'ak_PermissionAll' => 'Полный доступ',
'ak_NoPermissions' => 'Нет разрешений',
'ak_SavePermissions' => 'Сохранить разрешения',
'ak_PermissionsUpdated' => 'Разрешения успешно обновлены',
'ak_ErrorPermissions' => 'Ошибка при сохранении разрешений',
```

**3. Translate to All Languages**

Use AI translation (see [ai-prompts.md](../reference/ai-prompts.md)) or wait for Weblate sync.

**4. Validate Consistency**

```bash
# Check all languages have same key count
for lang in en es fr de th ja; do
  count=$(php -r "echo count(include 'src/Common/Messages/$lang/ApiKeys.php');")
  echo "$lang: $count keys"
done
```

**5. Clear Cache and Test**

```bash
# Clear Redis
docker exec mikopbx redis-cli FLUSHDB

# Restart container
docker restart mikopbx

# Test in UI
# Navigate to API Keys → Permissions tab
# Verify all labels appear correctly
```

---

## Workflow 2: Creating New Translation Module

### Scenario
You're adding a "Call Recording" module that needs its own translation file.

### Step-by-Step

**1. Choose Prefix and Filename**
```
Module: Call Recording
Prefix: rec_
File: CallRecording.php
```

**2. Create Russian Template**

```php
<?php
/**
 * Call Recording translations
 */

return [
    // REC - Call Recording module
    'rec_ModuleTitle' => 'Запись звонков',
    'rec_ModuleDesc' => 'Автоматическая запись телефонных разговоров',
    'rec_EnableRecording' => 'Включить запись',
    'rec_RecordingPath' => 'Путь для сохранения записей',
    'rec_RetentionDays' => 'Хранить записи (дней)',
    'rec_RecordIncoming' => 'Записывать входящие',
    'rec_RecordOutgoing' => 'Записывать исходящие',
    'rec_RecordInternal' => 'Записывать внутренние',
    'rec_ErrorPathNotWritable' => 'Путь недоступен для записи',
    'rec_SuccessfullySaved' => 'Настройки записи сохранены',
];
```

**3. Save to `src/Common/Messages/ru/CallRecording.php`**

**4. Create Files for All 28 Other Languages**

Option A: Use placeholder values initially
```php
// en/CallRecording.php (placeholder)
return [
    'rec_ModuleTitle' => 'rec_ModuleTitle',
    'rec_ModuleDesc' => 'rec_ModuleDesc',
    // ... etc
];
```

Option B: Use AI to translate immediately (recommended)
```bash
# Use translation skill to batch-translate to all languages
```

**5. Verify File Auto-Loading**

```bash
# Restart container
docker restart mikopbx

# Check translation is loaded
docker exec mikopbx php -r "echo \Phalcon\Di::getDefault()->get('translation')->_('rec_ModuleTitle');"
```

---

## Workflow 3: Mass Translation Update

### Scenario
Russian file updated with 50 new keys. Need to translate to all 28 languages.

### Step-by-Step

**1. Extract New Keys**

```bash
# Compare Russian with English to find new keys
comm -23 \
  <(php -r "print_r(array_keys(include 'src/Common/Messages/ru/Extensions.php'));" | sort) \
  <(php -r "print_r(array_keys(include 'src/Common/Messages/en/Extensions.php'));" | sort)
```

**2. Prepare Translation Batches**

Split into batches of 50 keys to avoid AI context overflow.

**3. Translate Each Language**

```bash
# For each language: en, es, fr, de, ...
# Use AI prompt from ai-prompts.md
# Add translated keys to language file
```

**4. Validation Script**

```bash
#!/bin/bash
# validate_translations.sh

RUSSIAN_FILE="src/Common/Messages/ru/Extensions.php"
RU_COUNT=$(php -r "echo count(include '$RUSSIAN_FILE');")

echo "Russian baseline: $RU_COUNT keys"
echo "Checking other languages..."

for lang in en es fr de el he hr hu it ja ka nl pl pt pt_BR ro sv th tr uk vi zh_Hans az cs da fi fa; do
  LANG_FILE="src/Common/Messages/$lang/Extensions.php"
  if [ -f "$LANG_FILE" ]; then
    LANG_COUNT=$(php -r "echo count(include '$LANG_FILE');")
    if [ "$LANG_COUNT" -eq "$RU_COUNT" ]; then
      echo "✅ $lang: $LANG_COUNT keys (matches)"
    else
      echo "❌ $lang: $LANG_COUNT keys (expected $RU_COUNT)"
    fi
  else
    echo "⚠️  $lang: FILE MISSING"
  fi
done
```

**5. Test Translations**

```bash
# Clear cache
docker exec mikopbx redis-cli FLUSHDB

# Switch browser language and verify
# Check UI in multiple languages
```

---

## Workflow 4: Removing Obsolete Translations

### Scenario
Feature removed. Need to delete 15 translation keys from all languages.

### Step-by-Step

**1. Identify Keys to Remove**

```bash
# Search codebase to verify keys are not used
grep -r "ex_DeprecatedFeature" src/
grep -r "ex_OldTooltip" src/
```

**2. Remove from Russian First**

```php
// ru/Extensions.php
// DELETE these lines:
// 'ex_DeprecatedFeature' => '...',
// 'ex_OldTooltip' => '...',
```

**3. Remove from All Other Languages**

```bash
#!/bin/bash
# remove_keys.sh

KEYS_TO_REMOVE=(
  "ex_DeprecatedFeature"
  "ex_OldTooltip"
)

for lang in en es fr de /* ... all languages */; do
  FILE="src/Common/Messages/$lang/Extensions.php"
  for key in "${KEYS_TO_REMOVE[@]}"; do
    # Remove line containing key
    sed -i "/'$key'/d" "$FILE"
  done
  echo "✅ Removed keys from $lang"
done
```

**4. Validate Removal**

```bash
# Verify keys are gone
grep -r "ex_DeprecatedFeature" src/Common/Messages/
# Should return no results
```

**5. Test Application**

```bash
# Ensure no broken translation references
# Check for missing translation warnings in logs
docker exec mikopbx tail -f /storage/usbdisk1/mikopbx/log/php/error.log
```

---

## Workflow 5: Fixing Inconsistent Translations

### Scenario
Consistency check found 3 languages with missing keys, 2 with extra keys.

### Step-by-Step

**1. Generate Consistency Report**

```bash
#!/bin/bash
# consistency_check.sh

RUSSIAN_KEYS=$(php -r "print_r(array_keys(include 'src/Common/Messages/ru/ApiKeys.php'));" | sort)

for lang in en es fr de th ja; do
  LANG_KEYS=$(php -r "print_r(array_keys(include 'src/Common/Messages/$lang/ApiKeys.php'));" | sort)

  echo "=== $lang ==="

  # Missing keys
  MISSING=$(comm -23 <(echo "$RUSSIAN_KEYS") <(echo "$LANG_KEYS"))
  if [ -n "$MISSING" ]; then
    echo "Missing keys:"
    echo "$MISSING"
  fi

  # Extra keys
  EXTRA=$(comm -13 <(echo "$RUSSIAN_KEYS") <(echo "$LANG_KEYS"))
  if [ -n "$EXTRA" ]; then
    echo "Extra keys:"
    echo "$EXTRA"
  fi

  echo ""
done
```

**2. Fix Missing Keys**

```bash
# For each missing key in Thai (th)
# 1. Get Russian value
# 2. Translate using AI
# 3. Add to th/ApiKeys.php
```

**3. Remove Extra Keys**

```bash
# For each extra key in Japanese (ja)
# 1. Verify it's truly obsolete in Russian
# 2. Remove from ja/ApiKeys.php
```

**4. Re-run Consistency Check**

```bash
# Verify all languages now match
./consistency_check.sh
```

---

## Workflow 6: Emergency Translation Fix

### Scenario
Production bug: Russian string has typo. Need to fix across all languages ASAP.

### Step-by-Step

**1. Identify the Issue**

```bash
# Bug report: "API kye" instead of "API key" in error message
# Key: api_InvalidApiKey
```

**2. Fix Russian**

```php
// ru/RestApi.php
- 'api_InvalidApiKey' => 'Неверный API kye',  // ❌ Typo
+ 'api_InvalidApiKey' => 'Неверный API ключ', // ✅ Fixed
```

**3. Fix English**

```php
// en/RestApi.php
- 'api_InvalidApiKey' => 'Invalid API kye',  // ❌ Typo
+ 'api_InvalidApiKey' => 'Invalid API key',  // ✅ Fixed
```

**4. Check Other Languages**

```bash
# If typo was propagated to other languages, fix them too
grep "API kye" src/Common/Messages/*/RestApi.php
```

**5. Deploy Hotfix**

```bash
# Commit fix
git add src/Common/Messages/*/RestApi.php
git commit -m "fix: correct 'API key' typo in translations"

# Deploy
docker cp src/Common/Messages mikopbx:/var/www/mikopbx/src/Common/
docker exec mikopbx redis-cli FLUSHDB
docker restart mikopbx
```

---

## Common Patterns

### Pattern: Add Single Key

```bash
1. Edit ru/[Module].php → add key
2. Translate to all languages (AI or Weblate)
3. Clear cache
4. Test in UI
```

### Pattern: Batch Add (10+ keys)

```bash
1. Add all keys to ru/[Module].php
2. Split into batches (50 keys max)
3. Use AI to translate each batch
4. Merge translations into language files
5. Run consistency check
6. Clear cache and test
```

### Pattern: Remove Keys

```bash
1. Verify keys are unused (grep codebase)
2. Remove from ru/[Module].php
3. Remove from all 28 other languages
4. Validate removal (grep to confirm gone)
5. Test application (check for missing key errors)
```

### Pattern: Rename Keys

```bash
1. Add new keys to ru/[Module].php
2. Translate new keys to all languages
3. Update code to use new keys
4. Test with new keys
5. Remove old keys from all languages
6. Final test
```

---

## Tips for Efficient Translation

1. **Batch operations** - Don't translate one key at a time
2. **Use AI for speed** - Weblate is slower but more accurate for complex text
3. **Always validate** - Check key counts match across all languages
4. **Test early** - Don't wait until all 29 languages are done
5. **Version control** - Commit after each major translation batch
6. **Clear caches** - Translation changes won't appear without cache clear
7. **Check logs** - Missing translation keys appear in error logs
