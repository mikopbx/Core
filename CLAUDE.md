# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with MikoPBX repository.

## Project Overview

MikoPBX is an open-source PBX (Private Branch Exchange) system for small businesses built on Asterisk. It provides a web-based GUI for managing phone system functionality using PHP 8.3 and Phalcon Framework 5.8.

## Repository Information

- Main repository: https://github.com/mikopbx/Core
- Development documentation: https://github.com/mikopbx/DevelopementDocs
- Module template: https://github.com/mikopbx/ModuleTemplate

## Code Style Guides

📖 **[PHP Style Guide](PHP-STYLE-GUIDE.md)** - Comprehensive PHP coding standards with real examples
📖 **[JavaScript Style Guide](sites/admin-cabinet/assets/js/JS-STYLE-GUIDE.md)** - Frontend JavaScript patterns and best practices

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
sites/               # Web assets and entry points
resources/           # Static resources (DB, sounds, rootfs)
```

## Docker Environment

### Container Access
Access the main PHP container for debugging:
```bash
# Interactive shell
docker exec -it <containerId> /bin/sh

# View system logs
docker exec <containerId> tail -f /storage/usbdisk1/mikopbx/log/system/messages

# Monitor specific processes
docker exec <containerId> ps -ah | grep WorkerApiCommands

# Search logs for specific patterns
docker exec <containerId> tail -500 /storage/usbdisk1/mikopbx/log/system/messages | grep -E "soft|orphan|WorkerApiCommands"

# PHPStan analysis
docker exec <containerId> /offload/rootfs/usr/www/vendor/bin/phpstan analyse "/offload/rootfs/usr/www/src/Core/System/DockerNetworkFilterService.php"
```

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


### Core Components

1. **Dependency Injection**: Phalcon's DI container with service providers pattern
   - Common services in `src/Common/Providers/`
   - Core services in `src/Core/Providers/`

2. **Worker System**: Background job processing using Beanstalkd queue and Redis for IPC
   - Base class: `src/Core/Workers/WorkerBase.php`
   - Jobs are queued to specific tubes with priorities

3. **Module System**: Extensible plugin architecture
   - Base class: `src/Modules/PbxExtensionBase.php`
   - Located in `/var/www/mikopbx/` on deployed systems

4. **Asterisk Configuration**: Dynamic config generation system
   - Generators in `src/Core/Asterisk/Configs/`
   - Stage-based generation (pre-generate → generate → post-generate)

5. **Event System**: Nginx nchan-based pub/sub messaging
   - EventBusProvider publishes events via REST API
   - WebSocket connections for real-time browser updates

6. **Database Architecture**: SQLite for main DB and CDR storage
   - Models in `src/Common/Models/`
   - Separate CDR database for performance

7. **REST API**: Queue-based REST API architecture
   - Controllers handle HTTP requests
   - Requests are queued to Redis for async processing

8. **Admin Cabinet**: Web administration interface
   - MVC architecture with Phalcon + Volt templates
   - Semantic UI for frontend components

### Key Design Patterns

- **MVC Pattern**: Clear separation in AdminCabinet
- **Provider Pattern**: Service registration and dependency injection
- **Worker Pattern**: Async job processing with queue management
- **Hook System**: Modules can hook into various system processes
- **Stage Pattern**: Multi-stage configuration generation

### Important Classes and Interfaces

- `WorkerBase` - Base class for all background workers
- `PbxExtensionBase` - Base class for all modules
- `ConfigInterface` - Interface for module configuration hooks
- `AsteriskConfInterface` - Interface for Asterisk config generation
- `PBXCoreREST` - Main REST API entry point

### System Services (managed by monit)

- `asterisk` - Main PBX engine
- `beanstalkd` - Job queue for modules and CDR
- `redis` - Cache and IPC and REST API queue
- `php-fpm` - PHP process manager
- `nginx` - Web server
- `fail2ban` - Security service

## Development Guidelines

### Code Snippets
```php
// For CLI PHP scripts and tests
require_once 'Globals.php'; // !!!IMPORTANT!!! NO NEED ANY PATH 
```

### Translation Guidelines
- Add translations only to Russian
- System auto-translates to other languages via weblate.mikopbx.com

### Frontend Development
- Include new JS/CSS through AssetProvider

## Quick Links to Development Guides

- **[Module Development](src/Modules/CLAUDE.md)** - Create custom modules
- **[Worker Development](src/Core/Workers/CLAUDE.md)** - Build background workers
- **[REST API Development](src/PBXCoreREST/CLAUDE.md)** - Add new API endpoints
- **[Admin UI Development](src/AdminCabinet/CLAUDE.md)** - Extend web interface
- **[Asterisk Integration](src/Core/Asterisk/CLAUDE.md)** - Work with Asterisk
- **[Models Documentation](src/Common/Models/CLAUDE.md)** - Database models guide
- **[Providers Documentation](src/Common/Providers/CLAUDE.md)** - DI providers guide
- **[Test Suite](tests/AdminCabinet/CLAUDE.md)** - Browser automation tests

### Security & Guidelines
- **[XSS Protection](docs/xss-protection-guidelines.md)** - Cross-site scripting prevention
- **[CSRF Protection](docs/csrf-protection-guidelines.md)** - CSRF attack prevention
- **[DataTable Guidelines](docs/datatable-semantic-ui-guidelines.md)** - DataTable implementation
- **[Tooltip Guidelines](docs/TOOLTIP_GUIDELINES.md)** - UI tooltip standards

## External Documentation

### Core Technologies
- 📖 **[Phalcon Framework](https://github.com/phalcon/cphalcon)** - High performance PHP framework
- 📖 **[Fomantic-UI](https://github.com/fomantic/fomantic-ui)** - Community fork of Semantic-UI
- 📖 **[PHP Documentation](https://github.com/php/doc-en)** - Official PHP documentation
- 📖 **[Asterisk Documentation](https://github.com/asterisk/documentation)** - Official Asterisk docs

- 
### Container
MikoPBX runs in a single container which includes all services:
- PHP 8.3 application
- SQLite database
- Redis cache
- Beanstalkd queue
- Asterisk PBX
- Nginx web server

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


## Коммит паттерн

```bash
git commit -m "feat: migrate ResourceName to Single Source of Truth pattern

Implements comprehensive refactoring following CallQueues/IvrMenu pattern:

DataStructure:
- Add getParameterDefinitions() with request/response sections
- Centralize all field definitions (sanitization, validation, defaults)
- Replace legacy ParameterSanitizationExtractor
- Document constraints (min/max, enum, pattern)

SaveRecordAction:
- Rewrite using 7-phase processing pipeline
- Fixes: Defaults no longer applied on PATCH
- Add comprehensive WHY comments

Validation:
✅ [List specific constraints tested]

DO NOT ADD Generated with Claude Code

DO NOT ADD Co-Authored-By: Claude <noreply@anthropic.com>"
```