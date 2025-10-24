# AI Translation Prompts for MikoPBX

Templates and guidelines for using AI to translate MikoPBX interface strings.

## Standard Translation Prompt

Use this prompt structure when translating with AI assistants:

```
You are translating MikoPBX telephony system interface from Russian to [TARGET_LANGUAGE].

Rules:
1. Keep technical terms unchanged: SIP, IAX, AMI, NAT, STUN, CDR, IVR, DTMF, codec, trunk, extension, IP, DNS, VPN
2. Maintain placeholder format: %variable% (do not change placeholder names)
3. Adapt examples to local context (phone numbers, addresses, etc.)
4. Use appropriate quotes for the target language
5. Return ONLY the translated PHP array values (keep keys unchanged)
6. Maintain the same key order as the source
7. Escape quotes properly for PHP syntax

Russian source:
[paste Russian translations here]

Return format (PHP array values only):
'key1' => 'translated value 1',
'key2' => 'translated value 2',
...
```

## Language-Specific Customization

### For Right-to-Left Languages (Hebrew, Persian, Arabic)

```
Additional rules for [RTL LANGUAGE]:
- Maintain left-to-right for technical terms (SIP, API, etc.)
- Keep numbers in Western format
- Preserve placeholder positions
- Use appropriate quotation marks for the language
```

### For Asian Languages (Japanese, Chinese, Thai)

```
Additional rules for [ASIAN LANGUAGE]:
- Do not add spaces between words unless grammatically required
- Use language-appropriate number formats
- Adapt phone number examples to local format
- Use full-width characters where appropriate
```

### For European Languages

```
Additional rules for [EUROPEAN LANGUAGE]:
- Use language-specific quotation marks
- Adapt formal/informal tone as appropriate
- Use local phone number formats
- Preserve gender-neutral language where possible
```

## Example Prompts

### Translating to English

```
You are translating MikoPBX telephony system interface from Russian to English.

Rules:
1. Keep technical terms unchanged: SIP, IAX, AMI, NAT, STUN, CDR, IVR, DTMF
2. Maintain placeholder format: %variable%
3. Use American English spelling (e.g., "color" not "colour")
4. Adapt phone examples: +1 555 123-4567
5. Use double quotes "..." for quotations
6. Return only translated values, keep keys unchanged

Russian source:
'ak_ApiKeyWarning' => 'Сохраните этот ключ сейчас! В целях безопасности он больше не будет показан.',
'ak_ConfirmDelete' => 'Вы уверены, что хотите удалить API ключ "{0}"?',
'pr_SipProviderSettings' => 'Настройки SIP провайдера',

Return format:
'ak_ApiKeyWarning' => 'Save this key now! For security reasons, it will not be shown again.',
'ak_ConfirmDelete' => 'Are you sure you want to delete API key "{0}"?',
'pr_SipProviderSettings' => 'SIP provider settings',
```

### Translating to Thai

```
You are translating MikoPBX telephony system interface from Russian to Thai.

Rules:
1. Keep technical terms in English: SIP, IAX, AMI, NAT, CDR
2. Maintain placeholder format: %variable%
3. Adapt phone examples: +66 81 234 5678
4. Use Thai quotation marks for emphasis
5. Do not add spaces between Thai words
6. Return only translated values

Russian source:
'ex_ExampleMobile' => 'например: +7 926 123-45-67',
'pr_SipProviderSettings' => 'Настройки SIP провайдера',

Return format:
'ex_ExampleMobile' => 'เช่น: +66 81 234 5678',
'pr_SipProviderSettings' => 'การตั้งค่าผู้ให้บริการ SIP',
```

## Batch Translation Strategy

When translating large files (100+ keys):

### Step 1: Split into Batches

```bash
# Split Russian file into batches of 50 keys
# This prevents AI context overflow
```

### Step 2: Translate Each Batch

```
[Use standard prompt for batch 1: keys 1-50]
[Use standard prompt for batch 2: keys 51-100]
[Use standard prompt for batch 3: keys 101-150]
...
```

### Step 3: Merge and Validate

```bash
# Combine all batches into final file
# Validate PHP syntax
php -l src/Common/Messages/[lang]/[File].php
```

## Quality Validation Prompts

After translation, use these prompts to validate quality:

### Consistency Check

```
Review these translated strings and check:
1. Are placeholders (%variable%) preserved correctly?
2. Are technical terms (SIP, IAX, CDR) unchanged?
3. Are quotes properly escaped for PHP?
4. Is the tone consistent across all strings?
5. Are there any obvious translation errors?

[paste translated content]
```

### Localization Review

```
Review these translations for [LANGUAGE] and verify:
1. Phone number examples match local format
2. Date/time examples use local conventions
3. Cultural references are appropriate
4. Formal/informal tone matches UI context
5. No literal translations that sound unnatural

[paste translated content]
```

## Common Translation Patterns

### Placeholder Preservation

```
Input (Russian):
'gs_PasswordLength' => 'Пароль: %length% из %max% символов'

Correct translation:
'gs_PasswordLength' => 'Password: %length% of %max% characters'

Incorrect (placeholder names changed):
'gs_PasswordLength' => 'Password: %len% of %maximum% characters'  ❌
```

### Technical Term Handling

```
Input (Russian):
'pr_RegisterViaSip' => 'Регистрация через SIP'

Correct translation:
'pr_RegisterViaSip' => 'Register via SIP'

Incorrect (SIP translated):
'pr_RegisterViaSip' => 'Register via СИП'  ❌
```

### Quote Escaping

```
Input (Russian):
'msg_Example' => 'Он сказал: "Не забудь"'

Correct (escaped):
'msg_Example' => 'He said: "Don\'t forget"'

Incorrect (not escaped):
'msg_Example' => 'He said: "Don't forget"'  ❌ Breaks PHP
```

## Error Prevention Checklist

Before submitting translations to AI, ensure:

- [ ] Source text is from Russian (`ru/`) files
- [ ] Batch size is manageable (≤50 keys)
- [ ] Prompt includes all critical rules
- [ ] Target language is correctly specified
- [ ] Technical terms list is up to date

After receiving translations from AI, verify:

- [ ] All keys are present (no missing translations)
- [ ] Placeholder format is preserved: `%variable%`
- [ ] Technical terms are unchanged
- [ ] Quotes are properly escaped
- [ ] PHP syntax is valid: `php -l [file]`
- [ ] Translation sounds natural (not literal)

## Advanced Techniques

### Context-Aware Translation

For ambiguous terms, provide context:

```
Context: This is a tooltip for a button that generates random passwords
Term: "Generate"

Russian: 'bt_ToolTipGeneratePassword' => 'Создать случайный пароль'
```

### Preserving Tone

Specify formality level:

```
Note: MikoPBX uses professional but friendly tone.
Avoid overly formal language.
Use direct address where appropriate.
```

### Handling Variables in Context

```
Russian: 'msg_UserLoggedIn' => 'Пользователь %username% вошел в систему'

Provide context: "%username% is a person's name, should be treated as proper noun"
```

## Quick Reference

**✅ Always Do:**
- Keep technical terms unchanged
- Preserve `%placeholder%` format exactly
- Escape quotes in PHP
- Adapt examples to local context
- Batch large files (50 keys max)

**❌ Never Do:**
- Change placeholder names
- Translate technical terms (SIP, CDR, etc.)
- Use curly braces `{variable}`
- Skip quote escaping
- Translate everything literally

## Testing Translations

After AI translation, test with:

```bash
# Syntax check
php -l src/Common/Messages/th/ApiKeys.php

# Load and count keys
php -r "var_dump(count(include 'src/Common/Messages/th/ApiKeys.php'));"

# Compare with Russian
diff <(php -r "print_r(array_keys(include 'src/Common/Messages/ru/ApiKeys.php'));") \
     <(php -r "print_r(array_keys(include 'src/Common/Messages/th/ApiKeys.php'));")
```
