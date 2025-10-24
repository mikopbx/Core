# RestApi.php Translation Guide

## Overview

The RestApi.php file contains **1962 translation keys** for the MikoPBX REST API documentation and messages. This is the largest translation file in the project.

## Current Status

### Russian Source
- **File:** `/src/Common/Messages/ru/RestApi.php`
- **Keys:** 1962
- **Status:** Complete (authoritative source)

### Existing Translations
Languages with partial translations:
- Czech (cs): 251 keys → **1711 missing**
- German (de): 210 keys → **1752 missing**
- English (en): 251 keys → **1711 missing**
- Spanish (es): 210 keys → **1752 missing**
- French (fr): 210 keys → **1752 missing**
- Italian (it): 210 keys → **1752 missing**
- Dutch (nl): 251 keys → **1711 missing**
- Polish (pl): 251 keys → **1711 missing**
- Portuguese (pt): 210 keys → **1752 missing**
- Portuguese Brazil (pt_BR): 251 keys → **1711 missing**
- Romanian (ro): 100 keys → **1862 missing**

### Missing Translations
Languages that need new files created (0 keys → **1962 missing** each):
- Azerbaijani (az)
- Danish (da)
- Greek (el)
- Persian (fa)
- Finnish (fi)
- Hebrew (he)
- Croatian (hr)
- Hungarian (hu)
- Japanese (ja)
- Georgian (ka)
- Swedish (sv)
- Thai (th)
- Turkish (tr)
- Ukrainian (uk)
- Vietnamese (vi)
- Simplified Chinese (zh_Hans)

**Total translations needed:** ~52,000 keys across all languages

## Translation Complexity

The RestApi.php file contains:
- API endpoint descriptions (long, technical)
- OpenAPI documentation strings
- Error messages
- Success messages
- Parameter descriptions
- Schema descriptions
- Example values

Many values are 200-500 characters long with technical terminology.

## Recommended Approach

### Option 1: Professional Translation Service (Recommended)
Use Weblate integration:
1. Push Russian source to https://weblate.mikopbx.com
2. Professional translators handle batch translation
3. Review and approve translations
4. Pull completed translations back to repository

**Advantages:**
- Professional quality
- Consistent terminology
- Human review
- Handles complexity well

### Option 2: AI-Assisted Batch Translation
For internal/development use:

1. **Extract missing keys per language:**
   ```bash
   php .claude/auto_translate_restapi.php en > /tmp/en_missing.txt
   ```

2. **Translate in batches using AI:**
   - Split into 50-100 key batches
   - Use Claude/GPT-4 with proper prompts
   - Maintain technical terminology
   - Preserve placeholders

3. **Merge translations back:**
   ```bash
   php .claude/merge_restapi_translations.php en translated_batch.php
   ```

4. **Validate:**
   ```bash
   php -l src/Common/Messages/en/RestApi.php
   php .claude/validate_translations.php en
   ```

### Option 3: Hybrid Approach
1. Translate English (en) first using AI (1711 keys)
2. Use English as bridge language for other translations
3. Professional review of English version
4. Machine translate from English to other languages
5. Human review of critical languages (de, es, fr, it)

## Tools Created

### 1. `auto_translate_restapi.php`
Analyzes translation status and exports missing keys for translation.

Usage:
```bash
php .claude/auto_translate_restapi.php <lang_code>
```

### 2. `temp_restapi_translator.php`
Helper script for analysis and batch extraction.

Usage:
```bash
# Analyze status
./claude/temp_restapi_translator.php en analyze

# Extract batch for translation
./.claude/temp_restapi_translator.php en extract 1 50
```

### 3. `translate_restapi_batch.php`
Displays translation batches with guidelines.

Usage:
```bash
php .claude/translate_restapi_batch.php en 1 100
```

## Translation Guidelines

### Technical Terms (Never Translate)
Keep these unchanged in ALL languages:
```
SIP, IAX, IAX2, PJSIP, AMI, ARI, AJAM
PBX, VoIP, CDR, IVR, DID, CID
NAT, STUN, TURN, RTP, SRTP
HTTP, HTTPS, REST, API, JWT, WebAuthn
DTMF, codec, trunk, extension
OAuth2, FIDO2, WebSocket
Asterisk, MikoPBX
```

### Placeholder Format
Always preserve the exact placeholder format:
```php
// Russian
'msg_Example' => 'User %username% has %count% calls'

// Translated (placeholders unchanged)
'msg_Example' => 'Benutzer %username% hat %count% Anrufe'
```

### Quote Escaping
Properly escape quotes for PHP:
```php
// Correct
'msg' => 'User said: "Don\'t forget"'

// Wrong (breaks PHP)
'msg' => 'User said: "Don't forget"'
```

### Long Descriptions
Many RestApi values are 200-500 characters. Maintain:
- Professional technical tone
- Accurate terminology
- Similar length (±20%)
- Paragraph structure

Example:
```php
'rest_ApiKeys_ApiDescription' => 'Комплексное управление API ключами для безопасного доступа к REST API. Включает генерацию JWT токенов, управление разрешениями, ограничение endpoints, сетевую фильтрацию и управление жизненным циклом ключей. API ключи обеспечивают безопасный программный доступ к REST API АТС с детальным контролем доступа.',
```

Should translate to similar-length professional description.

## Validation Checklist

Before committing translations:

- [ ] All 1962 keys present in target file
- [ ] No duplicate keys
- [ ] PHP syntax valid: `php -l file.php`
- [ ] Technical terms preserved
- [ ] Placeholders unchanged
- [ ] Quotes properly escaped
- [ ] File encoding UTF-8
- [ ] File ends with newline
- [ ] Proper PHP array structure

## Performance Considerations

The RestApi.php file is loaded on every REST API request. Translation quality affects:
- API documentation accuracy
- OpenAPI schema generation
- Error message clarity
- Developer experience

## Priority Languages

Recommended translation priority:
1. **English (en)** - International standard
2. **German (de)** - Large user base
3. **Spanish (es)** - Wide reach
4. **French (fr)** - Business importance
5. **Italian (it)** - European market
6. **Portuguese (pt/pt_BR)** - Brazil market
7. Other languages as needed

## Timeline Estimates

### Using AI Translation (per language)
- Extract missing keys: 5 minutes
- Translate in batches (50 keys/batch): ~35 batches × 10 min = 6 hours
- Merge and validate: 30 minutes
- **Total per language: ~7 hours**

### Using Professional Service
- Setup and export: 1 hour
- Translation time: 2-4 weeks
- Review and import: 2-3 hours
- **Total: 2-4 weeks** (but parallel for all languages)

## Next Steps

1. **Immediate:** Decide on translation approach
2. **Short-term:** Complete English translation (highest priority)
3. **Medium-term:** Complete de, es, fr, it translations
4. **Long-term:** Complete all 27 languages

## Questions?

Contact the MikoPBX development team or refer to the main translation documentation at:
- Weblate: https://weblate.mikopbx.com
- Translation skill: `.claude/skills/translations/SKILL.md`
