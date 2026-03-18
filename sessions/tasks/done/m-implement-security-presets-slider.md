---
name: m-implement-security-presets-slider
branch: feature/security-presets-slider
status: completed
created: 2026-03-18
---

# Security Presets Slider for Fail2Ban Settings

## Problem/Goal
На странице `/admin-cabinet/fail2-ban/index/` заменить ручную настройку параметров fail2ban на один слайдер с предустановленными профилями защиты. Каждый профиль автоматически задаёт оптимальные значения maxretry, FindTime, BanTime и PBXFirewallMaxReqSec.

## Success Criteria
- [x] Слайдер с 4 степенями: Слабая / Нормальная / Усиленная / Параноя (под атакой)
- [x] Каждый уровень автоматически задаёт: maxretry, FindTime, BanTime
- [x] Значения сохраняются в PbxSettings и применяются к fail2ban конфигурации
- [x] UI показывает текущие значения параметров для выбранного уровня
- [x] Переключение уровня перегенерирует конфигурацию fail2ban
- [x] Работает на существующей странице fail2ban без поломки текущего функционала
- [x] MaxReqSec остаётся отдельным независимым слайдером
- [x] Whitelist валидация и нормализация IP-адресов при сохранении

## Preset Values (draft)

| Параметр | Слабая | Нормальная | Усиленная | Параноя |
|----------|--------|------------|-----------|---------|
| maxretry | 10 | 5 | 3 | 1 |
| FindTime (мин) | 30 | 180 (3ч) | 360 (6ч) | 720 (12ч) |
| BanTime (мин) | 60 | 10080 (7д) | 43200 (30д) | 86400 (60д) |
## User Notes
- MaxReqSec (PBXFirewallMaxReqSec) остаётся отдельным слайдером, не входит в пресеты
- Вторая связанная задача: прогрессивная эскалация банов (10мин → 12ч → 24ч → 3дня → навсегда) — будет отдельным таском
- Известный баг: whitelist IP попадают под hashlimit до проверки whitelist (IptablesConf.php:157-176) — отдельный фикс

## Context Manifest
<!-- Added by context-gathering agent -->

### How This Currently Works: Fail2Ban Settings Page

The Fail2Ban settings page is accessible at `/admin-cabinet/fail2-ban/index/`. The `Fail2BanController::indexAction()` method is minimal -- it creates an empty `Fail2BanEditForm` and passes `isDocker` flag to the view. No data is loaded server-side; all settings are fetched via REST API from JavaScript.

**Data Storage Architecture:**

Fail2Ban settings are stored in two places:
1. **`m_Fail2BanRules` table** (model: `Fail2BanRules`) -- a singleton row (id=1) containing `maxretry` (int, default 5), `bantime` (int seconds, default 86400), `findtime` (int seconds, default 1800), and `whitelist` (string, space-separated IPs).
2. **`m_PbxSettings` table** -- key `PBXFirewallMaxReqSec` (constant `PbxSettings::PBX_FIREWALL_MAX_REQ`) stores the max SIP requests per second. Default is `'0'` (unlimited). Key `PBXFail2BanEnabled` (constant `PbxSettings::PBX_FAIL2BAN_ENABLED`) stores enabled flag, default `'0'`.

There is NO existing PbxSettings key for a "security preset level." This will need to be added if we want to persist the selected preset level (so the slider can be restored on page reload), OR the JS can detect the current level by matching stored values against the preset table.

**REST API Flow:**

- `GET /pbxcore/api/v3/fail2ban` -- `GetSettingsAction::main()` reads `Fail2BanRules::findFirst()` and `PbxSettings::getValueByKey(PBX_FIREWALL_MAX_REQ)`, returns `{maxretry, bantime, findtime, whitelist, PBXFirewallMaxReqSec}`.
- `PUT /pbxcore/api/v3/fail2ban` -- `UpdateSettingsAction::main($data)` finds or creates the `Fail2BanRules` record, updates fields `maxretry`, `bantime`, `findtime`, `whitelist` from request data using `isset()` check, and separately updates `PBXFirewallMaxReqSec` via `PbxSettings::setValueByKey()`. Uses database transaction.

The JS `Fail2BanAPI` object is created via `new PbxApiClient({endpoint: '/pbxcore/api/v3/fail2ban', singleton: true})`. It exposes `Fail2BanAPI.get()` / `Fail2BanAPI.getSettings()` and `Fail2BanAPI.update()` / `Fail2BanAPI.updateSettings()`.

**Current UI Structure (Volt Template):**

The page uses two tabs: "Settings" and "Banned IPs". The settings tab (`tabSettings.volt`) contains:
1. **"Blocking rules" section** (`f2b_BlockingRulesHeader` divider):
   - `maxretry` -- a numeric input field (rendered via `form.render('maxretry')`)
   - `findtime` -- a hidden input + Fomantic UI slider (`#FindTimeSlider`) with 4 positions: 10min/30min/1hour/3hours (values in seconds: `['600', '1800', '3600', '10800']`)
   - `bantime` -- a hidden input + Fomantic UI slider (`#BanTimeSlider`) with 5 positions: 3h/12h/24h/3d/7d (values in seconds: `['10800', '43200', '86400', '259200', '604800']`)
2. **"Additional settings" section** (`f2b_AdditionalSettingsHeader` divider):
   - `whitelist` -- textarea
   - `PBXFirewallMaxReqSec` -- hidden input + slider (`#PBXFirewallMaxReqSec`) with 5 positions: 10/30/100/300/unlimited. Only shown when `not isDocker`.

All sliders use the Fomantic UI `.slider()` component with `interpretLabel` callbacks for display labels and `onChange` callbacks that write to hidden form fields and call `Form.dataChanged()`.

**Current JavaScript (fail-to-ban-index.js):**

The `fail2BanIndex` object:
- On `initialize()`: sets up tab menu, DataTable for banned IPs, calls `loadSettings()` to fetch data via `Fail2BanAPI.getSettings()`, then initializes all three sliders.
- `loadSettings()` callback: sets form values via `$formObj.form('set values', {...})`, then updates slider positions using `.slider('set value', idx, false)` (the `false` prevents triggering `onChange`).
- Each slider's `onChange` callback writes the corresponding value to the hidden form field and calls `Form.dataChanged()`.
- Form submission: `cbBeforeSendForm` collects all form values via `$formObj.form('get values')`, `Form.apiSettings` routes the save to `Fail2BanAPI.update`.
- Validation rules only check `maxretry` (must be integer 2..99).

**How Fail2Ban Config Is Applied (Fail2BanConf.php):**

When settings are saved, the worker event system triggers `Fail2BanConf::reloadFail2ban()` or `Fail2BanConf::reStart()`. The `writeConfig()` method calls `initProperty()` which reads `Fail2BanRules::findFirst("id = '1'")` to get `maxretry`, `findtime`, `bantime`, and builds the whitelist. These values are written into `/etc/fail2ban/jail.local` as:
```
[DEFAULT]
ignoreip = 127.0.0.1 ::1 <whitelist>

[<jail_name>]
enabled = true
maxretry = <value>
findtime = <value>
bantime = <value>
...
```

Note that `findtime` and `bantime` are stored in **seconds** in the database and written directly to the jail config in seconds. The existing slider values are already in seconds. The task spec has FindTime and BanTime in **minutes** -- so the preset values in the task need to be converted to seconds for storage.

**Preset Values Converted to Seconds:**

| Parameter | Weak | Normal | Enhanced | Paranoid |
|-----------|------|--------|----------|----------|
| maxretry | 10 | 5 | 3 | 1 |
| findtime (sec) | 1800 | 10800 | 21600 | 43200 |
| bantime (sec) | 3600 | 604800 | 2592000 | 5184000 |

### What Needs to Change for the Security Presets Slider

**Approach:** Replace the three separate controls (maxretry input + findtime slider + bantime slider) with a single "Security Level" slider that has 4 positions. The individual sliders and maxretry input become read-only displays (or are hidden and replaced with a display panel showing the values for the selected level).

**Key Design Decisions:**

1. **Persistence of selected level**: Two approaches:
   - (A) Add a new PbxSettings constant (e.g., `PBX_FAIL2BAN_SECURITY_LEVEL`) to store the selected preset index. Simplest for restoring state on page load.
   - (B) Detect the level by matching current `{maxretry, findtime, bantime}` against presets. If values don't match any preset, show "Custom" or snap to nearest. Avoids schema change but more complex.

2. **UI layout**: The new preset slider replaces the "Blocking rules" section. Below it, a summary panel shows the values that will be applied. The existing individual controls (maxretry input, findtime/bantime sliders) should either be removed entirely or shown as read-only informational display.

3. **MaxReqSec remains separate**: The task explicitly says MaxReqSec stays as its own independent slider. No change needed there.

**Files That Need Modification:**

- `src/AdminCabinet/Views/Fail2Ban/IndexTabs/tabSettings.volt` -- replace maxretry/findtime/bantime UI with preset slider + info panel
- `sites/admin-cabinet/assets/js/src/Fail2Ban/fail-to-ban-index.js` -- replace three slider/input init with single preset slider, define preset arrays, update form values on change
- `sites/admin-cabinet/assets/js/src/Fail2Ban/fail2ban-tooltip-manager.js` -- update/add tooltip for the new preset slider (remove old individual tooltips if controls are removed)
- `src/AdminCabinet/Forms/Fail2BanEditForm.php` -- may need to remove `Numeric('maxretry')` and change it to `Hidden` if maxretry is no longer user-editable; or keep as-is if the hidden fields still carry the values
- `src/Common/Messages/en/NetworkSecurity.php` and `src/Common/Messages/ru/NetworkSecurity.php` (plus all 27 other language files) -- add translation keys for preset level labels and descriptions
- Transpiled JS in `sites/admin-cabinet/assets/js/pbx/Fail2Ban/` -- must be regenerated via babel after source changes

**Files That Should NOT Need Modification:**

- `Fail2BanConf.php` -- reads `maxretry`/`findtime`/`bantime` from database, works regardless of how values were set
- `GetSettingsAction.php` / `UpdateSettingsAction.php` -- still sends/receives same fields
- `Fail2BanManagementProcessor.php` / `RestController.php` -- no API contract change
- `Fail2BanController.php` -- still just creates the form
- `Fail2BanRules.php` model -- no schema change needed

### Technical Reference Details

#### Current Slider Pattern (Reference for New Slider)

The Fomantic UI slider is initialized in JS like this (from the existing MaxReqSec slider):
```javascript
$('#PBXFirewallMaxReqSec').slider({
    min: 0,
    max: 4,       // 0-indexed positions
    step: 1,
    smooth: true,
    interpretLabel: function (value) {
        let labels = [
            globalTranslate.f2b_MaxReqSec10,
            globalTranslate.f2b_MaxReqSec30,
            // ...
        ];
        return labels[value];
    },
    onChange: fail2BanIndex.cbAfterSelectMaxReqSlider,
});
```

The slider CSS is loaded via `css/vendor/semantic/slider.min.css`. The slider HTML in Volt is:
```html
<div class="ui bottom aligned ticked labeled slider" id="SliderID"></div>
```

#### Preset Data Structure (for JS)

```javascript
// Proposed preset definitions
const securityPresets = [
    { // 0: Weak
        maxretry: 10,
        findtime: 1800,    // 30 min
        bantime: 3600,     // 1 hour
    },
    { // 1: Normal
        maxretry: 5,
        findtime: 10800,   // 3 hours
        bantime: 604800,   // 7 days
    },
    { // 2: Enhanced
        maxretry: 3,
        findtime: 21600,   // 6 hours
        bantime: 2592000,  // 30 days
    },
    { // 3: Paranoid
        maxretry: 1,
        findtime: 43200,   // 12 hours
        bantime: 5184000,  // 60 days
    },
];
```

#### Translation Keys Needed

For the slider labels (4 positions):
- `f2b_SecurityPresetWeak` / `f2b_SecurityPresetNormal` / `f2b_SecurityPresetEnhanced` / `f2b_SecurityPresetParanoid`

For the section header:
- `f2b_SecurityPresetHeader` (replaces or augments `f2b_BlockingRulesHeader`)

For the info panel showing current values:
- `f2b_PresetMaxRetry`, `f2b_PresetFindTime`, `f2b_PresetBanTime` (or reuse existing `f2b_MaxRetry`, `f2b_FindTime`, `f2b_BanTime`)

For human-readable duration display in info panel:
- Can reuse existing keys like `f2b_BanTime3Hours`, `f2b_BanTime7Days`, etc. -- or generate dynamically in JS

Russian labels:
- Слабая / Нормальная / Усиленная / Параноя (as specified in task)

#### Database Model (Unchanged)

```php
// Fail2BanRules - table m_Fail2BanRules
public ?int $maxretry = 5;    // Attempts before ban
public ?int $bantime = 86400; // Ban duration in seconds
public ?int $findtime = 1800; // Window in seconds
public ?string $whitelist = '';
```

#### Form Fields (Fail2BanEditForm.php)

```php
$this->add(new Numeric('maxretry'));  // Could become Hidden
$this->add(new Hidden('bantime'));
$this->add(new Hidden('findtime'));
$this->addTextArea('whitelist', '', 95);
$this->addCheckBox(PbxSettings::PBX_FAIL2BAN_ENABLED, false);
$this->add(new Hidden(PbxSettings::PBX_FIREWALL_MAX_REQ));
```

The form `maxretry` field is currently `Numeric` (rendered as `<input type="number">`). Since the preset slider will set maxretry automatically, it should become `Hidden` like bantime/findtime. The validation rule `integer[2..99]` in JS should also be updated (or removed) since maxretry=1 is now valid for Paranoid level.

#### Asset Loading (AssetProvider.php)

```
CSS: slider.min.css (already loaded)
JS: fail2ban-api.js, fail2ban-tooltip-manager.js, fail-to-ban-index.js
Transpiled output: js/pbx/Fail2Ban/fail-to-ban-index.js
```

After editing source JS files, must run babel transpilation to update `js/pbx/Fail2Ban/` directory.

#### File Locations

- Volt template: `src/AdminCabinet/Views/Fail2Ban/IndexTabs/tabSettings.volt`
- JS source: `sites/admin-cabinet/assets/js/src/Fail2Ban/fail-to-ban-index.js`
- JS tooltips: `sites/admin-cabinet/assets/js/src/Fail2Ban/fail2ban-tooltip-manager.js`
- JS transpiled: `sites/admin-cabinet/assets/js/pbx/Fail2Ban/fail-to-ban-index.js`
- JS transpiled tooltips: `sites/admin-cabinet/assets/js/pbx/Fail2Ban/fail2ban-tooltip-manager.js`
- PHP form: `src/AdminCabinet/Forms/Fail2BanEditForm.php`
- Translations (en): `src/Common/Messages/en/NetworkSecurity.php`
- Translations (ru): `src/Common/Messages/ru/NetworkSecurity.php`
- Translations (other 27 languages): `src/Common/Messages/{lang}/NetworkSecurity.php`
- REST API get: `src/PBXCoreREST/Lib/Fail2Ban/GetSettingsAction.php`
- REST API update: `src/PBXCoreREST/Lib/Fail2Ban/UpdateSettingsAction.php`
- Fail2Ban config gen: `src/Core/System/Configs/Fail2BanConf.php` (no changes expected)
- Asset loader: `src/AdminCabinet/Providers/AssetProvider.php` (no changes expected)
- PbxSettings constants: `src/Common/Models/PBXSettings/PbxSettingsConstantsTrait.php`
- PbxSettings defaults: `src/Common/Models/PBXSettings/PbxSettingsDefaultValuesTrait.php`

#### Validation Concern

Current JS validation rule for `maxretry` is `'integer[2..99]'`. Paranoid preset needs maxretry=1. Either:
- Change validation to `'integer[1..99]'`
- Remove the validation rule entirely since users no longer manually enter the value
- Keep the rule but update the range

## Work Log
- [2026-03-18] Task created
