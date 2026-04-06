# MikoPBX Supported Languages

MikoPBX supports **29 languages** for its interface translations.

## Complete Language List

| Code | Language | Native Name | Notes |
|------|----------|-------------|-------|
| `az` | Azerbaijani | Azərbaycan dili | |
| `cs` | Czech | Čeština | |
| `da` | Danish | Dansk | |
| `de` | German | Deutsch | |
| `el` | Greek | Ελληνικά | |
| `en` | English | English | International standard |
| `es` | Spanish | Español | |
| `fa` | Persian | فارسی | Right-to-left script |
| `fi` | Finnish | Suomi | |
| `fr` | French | Français | |
| `he` | Hebrew | עברית | Right-to-left script |
| `hr` | Croatian | Hrvatski | |
| `hu` | Hungarian | Magyar | |
| `it` | Italian | Italiano | |
| `ja` | Japanese | 日本語 | |
| `ka` | Georgian | ქართული | |
| `nl` | Dutch | Nederlands | |
| `pl` | Polish | Polski | |
| `pt` | Portuguese | Português | European Portuguese |
| `pt_BR` | Brazilian Portuguese | Português Brasileiro | Brazilian variant |
| `ro` | Romanian | Română | |
| `ru` | **Russian** | **Русский** | ⭐ **PRIMARY LANGUAGE** |
| `sv` | Swedish | Svenska | |
| `th` | Thai | ไทย | |
| `tr` | Turkish | Türkçe | |
| `uk` | Ukrainian | Українська | |
| `vi` | Vietnamese | Tiếng Việt | |
| `zh_Hans` | Simplified Chinese | 简体中文 | Simplified variant |

## Primary Language

**Russian (`ru`)** is the PRIMARY language for MikoPBX development.

### Golden Rule
Developers **ONLY** modify Russian (`ru/*.php`) translations. All other languages are translated via:
- https://weblate.mikopbx.com (automatic synchronization)
- AI assistance (via this skill)

## Localization Examples

Different languages require culturally appropriate examples:

### Phone Number Formats

```php
// Russian
'ex_ExampleMobile' => 'например: +7 926 123-45-67'

// English
'ex_ExampleMobile' => 'e.g., +1 555 123-4567'

// Thai
'ex_ExampleMobile' => 'เช่น: +66 81 234 5678'

// Japanese
'ex_ExampleMobile' => '例: +81 90-1234-5678'
```

### Quote Styles

```php
// Russian - use Russian quotes
'ak_ConfirmDelete' => 'Вы уверены, что хотите удалить API ключ "{0}"?'

// English - use English quotes
'ak_ConfirmDelete' => 'Are you sure you want to delete API key "{0}"?'

// French - use French quotes
'ak_ConfirmDelete' => 'Êtes-vous sûr de vouloir supprimer la clé API « {0} » ?'
```

## Technical Terms (Never Translate)

Keep these telephony and network terms unchanged across **ALL** languages:

```
SIP, IAX, AMI, AJAM, PJSIP, NAT, STUN, TURN, RTP, CDR, IVR,
DID, CID, DTMF, codec, trunk, extension, IP, DNS, VPN
```

**Example across languages:**

```php
// Russian
'pr_SipProviderSettings' => 'Настройки SIP провайдера'

// English
'pr_SipProviderSettings' => 'SIP provider settings'

// Thai - SIP stays the same
'pr_SipProviderSettings' => 'การตั้งค่าผู้ให้บริการ SIP'

// Japanese - SIP stays the same
'pr_SipProviderSettings' => 'SIPプロバイダー設定'
```

## Language File Structure

All languages share identical file structure:

```
src/Common/Messages/
├── ru/              ⭐ PRIMARY - Edit ONLY this
│   ├── ApiKeys.php
│   ├── Auth.php
│   ├── Common.php
│   ├── Extensions.php
│   └── ... (all modules)
├── en/              🌐 Auto-translated
│   └── [same files]
├── es/              🌐 Auto-translated
│   └── [same files]
└── [27 more languages]
```

## Consistency Requirements

All languages MUST have:
- ✅ Identical translation keys
- ✅ Identical file structure
- ✅ Same placeholder names
- ✅ Same array structure

**Example:**
If Russian has 157 keys in `ApiKeys.php`, then ALL other 28 languages must have exactly 157 keys in `ApiKeys.php`.
