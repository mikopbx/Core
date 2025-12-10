---
name: m-refactor-console-menu
branch: feature/m-refactor-console-menu
submodules:
  - pbx-core-scripts
status: in-progress
created: 2025-12-09
---

# Рефакторинг консольного меню MikoPBX в стиле ESXi

## Problem/Goal

Улучшить консольное меню MikoPBX для создания профессионального интерфейса:

1. **Баннер ESXi-стиль**: Заставка с автообновлением раз в минуту, показывает релиз, окружение, название станции, адреса подключения (IPv4/IPv6 + порты), uptime
2. **Упрощенная навигация**: Главное меню с 2 пунктами (Настройки / Выход в консоль)
3. **Диагностика**: Новое подменю с запуском mc, sngrep, mtr
4. **Детальная сетевая информация**: Отдельный пункт для просмотра IP адресов, маршрутов, DNS серверов
5. **Модульная архитектура**: Разбить большой класс ConsoleMenu.php (1591 строка) на логические компоненты

## Success Criteria

**Баннер и режимы запуска:**
- [ ] При автоматическом запуске (login shell) показывается баннер с автообновлением каждые 60 секунд
- [ ] При запуске из командной строки (интерактивно) сразу переход в главное меню настроек без баннера
- [ ] Любая клавиша во время баннера → переход в меню, Ctrl+C → выход в shell
- [ ] Подсказка "Press any key to enter settings menu..." внизу баннера
- [ ] Баннер содержит: версия, окружение, PBX Name (отдельная строка), Web URL, SSH, uptime (формат `2d 3h 45m`)
- [ ] Статус сервисов в компактной строке: `Services: Asterisk ● | Nginx ● | PHP ● | Fail2ban ○`
- [ ] Баннер использует ASCII box drawing и цветовое выделение (зеленый/красный/желтый)

**Адаптивность экрана:**
- [ ] Автоматическое определение ширины терминала (tput cols)
- [ ] Динамическая адаптация ширины баннера и меню под размер экрана
- [ ] Поддержка широких терминалов (не ограничение в 80 символов)
- [ ] Корректное отображение в узких терминалах (минимум 60 символов)

**Навигация:**
- [ ] Главное меню содержит 2 пункта: [1] Настройки, [2] Выход в консоль
- [ ] Расширенное меню настроек содержит все старые пункты + новые (Сетевая информация, Диагностика, Логи)
- [ ] Меню диагностики запускает mc/sngrep/mtr с возвратом обратно в подменю

**Просмотр логов:**
- [ ] Реализован просмотр логов в реальном времени (tail -f)
- [ ] Реализован просмотр логов с конца файла (less +G)
- [ ] Меню выбора логов: system, asterisk, php, nginx, fail2ban
- [ ] Возможность выхода из просмотра логов с возвратом в меню
- [ ] Обработка ошибок: сообщение "Log file not found..." + Press Enter для возврата

**Функциональность:**
- [ ] Детальная сетевая информация показывает все IP адреса с пометками (DHCPv6/SLAAC/link-local), маршруты (IPv4/IPv6), DNS серверы
- [ ] Возврат из внешних утилит (mc, sngrep, asterisk -r): очистка экрана + сразу в меню

**Архитектура и код:**
- [ ] Класс ConsoleMenu.php сокращен до ~300 строк
- [ ] Создано 15+ новых классов в структуре ConsoleMenu/ (Banners, Menus, Actions, Wizards, Utilities)
- [ ] Добавлены переводы на 2 языка (ru, en) для новых ключей
- [ ] Сохранена обратная совместимость (точка входа ConsoleMenu->start())
- [ ] Код соответствует PSR-1/4/12 и принципам SOLID

**Тестирование:**
- [ ] Все работает в Docker/LiveCD/Physical окружениях
- [ ] Корректная работа на терминалах разной ширины (60-200+ символов)
- [ ] Проверена матрица доступности пунктов меню (Docker/LiveCD/Normal)
- [ ] Недоступные пункты скрыты (не показываются неактивными)

## Context Manifest

### How ConsoleMenu Currently Works: Complete Flow & Architecture

**Entry Point & Initialization** (lines 1036-1108 in ConsoleMenu.php):

When `ConsoleMenu->start()` is called, the system performs the following sequence:

1. **Terminal Validation** (`ensureValidTerminal()` lines 57-66): The method checks if the terminal type is valid by executing `tput cols`. If it fails (unknown terminal like Ghostty), it falls back to `TERM=xterm-256color`. This is critical because modern terminals may not be recognized by the remote system.

2. **Dependency Injection Setup** (line 1041): Calls `RegisterDIServices::init()` to initialize Phalcon's DI container with all system services including TranslationProvider.

3. **Translation Service Access** (lines 1043-1044): Retrieves the shared translation service via `$di->getShared(TranslationProvider::SERVICE_NAME)`. This service provides multilingual support using translation keys from `/src/Common/Messages/{lang}/ConsoleMenu.php` files.

4. **Cyrillic Font Setup** (line 1047): Calls `Util::setCyrillicFont()` which executes `/usr/bin/setfont /usr/share/consolefonts/Cyr_a8x16.psfu.gz` to enable Cyrillic character display in the console.

5. **Banner Generation** (`getBannerText()` lines 1113-1228): This method constructs a multi-line banner containing:
   - **Version Detection**: Reads from `/offload/version` (LiveCD) or `/etc/version` (installed system)
   - **Build Time**: From `/etc/version.buildtime`
   - **Virtual Hardware Detection**: Executes `/sbin/pbx-env-detect --type --nocache` to detect environment (VMware, Docker, KVM, etc.). The `--nocache` flag ensures fresh detection every time.
   - **Architecture Display**: Uses `System::isARM64()` and `System::isAMD64()` methods which internally call `/sbin/pbx-env-detect --arch` or fallback to `uname -m`
   - **Network Interface Discovery**: Calls `Network->getEnabledLanInterfaces()` which queries `LanInterfaces` model for interfaces where `disabled=0`
   - **Web Interface URL**: Finds the interface marked with `internet='1'`, retrieves its IP (IPv4 preferred, IPv6 fallback), wraps IPv6 in brackets `[2001:db8::1]`, and appends the HTTPS port from `PbxSettings::WEB_HTTPS_PORT` (default 443)
   - **System Integrity Check**: Calls `Main::checkForCorruptedFiles()` if running on T2SDE Linux or Docker x86_64, displays red warning if corrupted files found
   - **LiveCD Warning**: Shows red text "PBX is running in Live or Recovery mode" if `/offload/livecd` file exists

6. **Menu Construction** (lines 1053-1097): Uses PhpSchool CliMenuBuilder with:
   - **Title**: Banner text + separator line
   - **Styling**: Black background, white foreground, custom marker styles (empty space for cleaner look)
   - **Width**: Fixed 75 characters
   - **Auto-shortcuts**: Enabled for keyboard navigation
   - **Environment-Specific Items**:
     - **Docker Mode** (`System::isDocker()` checks for `/.dockerenv` file): Only shows limited menu (language, reboot, ping, firewall, password reset) - no network or storage configuration
     - **LiveCD Mode** (checks `/offload/livecd`): Shows network setup, reboot, ping, installation/recovery options
     - **Normal Mode**: Full menu including network, reboot, ping, firewall, storage, password reset

**Network Configuration Flow** (setupLan → setupLanWizard → wizard steps):

The network wizard is the most complex part, implementing a multi-step configuration process:

**Step 1: Interface Selection** (`wizardSelectInterface()` lines 503-544):
- Queries `LanInterfaces::find(['columns' => 'interface'])` to get all interfaces
- If only one interface exists, auto-selects it
- For multiple interfaces, displays arrow-navigable menu using `showArrowChoiceMenu()` helper
- Returns interface name or null if cancelled

**Step 2: IPv4 Configuration** (`wizardConfigureIPv4()` lines 552-633):
- Loads current settings from `LanInterfaces` model for the selected interface
- Displays current mode (DHCP/Static/Disabled) in menu title
- Offers 5 options via arrow menu: DHCP, Static, Disabled, Keep Current, Go Back
- **DHCP Mode**: Sets `dhcp='1'` and clears IP fields
- **Static Mode**: Sequentially prompts for:
  - IPv4 address using `askIPAddress()` with filter `FILTER_VALIDATE_IP` + `FILTER_FLAG_IPV4`
  - Subnet mask in CIDR notation (1-32) using `askSubnet()` with numeric validation
  - Gateway IPv4 address
- **Input Validation**: Uses anonymous classes extending `PhpSchool\CliMenu\Input\Text` with custom `validate()` methods
- Returns configuration array with keys: `dhcp`, `ipaddr`, `subnet`, `gateway`

**Step 3: IPv6 Configuration** (`wizardConfigureIPv6()` lines 641-722):
- Similar structure to IPv4 but with 3 modes:
  - **Mode 1 (Auto)**: `ipv6_mode='1'` - enables SLAAC/DHCPv6 autoconfiguration
  - **Mode 2 (Manual)**: `ipv6_mode='2'` - prompts for static IPv6 address, prefix length (1-128), and gateway
  - **Mode 0 (Disabled)**: `ipv6_mode='0'` - clears all IPv6 fields
- **IPv6 Address Validation**: Uses `IpAddressHelper::isIpv6()` utility method which validates against RFC 4291
- Returns configuration array with keys: `ipv6_mode`, `ipv6addr`, `ipv6_subnet`, `ipv6_gateway`

**Step 4: DNS Configuration** (`wizardConfigureDNS()` lines 730-777):
- First asks via Y/N prompt: "Is this the internet interface?"
- If yes (`internet='1'`), prompts for DNS servers:
  - Primary DNS (IPv4 or IPv6) - detects IP version using `IpAddressHelper::isIpv6()` and stores in appropriate field (`primarydns` or `primarydns6`)
  - Secondary DNS (optional) - same logic
- Returns configuration with keys: `internet`, `primarydns`, `secondarydns`, `primarydns6`, `secondarydns6`

**Step 5: Review & Confirmation** (`wizardReviewAndConfirm()` lines 785-816):
- Displays formatted summary via `showConfigSummary()` showing:
  - Interface name
  - IPv4 section: Mode (DHCP/Static/Disabled), address/subnet/gateway if applicable
  - IPv6 section: Mode (Auto/Manual/Disabled), address/prefix/gateway if applicable
  - DNS section: IPv4 and IPv6 nameservers
  - Internet interface flag
- Arrow menu with 3 options: Apply, Edit (restart wizard), Cancel
- Returns: true (apply), false (edit), null (cancel)

**Step 6: Configuration Application** (`wizardApplyConfiguration()` lines 823-874):
- **Critical IPv6 Validation**: Before saving, validates IPv6 addresses using `IpAddressHelper::isIpv6()` to prevent invalid data in database
- Finds or creates `LanInterfaces` record via `LanInterfaces::findFirst()` with interface name binding
- Applies all configuration fields using property assignment
- **Automatic Event Triggering**: When `$interface->save()` is called, Phalcon's model events automatically trigger `WorkerModelsEvents` which:
  - Queues network reconfiguration task to Beanstalkd
  - Worker `WorkerModelsEvents` picks up the task
  - Calls `Network->lanConfigure()` to apply changes
  - Regenerates DNS configuration via `DnsConf->resolveConfGenerate()`
  - Restarts Nginx to update web interface bindings
- Displays success message or validation errors from model

**Network Interface Information Display** (`displayNetworkInterfaces()` lines 72-128):

This method provides detailed interface status:

1. Calls `Network->getEnabledLanInterfaces()` to get interfaces where `disabled=0`
2. For each interface:
   - Adjusts name: if VLAN ID > 0, uses `vlan{id}` instead of physical interface name
   - Calls `Network->getInterface($name)` which:
     - Executes `ifconfig $name` and parses output with regex
     - Extracts: MAC address (HWaddr), IPv4 address (inet addr:), subnet mask (Mask:), interface status (UP flag)
     - Parses **IPv6 addresses** from ifconfig output (both Global and Link-Local)
   - Displays:
     - Interface name with green "[Internet]" marker if `internet='1'`
     - IPv4: "DHCP" if `dhcp='1'`, or "x.x.x.x/24" format, or "Not configured"
     - IPv6: "x:x::x/64" format if configured
     - MAC address

**Data Models & Database Schema**:

**LanInterfaces Model** (`/src/Common/Models/LanInterfaces.php`):
```php
class LanInterfaces extends ModelsBase {
    public int|string|null $id;           // Primary key
    public ?string $name;                  // Display name
    public ?string $interface;             // System name (eth0, eth1)
    public ?string $vlanid;                // VLAN ID (default '0')
    public ?string $subnet;                // IPv4 subnet mask in CIDR bits
    public ?string $ipaddr;                // IPv4 address
    public ?string $gateway;               // IPv4 gateway
    public ?string $dhcp;                  // '1' = DHCP, '0' = static
    public ?string $ipv6_mode;             // '0'=Off, '1'=Auto, '2'=Manual
    public ?string $ipv6addr;              // IPv6 address
    public ?string $ipv6_subnet;           // IPv6 prefix length (1-128)
    public ?string $ipv6_gateway;          // IPv6 gateway
    public ?string $primarydns;            // IPv4 primary DNS
    public ?string $secondarydns;          // IPv4 secondary DNS
    public ?string $primarydns6;           // IPv6 primary DNS
    public ?string $secondarydns6;         // IPv6 secondary DNS
    public ?string $internet;              // '1' = internet interface
    public ?string $disabled;              // '0' = enabled, '1' = disabled
    public ?string $hostname;              // System hostname
    public ?string $domain;                // Domain name
    public ?string $topology;              // 'public' or 'private'
    public ?string $extipaddr;             // External IP (for NAT detection)
}
```

**PbxSettings Model** (constants in `/src/Common/Models/PBXSettings/PbxSettingsConstantsTrait.php`):
```php
// Key constants used in ConsoleMenu:
PbxSettings::PBX_NAME = 'Name';                    // Default: 'PBX system'
PbxSettings::SSH_LANGUAGE = 'SSHLanguage';         // Default: 'en'
PbxSettings::WEB_HTTPS_PORT = 'WEBHTTPSPort';      // Default: '443'
PbxSettings::WEB_ADMIN_LOGIN = 'WebAdminLogin';    // Default: 'admin'
PbxSettings::WEB_ADMIN_PASSWORD = 'WebAdminPassword'; // Random on first install
PbxSettings::PBX_FIREWALL_ENABLED = 'PBXFirewallEnabled'; // '1' or '0'
```

**Settings Access Pattern**:
- `PbxSettings::getValueByKey($key)` - Retrieves value from Redis cache (if available) or database
- `PbxSettings::setValueByKey($key, $value)` - Updates both database and Redis cache
- `PbxSettings::resetValueToDefault($key)` - Resets to default value from trait

**PhpSchool CliMenu Library Patterns**:

The codebase uses PhpSchool CliMenu v4.x with these patterns:

**Menu Building** (example from setupLanguage lines 978-1030):
```php
$menuBuilder->setTitle($translation->_('cm_ChooseShellLanguage'))
    ->setWidth(75)
    ->setBackgroundColour('black', 'black')
    ->enableAutoShortcuts()   // Enables 1-9 keyboard shortcuts
    ->disableDefaultItems()   // Removes default "Exit" item
    ->addItem('[1] English', $callback)
    ->addItem('[2] Cancel', new GoBackAction());
```

**Custom Input Validation** (example from askYesNo lines 321-339):
```php
// Anonymous class extending Text input with custom validation
$input = new class (new InputIO($menu, $menu->getTerminal()), $style) extends Text {
    public function validate(string $input): bool {
        return ($input === 'y' || $input === 'n');
    }
};
$dialog = $input->setPromptText($prompt)
    ->setValidationFailedText($translation->_('cm_WarningYesNo'))
    ->ask();
$result = $dialog->fetch();
```

**Arrow Choice Menu Pattern** (`showArrowChoiceMenu()` lines 270-313):
This is a custom helper that creates a temporary submenu with arrow navigation instead of text input. It's used throughout the wizard for better UX:
- Builds options array: `['dhcp' => 'DHCP (automatic)', 'static' => 'Static', ...]`
- Creates callbacks that store selection index and close menu
- Returns 1-based index or null if cancelled
- Avoids text input prompts for predefined choices

**Styling Configuration**:
```php
->modifySelectableStyle(function (SelectableStyle $style) {
    $style->setSelectedMarker('> ')    // Marker for selected item
          ->setUnselectedMarker('  '); // Marker for unselected items
})
```

**Translation System Architecture**:

Translation files are located in `/src/Common/Messages/{lang}/ConsoleMenu.php` and return associative arrays:

```php
// English: /src/Common/Messages/en/ConsoleMenu.php
return [
    'cm_PbxConsoleSetup' => 'PBX console setup',
    'cm_SetupLanIpAddress' => 'Set up LAN IP address',
    // ... 126 keys total
];

// Russian: /src/Common/Messages/ru/ConsoleMenu.php
return [
    'cm_PbxConsoleSetup' => 'Консольная настройка PBX',
    'cm_SetupLanIpAddress' => 'Настроить IP адрес LAN',
    // ... 126 keys total
];
```

**Usage Pattern**:
```php
$translation = $di->getShared(TranslationProvider::SERVICE_NAME);
$text = $translation->_('cm_ChooseAction');  // Returns localized string
$text = $translation->_('cm_DoYouWantFirewallAction', ['action' => 'enable']); // With placeholders
```

**Supported Languages** (from setupLanguage lines 983-1007):
- Primary: en, ru, de, es, fr, pt, uk, it, da, nl, pl, sv, az, ro
- Commented out (require special fonts): th, el, ka, cs, tr, ja, vi, zh_Hans

**System Utility Methods**:

**Util Class** (`/src/Core/System/Util.php`):
- `Util::which($cmd)` (lines 397-419): Finds executable path by searching `$_ENV['PATH']`, caches results globally
- `Util::setCyrillicFont()` (lines 449-453): Executes `setfont /usr/share/consolefonts/Cyr_a8x16.psfu.gz`
- `Util::isT2SdeLinux()` (lines 534-537): Checks for `/etc/t2-sde-build` file

**System Class** (`/src/Core/System/System.php`):
- `System::isDocker()` (lines 298-301): Checks for `/.dockerenv` file existence
- `System::isARM64()` (lines 308-327): Executes `/sbin/pbx-env-detect --arch` or fallback to `uname -m`, checks for 'aarch64' or 'arm64'
- `System::isAMD64()` (lines 334-351): Same as ARM64 but checks for 'x86_64'

**Network Class** (`/src/Core/System/Network.php`):
- `getEnabledLanInterfaces()` (lines 445-451): Returns array of `LanInterfaces` where `disabled=0`
- `getInterface($name)` (lines 1246-1290): Parses `ifconfig` output to extract MAC, IPv4, subnet, IPv6 addresses, interface status
- `updateNetSettings($data)` (lines 458-490): Updates database record, ensures only one interface has `internet='1'`
- `lanConfigure()`: Applies network configuration (called automatically via model events)

**Storage Class** (`/src/Core/System/Storage.php`):
- `Storage::isStorageDiskMounted()` (lines 106-150): Checks if storage disk is mounted by:
  - If Docker: checks `/storage/usbdisk1/` directory
  - If T2SDE: reads device from `/var/etc/storage_device` and greps `mount` output
  - Returns true if mounted, stores mount directory in `$mount_dir` parameter

**Log File Paths** (critical for log viewer implementation):
```
System messages:    /storage/usbdisk1/mikopbx/log/system/messages
PHP errors:         /storage/usbdisk1/mikopbx/log/php/error.log
Nginx errors:       /storage/usbdisk1/mikopbx/log/nginx/error.log
Asterisk main log:  /storage/usbdisk1/mikopbx/log/asterisk/messages
Fail2ban log:       /storage/usbdisk1/mikopbx/log/fail2ban/fail2ban.log
```

### Code Organization Patterns in MikoPBX

**Existing Subdirectory Structures** (examples to follow):

1. **Asterisk Module** (`/src/Core/Asterisk/`):
   - Main classes at root: `AsteriskManager.php`, `AGI.php`, `CdrDb.php`
   - Subdirectory `Configs/` with 50 specialized config generators: `PJSIPConf.php`, `ExtensionsConf.php`, etc.
   - Each config class implements specific generation logic

2. **System Module** (`/src/Core/System/`):
   - Main classes at root: `Network.php`, `Storage.php`, `System.php`, `Util.php`
   - Subdirectory `Configs/` with 20+ specialized classes: `DnsConf.php`, `IptablesConf.php`, `NginxConf.php`
   - Each config class has `generate()` and `reStart()` methods

**Namespace Convention**:
```php
// Root class
namespace MikoPBX\Core\System;
class ConsoleMenu { }

// Subdirectory classes
namespace MikoPBX\Core\System\ConsoleMenu\Banners;
class WelcomeBanner { }

namespace MikoPBX\Core\System\ConsoleMenu\Menus;
class MainMenu { }
```

**PSR Standards Applied**:
- **PSR-1**: PHP tags, namespace declaration, class naming (StudlyCaps)
- **PSR-4**: Autoloading, one class per file, namespace matches directory structure
- **PSR-12**: Coding style, indentation (4 spaces), line length (120 chars recommended), method visibility

### What Needs to Connect: Refactoring Plan

**Current Structure** (1590 lines):
- Banner generation: ~115 lines (getBannerText + helpers)
- Network wizard: ~370 lines (6 wizard step methods + 4 wizard helper methods)
- Menu building: ~530 lines (setupLan, setupLanguage, setupReboot, setupStorage, setupFirewall)
- Action handlers: ~180 lines (pingAction, resetPassword, installAction, consoleAction, setupFirewall implementation)
- Utility methods: ~130 lines (displayNetworkInterfaces, firewallWarning, storageWarning, ensureValidTerminal)
- start() orchestration: ~75 lines

**Target Modular Structure**:

**1. ConsoleMenu.php (Orchestrator ~300 lines)**:
```php
namespace MikoPBX\Core\System;

class ConsoleMenu {
    private BannerDataCollector $bannerCollector;
    private MainMenu $mainMenu;

    public function __construct() {
        $this->bannerCollector = new BannerDataCollector();
        $this->mainMenu = new MainMenu();
    }

    public function start(): void {
        // Terminal validation
        // DI initialization
        // Cyrillic font setup
        // Delegate to MainMenu
    }
}
```

**2. Banners/BannerDataCollector.php (~250 lines)**:
- Collects: version, buildtime, virtual hardware type, architecture, network interfaces, web URL, system integrity
- Methods: `getVersion()`, `getBuildTime()`, `getVirtualHardwareType()`, `getArchitecture()`, `getWebInterfaceUrl()`, `getSystemIntegrityStatus()`
- Dependencies: Network, System, PbxSettings, Main, IpAddressHelper

**3. Banners/WelcomeBanner.php (~150 lines)**:
- Formats collected data into ESXi-style banner with ASCII box drawing
- Auto-refresh logic (60-second loop)
- Color formatting (green/red/yellow ANSI codes)
- Terminal width detection and adaptation

**4. Menus/MainMenu.php (~100 lines)**:
- 2-item menu: Settings, Console
- Delegates to SettingsMenu or consoleAction()

**5. Menus/SettingsMenu.php (~150 lines)**:
- 5-item menu: Network, Monitoring, System, Installation, Console
- Delegates to specialized menus

**6. Menus/NetworkMenu.php (~80 lines)**:
- 4-item menu: Configure interfaces, Show network info, Ping/MTR, Back
- Delegates to NetworkActions and NetworkInfo

**7. Menus/MonitoringMenu.php (~80 lines)** [NEW]:
- 4-item menu: View logs, Asterisk diagnostics, File manager (mc), Back
- Delegates to MonitoringActions and LogViewer

**8. Menus/SystemMenu.php (~100 lines)** [NEW]:
- 6-item menu: Language, Firewall, Storage, Reset password, Reboot, Back
- Delegates to SystemActions

**9. Menus/LogsMenu.php (~100 lines)** [NEW]:
- Menu for selecting log files
- Delegates to LogViewer with selected log path and default mode

**10. Actions/NetworkActions.php (~200 lines)**:
- displayNetworkInterfaces() - detailed network info display
- setupLanAuto() - DHCP configuration
- setupInternetInterface() - set internet flag
- pingAction() - ping host utility
- Dependencies: Network, NginxConf

**11. Actions/MonitoringActions.php (~150 lines)** [NEW]:
- asteriskDiagnostics() - submenu for sngrep, CLI, channels, PJSIP endpoints
- fileManager() - launches mc with proper terminal handling
- Dependencies: Util (for which())

**12. Actions/SystemActions.php (~200 lines)**:
- setupLanguage() - language selection menu
- setupFirewall() - toggle firewall on/off
- setupStorage() - connect/check/resize storage
- resetPassword() - reset web admin password
- setupReboot() - reboot/power off menu
- Dependencies: PbxSettings, IptablesConf, Fail2BanConf, Storage

**13. Actions/DiagnosticActions.php (~50 lines)**:
- Launches diagnostic tools (mc, sngrep, mtr) with terminal handling

**14. Wizards/NetworkWizard.php (~400 lines)**:
- setupLanWizard() - main coordinator
- wizardSelectInterface() - step 1
- wizardConfigureIPv4() - step 2
- wizardConfigureIPv6() - step 3
- wizardConfigureDNS() - step 4
- wizardReviewAndConfirm() - step 5
- wizardApplyConfiguration() - step 6
- Dependencies: LanInterfaces, IpAddressHelper, WizardHelpers

**15. Wizards/WizardHelpers.php (~250 lines)**:
- showArrowChoiceMenu() - arrow navigation menu builder
- askYesNo() - yes/no prompt with validation
- askIPAddress() - IP address prompt with IPv4/IPv6 validation
- askSubnet() - subnet mask prompt with CIDR validation
- showConfigSummary() - configuration review display

**16. Utilities/NetworkInfo.php (~200 lines)** [NEW]:
- Displays comprehensive network information:
  - All IP addresses (IPv4 and IPv6) per interface
  - Routing table (IPv4 and IPv6 routes)
  - DNS servers (from resolv.conf)
  - Default gateways
- Uses Network, System utilities

**17. Utilities/LogViewer.php (~150 lines)** [NEW]:
- viewLogRealtime($logPath) - tail -f implementation
- viewLogFromEnd($logPath) - less +G implementation
- getLogPath($logType) - maps log type to file path
- validateLogPath($path) - security check

**18. Utilities/MenuStyleConfig.php (~80 lines)**:
- Centralized menu styling configuration
- Terminal width detection (tput cols)
- Color scheme definitions
- SelectableStyle configuration

### Technical Reference Details

**Component Interfaces & Signatures**:

```php
namespace MikoPBX\Core\System\ConsoleMenu\Banners;

interface BannerInterface {
    public function render(): string;
    public function autoRefresh(int $intervalSeconds): void;
}

namespace MikoPBX\Core\System\ConsoleMenu\Menus;

interface MenuInterface {
    public function build(): CliMenuBuilder;
    public function show(): void;
}
```

**Data Structures**:

**Network Interface Array** (from Network->getInterface()):
```php
[
    'mac' => '00:11:22:33:44:55',
    'ipaddr' => '192.168.1.100',
    'subnet' => 24,
    'up' => true,
    'ipv6addr' => '2001:db8::1',
    'ipv6_subnet' => '64'
]
```

**LAN Interface Array** (from Network->getEnabledLanInterfaces()):
```php
[
    [
        'id' => '1',
        'interface' => 'eth0',
        'name' => 'LAN',
        'dhcp' => '1',
        'internet' => '1',
        'disabled' => '0',
        'vlanid' => '0',
        // ... all LanInterfaces fields
    ]
]
```

**Configuration Requirements**:

**Environment Detection**:
- LiveCD: Check `/offload/livecd` file
- Docker: Check `/.dockerenv` file
- T2SDE Linux: Check `/etc/t2-sde-build` file

**Translation Key Naming Convention**:
- Prefix: `cm_` (Console Menu)
- Examples: `cm_PbxConsoleSetup`, `cm_SetupLanIpAddress`, `cm_ChooseAction`
- Total existing keys: 126 (en.php and ru.php)
- **New keys needed**: ~30 for log viewer, monitoring menu, network info display

**File Locations**:

**Implementation paths**:
```
/src/Core/System/ConsoleMenu.php                           # Main orchestrator (reduce from 1590 to ~300 lines)
/src/Core/System/ConsoleMenu/Banners/BannerInterface.php
/src/Core/System/ConsoleMenu/Banners/BannerDataCollector.php
/src/Core/System/ConsoleMenu/Banners/WelcomeBanner.php
/src/Core/System/ConsoleMenu/Menus/MenuInterface.php
/src/Core/System/ConsoleMenu/Menus/MainMenu.php
/src/Core/System/ConsoleMenu/Menus/SettingsMenu.php
/src/Core/System/ConsoleMenu/Menus/NetworkMenu.php
/src/Core/System/ConsoleMenu/Menus/MonitoringMenu.php
/src/Core/System/ConsoleMenu/Menus/SystemMenu.php
/src/Core/System/ConsoleMenu/Menus/LogsMenu.php
/src/Core/System/ConsoleMenu/Actions/NetworkActions.php
/src/Core/System/ConsoleMenu/Actions/MonitoringActions.php
/src/Core/System/ConsoleMenu/Actions/SystemActions.php
/src/Core/System/ConsoleMenu/Actions/DiagnosticActions.php
/src/Core/System/ConsoleMenu/Wizards/NetworkWizard.php
/src/Core/System/ConsoleMenu/Wizards/WizardHelpers.php
/src/Core/System/ConsoleMenu/Utilities/NetworkInfo.php
/src/Core/System/ConsoleMenu/Utilities/LogViewer.php
/src/Core/System/ConsoleMenu/Utilities/MenuStyleConfig.php
```

**Translation paths** (29 languages):
```
/src/Common/Messages/en/ConsoleMenu.php     # Add ~30 new keys
/src/Common/Messages/ru/ConsoleMenu.php     # Add ~30 new keys
... (27 more language files)
```

**Log file paths** (for LogViewer):
```
/storage/usbdisk1/mikopbx/log/system/messages
/storage/usbdisk1/mikopbx/log/php/error.log
/storage/usbdisk1/mikopbx/log/nginx/error.log
/storage/usbdisk1/mikopbx/log/asterisk/messages
/storage/usbdisk1/mikopbx/log/fail2ban/fail2ban.log
```

**Critical Dependencies to Preserve**:

1. **Phalcon DI Container**: All classes must use dependency injection via `Di::getDefault()->getShared()`
2. **Translation Service**: Always retrieve via `TranslationProvider::SERVICE_NAME`
3. **Model Events**: Network configuration changes via `LanInterfaces->save()` automatically trigger workers
4. **Terminal Handling**: Maintain `ensureValidTerminal()` logic for modern terminal compatibility
5. **Environment Detection**: All Docker/LiveCD/T2SDE checks must remain functional
6. **Security**: All shell commands must use `escapeshellarg()` for user input

## User Notes

**План реализации**: `/Users/nb/.claude/plans/sharded-wandering-sedgewick.md`

**Архитектура**:
```
src/Core/System/ConsoleMenu/
├── ConsoleMenu.php              # Оркестратор (~300 строк)
├── Banners/
│   ├── BannerInterface.php
│   ├── WelcomeBanner.php        # ESXi-стиль баннер
│   └── BannerDataCollector.php  # Сбор данных
├── Menus/
│   ├── MenuInterface.php
│   ├── MainMenu.php             # 2 пункта (Настройки / Консоль)
│   ├── SettingsMenu.php         # 5 пунктов (группы + спец.пункты)
│   ├── NetworkMenu.php          # Группа: Сеть и подключение
│   ├── MonitoringMenu.php       # NEW: Группа: Мониторинг и диагностика
│   ├── SystemMenu.php           # NEW: Группа: Система
│   └── LogsMenu.php             # NEW: Подменю просмотра логов
├── Actions/
│   ├── NetworkActions.php       # Настройка сети, ping, mtr
│   ├── MonitoringActions.php    # NEW: Логи, sngrep, asterisk диагностика
│   ├── SystemActions.php        # Язык, firewall, storage, пароль, перезагрузка
│   └── DiagnosticActions.php    # mc, утилиты
├── Wizards/
│   ├── NetworkWizard.php
│   └── WizardHelpers.php
└── Utilities/
    ├── NetworkInfo.php          # Детальная сетевая информация
    ├── LogViewer.php            # NEW: Просмотр логов (tail -f, less +G)
    └── MenuStyleConfig.php
```

**Структура меню**:
```
Главное меню (2 пункта):
├─ [1] Изменить настройки
└─ [2] Выйти в SSH консоль

Расширенное меню настроек (5 пунктов):
├─ [1] Сеть и подключение
│   ├─ [1] Настроить сетевые интерфейсы
│   ├─ [2] Показать информацию о сети
│   ├─ [3] Тест связи (ping/mtr)
│   └─ [4] Назад
├─ [2] Мониторинг и диагностика
│   ├─ [1] Просмотр логов (system, asterisk, php, nginx, fail2ban)
│   ├─ [2] Asterisk диагностика (sngrep, CLI, каналы)
│   ├─ [3] Файловый менеджер (mc)
│   └─ [4] Назад
├─ [3] Система
│   ├─ [1] Сменить язык
│   ├─ [2] Firewall
│   ├─ [3] Хранилище
│   ├─ [4] Сбросить пароль
│   ├─ [5] Перезагрузить систему
│   └─ [6] Назад
├─ [4] Установка/Восстановление
└─ [5] Консоль
```

**Этапы** (15-20 часов):
1. Подготовка структуры (30 мин)
2. Баннер (3-4 ч)
3. Меню (2-3 ч)
4. Диагностика (2-3 ч)
5. Сетевая информация (3-4 ч)
6. Рефакторинг (2-3 ч)
7. Переводы (1 ч)
8. Тестирование (2-3 ч)

**Ответы пользователя на вопросы**:
- Баннер: Заставка с автообновлением (как ESXi)
- Возврат из диагностики: Обратно в меню Диагностики
- Сетевая информация: Отдельный пункт меню
- Стиль баннера: Расширенный с цветами

**Дополнительные требования**:

1. **Режимы запуска**:
   - По умолчанию (без ключей): `console-menu` → сразу в главное меню БЕЗ баннера
   - С ключом: `console-menu --banner` → показать баннер с автообновлением, затем меню
   - Автоматический запуск в .profile/.bashrc с ключом `--banner`

2. **Адаптивный размер экрана**:
   - ConsoleMenu адаптируется динамически: `$width = max(80, min(160, tput cols - 4))`
   - Поддержка от 80 до 160 символов в зависимости от терминала
   - **Примечание**: Настройка GRUB для высокого разрешения консоли (`GRUB_GFXMODE=1280x1024`) будет сделана отдельно на этапе сборки дистрибутива (вне рамок этой задачи)

3. **Просмотр логов** (меню с умолчаниями):
   - System messages (с конца - less +G)
   - Asterisk (в реальном времени - tail -f)
   - PHP errors (с конца)
   - Nginx errors (с конца)
   - Fail2ban (с конца)
   - Опция "Выбрать режим вручную" для гибкости

4. **Asterisk диагностика** (базовые 4 пункта для PJSIP):
   - [1] Sngrep (SIP packet capture)
   - [2] Asterisk CLI (интерактивная консоль `asterisk -r`)
   - [3] Активные каналы (`asterisk -rx "core show channels verbose"`)
   - [4] PJSIP endpoints (`asterisk -rx "pjsip show endpoints"`)

## UX Design Decisions (согласовано 2025-12-09)

### Баннер
1. **Взаимодействие**: Любая клавиша → переход в меню, Ctrl+C → выход в shell
2. **Подсказка**: Показывать "Press any key to enter settings menu..." внизу баннера
3. **PBX Name**: Отдельная строка, всегда показывать (не только если изменено)
4. **Статус сервисов**: Компактная строка `Services: Asterisk ● | Nginx ● | PHP ● | Fail2ban ○`
5. **Uptime**: Компактный формат `2d 3h 45m`
6. **Порты**: Web URL + SSH (показывать порт только если нестандартный)

### Сетевая информация
7. **Множественные IP**:
   - Баннер — только primary адрес (IPv4 preferred, fallback IPv6)
   - Детальная информация — все адреса с пометками (DHCPv6/SLAAC/link-local)

### Доступность пунктов меню
8. **Утилиты (mc, sngrep, mtr)**: Проверку не делаем, образы унифицированы
9. **Docker/LiveCD матрица**:

| Пункт меню | Docker | LiveCD | Normal |
|------------|--------|--------|--------|
| Настроить интерфейсы | ❌ | ✓ | ✓ |
| Показать информацию о сети | ✓ | ✓ | ✓ |
| Ping/MTR | ✓ | ✓ | ✓ |
| Просмотр логов | ✓ | ❌ | ✓ |
| Asterisk диагностика | ✓ | ❌ | ✓ |
| Файловый менеджер (mc) | ✓ | ✓ | ✓ |
| Сменить язык | ✓ | ✓ | ✓ |
| Firewall | ✓ | ❌ | ✓ |
| Хранилище | ❌ | ❌ | ✓ |
| Сбросить пароль | ✓ | ❌ | ✓ |
| Перезагрузить | ✓ | ✓ | ✓ |
| Установка | ❌ | ✓ | ❌ |
| Консоль (shell) | ✓ | ✓ | ✓ |

10. **Недоступные пункты**: Скрывать (не показывать неактивными)

### Поведение утилит
11. **Возврат из утилит**: Очистка экрана + сразу в меню (без паузы)
12. **Ошибки при работе с логами**: Сообщение "Log file not found..." + Press Enter для возврата

### Переводы
13. **Все фразы через систему переводов** — никаких hardcoded строк
14. **Файлы переводов**: `src/Common/Messages/{lang}/ConsoleMenu.php` (только ru и en)
15. **Префикс ключей**: `cm_` (Console Menu), например: `cm_PressAnyKey`, `cm_ServiceStatus`

## Work Log
- [2025-12-09] Создана задача, составлен детальный план архитектуры
- [2025-12-09] UX-анализ и уточнения:
  - **3 уровня навигации** (убрали промежуточное "Главное меню с 2 пунктами")
  - **Статус сервисов в баннере** (Asterisk, Nginx, PHP-FPM, Fail2ban)
  - **Узкий терминал < 60 символов** → пропускаем баннер, сразу в меню
  - **Без grep в логах** — достаточно tail -f и less +G
- [2025-12-09] Детальное согласование UX решений (12 пунктов) — см. раздел "UX Design Decisions"
- [2025-12-11] **Исправлена проблема запуска ncurses-приложений (mc, sngrep, mtr) из меню**:
  - **Проблема**: После закрытия CliMenu терминал оставался в некорректном состоянии, ncurses-приложения не реагировали на клавиши и отображали "кракозябры" вместо псевдографики
  - **Решение**: Wrapper script подход — создание временного shell-скрипта который:
    1. Устанавливает правильный TERM в зависимости от типа консоли
    2. Выполняет `reset` для полной реинициализации терминала
    3. Запускает приложение через `exec`
  - **Детекция типа консоли**:
    - `/dev/ttyS*`, `/dev/ttyAMA*` → `TERM=linux` (серийная консоль)
    - `/dev/console` или неизвестный → сохраняем текущий `$TERM` из окружения
    - `/dev/pts/*` → `TERM=xterm-256color` (SSH/PTY)
  - **Протестировано**: SSH, серийная консоль, консоль VM — работает везде
