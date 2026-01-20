
@sessions/CLAUDE.sessions.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with MikoPBX repository.

## Project Overview

MikoPBX is an open-source PBX (Private Branch Exchange) system for small businesses built on Asterisk. It provides a web-based GUI for managing phone system functionality using PHP 8.3 and Phalcon Framework 5.8.

## Repository Information

- Main repository: https://github.com/mikopbx/Core
- Development documentation: https://github.com/mikopbx/DevelopementDocs
- Module template: https://github.com/mikopbx/ModuleTemplate

## Code Style Guides

📖 **PHP Style Standards** - Use the `php-style` skill for comprehensive PHP coding standards (PSR-1, PSR-4, PSR-12) with real examples
📖 **JavaScript Style Standards** - Use the `js-style` skill for comprehensive JavaScript coding standards (ES6+, Fomantic-UI, jQuery patterns)

### Directory Structure

```
src/
├── AdminCabinet/     # Web administration interface (MVC)
│   └── CLAUDE.md     # Admin cabinet development guide
├── Common/           # Shared components, models, translations
│   ├── Providers/    # Service providers for DI container
│   │   └── CLAUDE.md # Detailed providers documentation
│   └── Models/
│       └── CLAUDE.md # Models documentation
├── Core/             # Core PBX functionality
│   ├── Asterisk/     # Asterisk configuration and management
│   │   └── CLAUDE.md # Asterisk integration guide
│   ├── System/       # System utilities (network, storage, processes)
│   └── Workers/      # Background job processors
│       └── CLAUDE.md # Worker development guide
├── Modules/          # Module system base classes
│   └── CLAUDE.md     # Module development guide
├── PBXCoreREST/      # REST API implementation
│   └── CLAUDE.md     # API development guide
└── Service/          # Service layer components

tests/                # Comprehensive test suite
├── AdminCabinet/     # Browser automation tests (PHPUnit + Selenium)
│   └── CLAUDE.md     # Browser test development guide
├── api/              # REST API tests (pytest)
├── pycalltests/      # SIP call flow tests (pytest + PJSUA2)
│   └── README.md     # Call flow testing guide
└── PBXCoreREST/      # REST API unit tests

sites/               # Web assets and entry points
resources/           # Static resources (DB, sounds, rootfs)
```

## Container Environment

### Container Management
Use the **`container-inspector`** skill to manage containers and get connection parameters:
- Get container IP addresses and ports
- Restart containers after code changes (Docker and LXC)
- Restart specific workers
- View container status and health checks

**Note:** MikoPBX supports both Docker and LXC containers. The container-inspector skill works with both environments.

### Log Analysis
Use the **`log-analyzer`** skill to diagnose issues:
- Analyze system logs for errors
- Track worker processes
- Monitor API request flow
- Debug database and worker issues

### Important Paths
- **Database**: `/cf/conf/mikopbx.db`
- **System messages**: `/storage/usbdisk1/mikopbx/log/system/messages`
- **PHP errors**: `/storage/usbdisk1/mikopbx/log/php/error.log`
- **Nginx errors**: `/storage/usbdisk1/mikopbx/log/nginx/error.log`
- **Asterisk logs**: `/storage/usbdisk1/mikopbx/log/asterisk/`
- **Fail2ban logs**: `/storage/usbdisk1/mikopbx/log/fail2ban/fail2ban.log`

### Test Directory Mapping
Tests are automatically synchronized between host and container:
- **Host**: `src/Core/tests`
- **Container**: `/offload/rootfs/usr/www/tests`

**SIP Call Flow Tests** (pycalltests):
- Run inside Docker container using PJSUA2 Python SWIG bindings
- Direct file system access for voicemail, recordings, and audio validation
- See `tests/pycalltests/README.md` for complete documentation


### Core Components

1. **Dependency Injection**: Phalcon's DI container with service providers pattern
   - Common services in `src/Common/Providers/`
   - Core services in `src/Core/Providers/`

2. **Worker System**: Background job processing using multiple patterns
   - Base class: `src/Core/Workers/WorkerBase.php`
   - Queue-based workers: Beanstalkd (CDR, Events) and Redis (API) with priorities
   - File-based workers: JSON task files for async operations (WAV to WebM conversion)
   - Supervisor: `WorkerSafeScriptsCore` monitors and restarts all workers

3. **Module System**: Extensible plugin architecture
   - Base class: `src/Modules/PbxExtensionBase.php`
   - Located in `/var/www/mikopbx/` on deployed systems

4. **Asterisk Configuration**: Dynamic config generation system
   - Generators in `src/Core/Asterisk/Configs/`
   - Stage-based generation (pre-generate → generate → post-generate)
   - Dual-stack IPv4/IPv6 support in network configurations

5. **Event System**: Nginx nchan-based pub/sub messaging
   - EventBusProvider publishes events via REST API
   - WebSocket connections for real-time browser updates

6. **Database Architecture**: SQLite for main DB and CDR storage
   - Models in `src/Common/Models/`
   - Separate CDR database for performance

7. **REST API**: Queue-based REST API architecture
   - Controllers handle HTTP requests
   - Requests are queued to Redis for async processing
   - Dual-stack IPv4/IPv6 network configuration endpoints

8. **Admin Cabinet**: Web administration interface
   - MVC architecture with Phalcon + Volt templates
   - Semantic UI for frontend components
   - IPv6 support in network configuration forms

9. **Network Utilities**: Dual-stack IP address handling
   - `src/Core/Utilities/IpAddressHelper.php` - IPv4/IPv6 validation and utilities
   - CIDR notation parsing for both IP versions
   - Network membership checking (isIpInCidr)

10. **DHCPv6 Client**: Enterprise-grade IPv6 autoconfiguration
   - `src/Core/System/Udhcpc6.php` - DHCPv6 event handler (bound/renew/deconfig)
   - BusyBox udhcpc6 integration for stateful DHCPv6
   - Automatic SLAAC fallback when DHCPv6 unavailable
   - Dual-stack addressing (DHCPv6 and SLAAC coexist)
   - IPv6 DNS server integration via DHCPv6 options
   - Callback script: `/etc/rc/udhcpc6_configure`

11. **Cloud Provisioning**: Unified system for automatic configuration
   - `src/Core/System/CloudProvisioning/` - Cloud provider detection and provisioning
   - Supports Docker ENV variables, cloud IMDS metadata, and NoCloud datasources
   - User-data parsing for YAML/JSON cloud-init format
   - Direct SQLite access for early boot provisioning (no Redis dependency)
   - SSRF and SQL injection protections
   - 9 providers: Docker, AWS, Google Cloud, Azure, Yandex, DigitalOcean, Vultr, VKCloud, Alibaba, NoCloud

12. **Boot System**: Intelligent boot initialization with universal console handling
   - `/sbin/pbx_boot_init` - Main boot orchestrator with smart console redirect
   - `/sbin/mountoffload` - Partition 2 (rootfs) mount script with disk detection
   - `/etc/rc/mountconfdir` - Partition 3 (config database) mount script
   - `/sbin/pbx-message` - Unified message handler (console + serial output)
   - Smart console detection: Tests accessibility before redirect
   - Universal compatibility: Bare-metal, VMware, KVM, Docker, LXC
   - Prevents boot failures on VMs without serial console configuration
   - Version output as early diagnostic marker and console test

### Key Design Patterns

- **MVC Pattern**: Clear separation in AdminCabinet
- **Provider Pattern**: Service registration and dependency injection
- **Worker Pattern**: Async job processing with queue management
- **Hook System**: Modules can hook into various system processes
- **Stage Pattern**: Multi-stage configuration generation
- **DHCP Callback Pattern**: Event-driven network configuration
  - IPv4: `Udhcpc` class handles udhcpc events via `/etc/rc/udhcpc_configure`
  - IPv6: `Udhcpc6` class handles udhcpc6 events via `/etc/rc/udhcpc6_configure`
  - Database always synchronized regardless of Docker environment
  - Network commands conditional based on execution context
- **Smart Console Pattern**: Intelligent output routing with fallback
  - Test console accessibility before redirect (prevents VMware boot failures)
  - Unified message handler separates console and serial output
  - Container-aware (Docker/LXC detection for appropriate output handling)
  - Early diagnostic output (version as console test)

### Important Classes and Interfaces

- `WorkerBase` - Base class for all background workers
- `PbxExtensionBase` - Base class for all modules
- `ConfigInterface` - Interface for module configuration hooks
- `AsteriskConfInterface` - Interface for Asterisk config generation
- `PBXCoreREST` - Main REST API entry point
- `System` - System utilities with container detection methods:
  - `isDocker()` - Returns true ONLY for Docker containers
  - `isLxc()` - Returns true ONLY for LXC containers
  - `isContainer()` - Returns true for any container type
  - `canManageNetwork()` - Capability check for network configuration
  - `canManageFirewall()` - Capability check for iptables/firewall
- `IpAddressHelper` - Dual-stack IPv4/IPv6 address utilities (validation, CIDR parsing, network checks)
- `Network` - Network configuration manager (IPv4/IPv6 interface configuration, DHCP client management, LXC support)
- `Udhcpc` - IPv4 DHCP client event handler (database synchronization, interface configuration, LXC network commands)
- `Udhcpc6` - IPv6 DHCPv6 client event handler (stateful DHCPv6, SLAAC coexistence, DNS integration, LXC support)
- `DnsConf` - DNS configuration generator (dual-stack IPv4/IPv6 nameserver support, Docker DNS preservation)
- `IptablesConf` - Firewall configuration (supports LXC with capability check, skipped in Docker)
- `CloudProvider` - Abstract base class for all cloud provisioning providers (direct SQLite access, user-data parsing)
- `ProvisioningConfig` - DTO for unified configuration from ENV, YAML, JSON sources (validation, sanitization, merging)
- `NoCloud` - On-premise provisioning provider (ISO, seed directory, HTTP endpoint, kernel cmdline)

### System Services (managed by monit)

- `asterisk` - Main PBX engine
- `beanstalkd` - Job queue for modules and CDR
- `redis` - Cache and IPC and REST API queue
- `php-fpm` - PHP process manager
- `nginx` - Web server
- `fail2ban` - Security service

### IPv6 Implementation Details

**Supported IPv6 Modes** (configured via `LanInterfaces` model):
- **Mode 0 (Off)**: IPv6 completely disabled on interface
- **Mode 1 (Auto)**: DHCPv6 with SLAAC fallback (enterprise-grade autoconfiguration)
- **Mode 2 (Manual)**: Static IPv6 address and gateway configuration

**Mode 1 (Auto) Behavior - DHCPv6 + SLAAC:**
- Primary: DHCPv6 stateful client (BusyBox udhcpc6) obtains address from DHCPv6 server
- Fallback: SLAAC continues when DHCPv6 server unavailable
- Both addresses coexist on same interface (dual addressing)
- Priority: DHCPv6 address preferred over SLAAC per RFC 6724
- DNS: IPv6 nameservers obtained via DHCPv6 options (integrated in `/etc/resolv.conf`)

**Implementation Architecture:**
- `Network::configureIpv6Interface()` - Configures interface based on mode (lines 674-788)
- `Network::lanConfigure()` - Orchestrates network configuration on boot and changes
- `Udhcpc6::configure()` - Handles DHCPv6 events (bound/renew/deconfig)
- `DnsConf::resolveConfGenerate()` - Merges IPv4/IPv6 DNS servers (lines 62-159)
- `Network::getHostDNS6()` - Retrieves IPv6 DNS from LanInterfaces (lines 638-660)

**Database Schema** (`m_LanInterfaces` table):
- `ipv6_mode`: '0'=Off, '1'=Auto, '2'=Manual
- `ipv6addr`: IPv6 address (empty in Auto until DHCPv6 binds)
- `ipv6_subnet`: Prefix length (1-128)
- `ipv6_gateway`: IPv6 gateway (optional, DHCPv6 uses RA)
- `primarydns6`, `secondarydns6`: IPv6 DNS servers

**Security Features:**
- Shell argument escaping via `escapeshellarg()` in all network commands
- Parameterized SQL queries in DHCP callback handlers
- Validation using `IpAddressHelper::isIpv6()` before database storage

**Container Environment Handling:**
- DHCP callbacks always update database (fixes stale IP display bug)
- Network commands behavior depends on container type:
  - **Docker**: Network commands skipped (runtime manages networking)
  - **LXC**: Network commands executed (container manages its own network)
  - **Bare-metal**: Network commands executed
- Critical for consistent UI/API responses across all deployment environments
- LXC containers have full DHCP client support (IPv4 and IPv6)

### Cloud Provisioning Architecture

**Unified Configuration System** - All deployment environments use the same provisioning flow:
- **Boot Sequence**: `SystemLoader::start()` → `CloudProvisioning::start()` (line 368)
- **Provider Detection**: Async parallel checks using GuzzleHttp promises (3-second timeout)
- **Priority Order**: Docker ENV → Cloud IMDS → NoCloud datasources
- **One-time Execution**: `CLOUD_PROVISIONING` key in PbxSettings prevents re-provisioning

**ProvisioningConfig DTO** (`src/Core/System/CloudProvisioning/ProvisioningConfig.php`):
- Factory methods: `fromEnvironment()`, `fromYaml()`, `fromJson()`, `fromArray()`
- Validation: RFC 1123 hostname, IPv4/IPv6 address, topology (public/private)
- Sanitization: Length limits, control character removal, XSS prevention
- Merge strategy: User-data overrides IMDS metadata
- Empty check: `isEmpty()` method for conditional provisioning

**CloudProvider Base Class** (`src/Core/System/CloudProvisioning/CloudProvider.php`):
- Abstract methods: `checkAvailability(): PromiseInterface`, `provision(): bool`
- Direct SQLite access: 11 methods bypass Phalcon ORM to avoid Redis dependency during early boot
- User-data support: `fetchUserData()` and `parseUserData()` (YAML/JSON auto-detection)
- Configuration application: `applyConfigDirect(ProvisioningConfig)` unified method
- Security: SQL injection prevention (key validation, value escaping), SSRF protection

**Cloud Providers** (9 implementations):
1. **DockerCloud** - Environment variables from container runtime
2. **AWSCloud** - EC2 IMDS at 169.254.169.254 (partition detection)
3. **GoogleCloud** - GCE metadata with `Metadata-Flavor: Google` header
4. **AzureCloud** - Azure IMDS with `Metadata: true` header
5. **YandexCloud** - Yandex Cloud metadata (Google-compatible API)
6. **DigitalOceanCloud** - Droplet metadata with vendor-data detection
7. **VultrCloud** - Single JSON endpoint with instance-v2-id
8. **VKCloud** - VK Cloud (OpenStack-based) with multi-check detection
9. **AlibabaCloud** - Alibaba Cloud IMDS at 100.100.100.200
10. **NoCloud** - On-premise VMware/Proxmox/KVM (ISO, seed, HTTP, cmdline)

**User-Data Format** (Cloud-init compatible YAML/JSON):
```yaml
#cloud-config
mikopbx:
  hostname: my-pbx
  ssh_authorized_keys:
    - ssh-rsa AAAA...
  web_password: secret123
  pbx_settings:
    PBXLanguage: ru-ru
    SIPPort: 5060
  network:
    topology: private
    extipaddr: 1.2.3.4
```

**NoCloud Datasources** (priority order):
1. Kernel cmdline: `ds=nocloud;s=http://...`
2. CIDATA ISO: `/dev/sr0`, `/dev/sr1` with `LABEL=CIDATA`
3. Seed directories: `/var/lib/cloud/seed/nocloud/`, `/var/lib/cloud/seed/nocloud-net/`
4. HTTP endpoint: URL from kernel cmdline `s=` parameter

**Security Protections:**
- **SQL Injection**: Key validation against whitelist, value escaping with `escapeshellarg()`
- **SSRF (NoCloud HTTP)**: Private IP blocking by default, `NOCLOUD_ALLOW_PRIVATE_IPS=1` override for on-premise
- **XSS (ProvisioningConfig)**: Control character removal, length limits, hostname/IP validation
- **Resource Exhaustion**: Max string length 1024, max SSH keys 65536, max hostname 253

**ContainerEntrypoint** (formerly DockerEntrypoint):
- Unified entry point for Docker and LXC containers
- Delegates provisioning to `CloudProvisioning::start()`
- DockerCloud handles ENV variables, LxcCloud handles Proxmox files
- All ENV variables work identically across container types

**Direct SQLite Methods** (avoid Redis dependency):
- `loadPbxSettingsDirectly()` - Read all settings into cache
- `updatePbxSettingsDirect()` - UPDATE or INSERT with validation
- `loadLanInterfaceDirectly()` - Read first LAN interface
- `updateLanSettingDirect()` - UPDATE column with whitelist validation
- `updateHostnameDirect()` - Update both PbxSettings and LanInterfaces
- `updateJsonSettingsDirect()` - Modify `/etc/inc/mikopbx-settings.json` for service ports

**Deployment Examples**:
- **AWS EC2**: User-data in launch configuration
- **Google Cloud**: Custom metadata or startup script
- **Docker**: `docker run -e WEB_ADMIN_PASSWORD=secret123`
- **VMware**: Attach CIDATA ISO with meta-data/user-data files
- **Proxmox**: Cloud-init drive with NoCloud datasource

## Development Guidelines

### Code Snippets
```php
// For CLI PHP scripts and tests
require_once 'Globals.php'; // !!!IMPORTANT!!! NO NEED ANY PATH 
```

### Translation Management
Use the **`translations`** skill to manage multilingual translations:
- Add new translation keys (Russian-first workflow)
- Translate to all 29 languages
- Check consistency across languages
- Remove obsolete translation keys

### Frontend Development
- Include new JS/CSS through AssetProvider
- Use **`babel-compiler`** skill to transpile ES6+ JavaScript to ES5
- Use **`js-style`** skill to validate JavaScript code style

## Quick Links to Development Guides

### Core Development
- **[Module Development](src/Modules/CLAUDE.md)** - Create custom modules
- **[Worker Development](src/Core/Workers/CLAUDE.md)** - Build background workers
- **[REST API Development](src/PBXCoreREST/CLAUDE.md)** - Add new API endpoints
- **[Admin UI Development](src/AdminCabinet/CLAUDE.md)** - Extend web interface
- **[Asterisk Integration](src/Core/Asterisk/CLAUDE.md)** - Work with Asterisk
- **[Models Documentation](src/Common/Models/CLAUDE.md)** - Database models guide
- **[Providers Documentation](src/Common/Providers/CLAUDE.md)** - DI providers guide

### Testing
- **[Browser Tests](tests/AdminCabinet/CLAUDE.md)** - Web UI automation with Selenium/PHPUnit
- **[Call Flow Tests](tests/pycalltests/README.md)** - SIP testing with PJSUA2 (conferences, IVR, voicemail, parking, recording, codecs)

## Specialized Agents

MikoPBX includes specialized autonomous agents in `.claude/agents/` for complex multi-step tasks:

### Testing & Quality Assurance
- **`test-fix-loop-agent`** - Automated testing with error remediation loop. Runs Python pytest tests, monitors logs for exceptions, fixes detected issues, and repeats until all tests pass. Use when you need continuous integration with self-healing capabilities. [Documentation](tests/api/README_TEST_FIX_LOOP.md)

### Code Optimization & Refactoring
- **`js-optimizer-mikopbx`** - Optimize JavaScript code for MikoPBX (Fomantic UI, ES6 airbnb style, transpilation)
- **`php-refactoring-specialist`** - Refactor PHP code to modern PHP 8.3 standards
- **`security-audit-analyzer`** - Comprehensive security analysis of web applications

### Translation Management
- **`pbx-translation-expert`** - Manage multilingual translations with Russian-first workflow

### API Testing
- **`rest-api-docker-tester`** - Test REST API endpoints inside Docker containers with CURL

### Web Testing
- **`mikopbx-web-tester`** - Test MikoPBX web interface functionality with Playwright
- **`playwright-test-generator`** - Generate automated browser tests
- **`playwright-test-healer`** - Debug and fix failing Playwright tests
- **`playwright-test-planner`** - Create comprehensive test plans

**Usage**: Agents are launched automatically by Claude when your request matches their capabilities, or you can explicitly request them:

**Examples:**
- "Run API tests in fix loop until all pass" → launches `test-fix-loop-agent`
- "Optimize extension-modify.js" → launches `js-optimizer-mikopbx`
- "Refactor UserController.php to PHP 8.3" → launches `php-refactoring-specialist`
- "Test the extension creation form" → launches `mikopbx-web-tester`
- "Audit authentication module for security" → launches `security-audit-analyzer`

## Available Development Skills

MikoPBX includes specialized skills in `.claude/skills/` that activate automatically based on your request.

### Database & API Testing
- **`sqlite-inspector`** - Verify database after API operations / Проверка базы данных после операций API
- **`openapi-analyzer`** - Analyze OpenAPI spec (259 endpoints) / Анализ OpenAPI спецификации
- **`api-test-generator`** - Generate pytest tests for API endpoints / Генерация pytest тестов
- **`endpoint-validator`** - Validate API compliance with OpenAPI / Валидация соответствия API
- **`api-client`** - Execute REST API requests with auto-auth / Выполнение REST API запросов
- **`auth-token-manager`** - Obtain JWT Bearer tokens / Получение JWT токенов

### Container & Infrastructure
- **`container-inspector`** - Manage Docker containers (mikopbx-php83/php74) / Управление контейнерами
- **`log-analyzer`** - Analyze container logs for debugging / Анализ логов контейнера
- **`asterisk-validator`** - Validate Asterisk configuration and logs / Валидация конфигурации Asterisk
- **`asterisk-tester`** - Test Asterisk dialplan scenarios / Тестирование Asterisk dialplan
- **`teamcity-monitor`** - Monitor CI/CD pipeline and analyze build failures / Мониторинг сборок TeamCity
- **`browserstack-tester`** - Run PHPUnit Selenium tests via BrowserStack / Запуск тестов веб-интерфейса через BrowserStack

### Code Quality & Style
- **`php-style`** - PHP standards (PSR-1/4/12, PHP 8.3 features) / PHP стандарты
- **`js-style`** - JavaScript standards (ES6+, Fomantic UI, jQuery) / JavaScript стандарты
- **`code-search`** - Syntax-aware code search using ast-grep / Синтаксический поиск кода
- **`babel-compiler`** - Transpile ES6+ JavaScript to ES5 / Транспиляция JavaScript

### Development Tools
- **`translations`** - Manage translations across 29 languages / Управление переводами
- **`restapi-translations`** - Manage REST API translation keys (rest_*) / Управление ключей переводов REST API
- **`commit-messages`** - Generate git commit messages / Генерация сообщений коммитов

**Usage**: Simply describe what you need in natural language (English or Russian). Claude will automatically select and use the appropriate skill(s).

**Examples:**
- "Check if extension 201 was created in database" / "проверь в базе создался ли extension 201"
- "Generate tests for Extensions API" / "создай тесты для Extensions API"
- "Find all REST API Actions" / "найди все REST API Actions"
- "Transpile extension-modify.js" / "транспилируй extension-modify.js"
- "Get authentication token" / "получи токен для API"
- "Restart mikopbx-php83 container" / "перезапусти контейнер mikopbx-php83"
- "Check REST API translations" / "проверь переводы REST API"
- "Sync RestApi.php translations" / "синхронизируй переводы RestApi.php"
- "Check TeamCity build status" / "проверь статус сборки в TeamCity"

### Security & Guidelines
- **[XSS Protection](docs/xss-protection-guidelines.md)** - Cross-site scripting prevention
- **[DataTable Guidelines](docs/datatable-semantic-ui-guidelines.md)** - DataTable implementation
- **[Tooltip Guidelines](docs/TOOLTIP_GUIDELINES.md)** - UI tooltip standards

## External Documentation

### Core Technologies
- 📖 **[Phalcon Framework](https://github.com/phalcon/cphalcon)** - High performance PHP framework
- 📖 **[Fomantic-UI](https://github.com/fomantic/fomantic-ui)** - Community fork of Semantic-UI
- 📖 **[PHP Documentation](https://github.com/php/doc-en)** - Official PHP documentation
- 📖 **[Asterisk Documentation](https://github.com/asterisk/documentation)** - Official Asterisk docs

### Container Support

MikoPBX runs in a single container which includes all services:
- PHP 8.3 application
- SQLite database
- Redis cache
- Beanstalkd queue
- Asterisk PBX
- Nginx web server

**Supported Container Types:**

1. **Docker** - Application container
   - Runtime manages networking, storage, time synchronization
   - MikoPBX skips network/firewall configuration
   - Uses Docker bridge for networking
   - Port forwarding managed externally

2. **LXC** - System container (lightweight VM)
   - Container manages its own network configuration
   - Full network/DHCP/firewall support (if granted capabilities)
   - Behaves like a VM from MikoPBX perspective
   - Ideal for on-premise virtualization (Proxmox, etc.)

**Detection Methods:**

MikoPBX uses capability-based detection instead of binary environment checks:

- **`System::isDocker()`** - Returns true ONLY for Docker (checks `/.dockerenv`)
- **`System::isLxc()`** - Returns true ONLY for LXC (checks `container=lxc` env var)
- **`System::isContainer()`** - Returns true for both Docker and LXC
- **`System::canManageNetwork()`** - Returns false for Docker, true for LXC/bare-metal
- **`System::canManageFirewall()`** - Returns false for Docker, checks iptables capability for LXC

**Shell Script Helpers:**

Matching shell functions available in `/sbin/shell_functions.sh`:
- `is_docker()` - Detects Docker environment
- `is_lxc()` - Detects LXC environment
- `is_container()` - Detects any container
- `can_manage_network()` - Checks network configuration capability

**Boot and Console Handling:**

MikoPBX uses smart console detection to ensure reliable boot across all environments:

- **Console Redirect Strategy**: `/sbin/pbx_boot_init` tests `/dev/console` accessibility before redirect
  - Test write with version output (early diagnostic marker)
  - Only redirects if console is writable and accepts output
  - Prevents boot failures on VMware VMs without serial console

- **Message Output System**: `/sbin/pbx-message` provides unified output handling
  - Console output: Always via stdout
  - Serial output: Container-aware detection and routing
  - Docker: Serial output skipped (runtime manages console)
  - LXC: Serial output skipped (stdout already to /dev/tty1)
  - Bare-metal: Serial port auto-detection with caching

- **Universal Compatibility**: Boot works without configuration changes
  - VMware VMs with or without serial console
  - Bare-metal servers with IPMI/serial
  - KVM/QEMU virtual machines
  - Docker containers (console managed by runtime)
  - LXC containers (console to /dev/tty1)

**LXC Container Features:**

When running in LXC, MikoPBX has full capabilities:
- Network interface configuration (static IP, DHCP)
- IPv4 DHCP client (udhcpc)
- IPv6 DHCPv6 client (udhcpc6) with SLAAC fallback
- DNS configuration
- Firewall rules (if `CAP_NET_ADMIN` granted)
- Fail2ban intrusion prevention

**Docker vs LXC Comparison:**

| Feature | Docker | LXC | Bare-Metal |
|---------|--------|-----|------------|
| Boot Console | Runtime | /dev/tty1 | Smart detect |
| Serial Output | Skipped | Skipped | Auto-detect |
| Network Config | Runtime | Container | Container |
| DHCP Client | Skipped | Supported | Supported |
| IPv6 Auto (DHCPv6) | Skipped | Supported | Supported |
| Firewall (iptables) | Host | Container* | Container |
| DNS Config | 127.0.0.11 | Container | Container |
| NTP Sync | Host | Host | Container |
| ACPI Events | N/A | N/A | Supported |

*LXC firewall requires `CAP_NET_ADMIN` capability

## Philosophy

### Error Handling

- **Fail fast** for critical configuration (missing text model)
- **Log and continue** for optional features (extraction model)
- **Graceful degradation** when external services unavailable
- **User-friendly messages** through resilience layer

### Testing

- Always use the test-runner agent to execute tests.
- Do not use mock services for anything ever.
- Do not move on to the next test until the current test is complete.
- If the test fails, consider checking if the test is structured correctly before deciding we need to refactor the codebase.
- Tests to be verbose so we can use them for debugging.


## Tone and Behavior

- Criticism is welcome. Please tell me when I am wrong or mistaken, or even when you think I might be wrong or mistaken.
- Please tell me if there is a better approach than the one I am taking.
- Please tell me if there is a relevant standard or convention that I appear to be unaware of.
- Be skeptical.
- Be concise.
- Short summaries are OK, but don't give an extended breakdown unless we are working through the details of a plan.
- Do not flatter, and do not give compliments unless I am specifically asking for your judgement.
- Occasional pleasantries are fine.
- Feel free to ask many questions. If you are in doubt of my intent, don't guess. Ask.

## ABSOLUTE RULES:

- NO PARTIAL IMPLEMENTATION
- NO SIMPLIFICATION : no "//This is simplified stuff for now, complete implementation would blablabla"
- NO CODE DUPLICATION : check existing codebase to reuse functions and constants Read files before writing new functions. Use common sense function name to find them easily.
- NO DEAD CODE : either use or delete from codebase completely
- IMPLEMENT TEST FOR EVERY FUNCTIONS
- NO CHEATER TESTS : test must be accurate, reflect real usage and be designed to reveal flaws. No useless tests! Design tests to be verbose so we can use them for debuging.
- NO INCONSISTENT NAMING - read existing codebase naming patterns.
- NO OVER-ENGINEERING - Don't add unnecessary abstractions, factory patterns, or middleware when simple functions would work. Don't think "enterprise" when you need "working"
- NO MIXED CONCERNS - Don't put validation logic inside API handlers, database queries inside UI components, etc. instead of proper separation
- NO RESOURCE LEAKS - Don't forget to close database connections, clear timeouts, remove event listeners, or clean up file handles
- use Phalcon\Di\Di; instead of use Phalcon\Di; in imports.|