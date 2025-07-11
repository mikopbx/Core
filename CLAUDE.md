# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MikoPBX is an open-source PBX (Private Branch Exchange) system for small businesses built on Asterisk. It provides a web-based GUI for managing phone system functionality using PHP 8.3 and Phalcon Framework 5.8.

## Repository Information

- Main repository: https://github.com/mikopbx/Core
- Development documentation: https://github.com/mikopbx/DevelopementDocs
- Module template: https://github.com/mikopbx/ModuleTemplate

## Code Style Guides

📖 **[PHP Style Guide](PHP-STYLE-GUIDE.md)** - Comprehensive PHP coding standards with real examples
📖 **[JavaScript Style Guide](sites/admin-cabinet/assets/js/JS-STYLE-GUIDE.md)** - Frontend JavaScript patterns and best practices

## Development Commands

### Installation and Dependencies
```bash
composer install
```

### Code Quality and Linting
```bash
# Run PHP CodeSniffer (PSR-12 standard)
composer phpcs

# Run PHPStan static analysis
vendor/bin/phpstan analyse src --memory-limit 120M --level=0
```

### Testing
```bash
# Run unit tests
vendor/bin/phpunit -c tests/Unit/phpunit.xml

# Run admin cabinet UI tests
vendor/bin/phpunit -c tests/AdminCabinet/phpunit.xml

# Run Asterisk call tests
./tests/Calls/start.sh

# Generate test data for various components
composer generate-extensions-tests
composer generate-sip-providers-tests
composer generate-call-queues-tests
composer generate-modules-tests
# See composer.json scripts section for full list
```

## Architecture Overview

### Core Components

1. **Dependency Injection**: The system uses Phalcon's DI container with service providers pattern. Services are registered in:
   - `src/Common/Providers/` - Common services (DB, models, CDR, etc.)
   - `src/Core/Providers/` - Core services (config, license, Asterisk managers)
   - See [`src/Common/Providers/CLAUDE.md`](src/Common/Providers/CLAUDE.md) for detailed provider documentation

2. **Worker System**: Background job processing using Beanstalkd queue and Redis for IPC:
   - Base class: `src/Core/Workers/WorkerBase.php`
   - Workers handle API requests, call events, system tasks
   - Jobs are queued to specific tubes with priorities
   - See [`src/Core/Workers/CLAUDE.md`](src/Core/Workers/CLAUDE.md) for detailed worker development guide

3. **Module System**: Extensible plugin architecture:
   - Base class: `src/Modules/PbxExtensionBase.php`
   - Modules implement interfaces to hook into system functionality
   - Located in `/var/www/mikopbx/` on deployed systems
   - See [`src/Modules/CLAUDE.md`](src/Modules/CLAUDE.md) for detailed module development guide

4. **Asterisk Configuration**: Dynamic config generation system:
   - Generators in `src/Core/Asterisk/Configs/`
   - Modules can hook into generation process via priority system
   - Stage-based generation (pre-generate → generate → post-generate)
   - See [`src/Core/Asterisk/CLAUDE.md`](src/Core/Asterisk/CLAUDE.md) for Asterisk integration details

5. **Event System**: Nginx nchan-based pub/sub messaging:
   - EventBusProvider publishes events via REST API to nchan channels
   - WebSocket connections for real-time browser updates
   - See [`src/Common/Providers/CLAUDE.md`](src/Common/Providers/CLAUDE.md#event-system-architecture) for event system details

6. **Database Architecture**:
   - SQLite for main DB and CDR storage
   - Models in `src/Common/Models/`
   - Separate CDR database for performance
   - See [`src/Common/Models/CLAUDE.md`](src/Common/Models/CLAUDE.md) for comprehensive models documentation

7. **REST API**: Queue-based REST API architecture:
   - Controllers handle HTTP requests
   - Requests are queued to Redis for async processing
   - Workers process requests and return responses
   - See [`src/PBXCoreREST/CLAUDE.md`](src/PBXCoreREST/CLAUDE.md) for API development guide

8. **Admin Cabinet**: Web administration interface:
   - MVC architecture with Phalcon + Volt templates
   - Semantic UI for frontend components
   - AJAX-based form submissions
   - See [`src/AdminCabinet/CLAUDE.md`](src/AdminCabinet/CLAUDE.md) for UI development guide

### Directory Structure

```
src/
├── AdminCabinet/     # Web administration interface (MVC)
│   └── CLAUDE.md     # Admin cabinet development guide
├── Common/           # Shared components, models, translations
│   ├── Providers/    # 
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

### Key Design Patterns

1. **MVC Pattern**: Clear separation in AdminCabinet with Controllers, Forms, Views
2. **Provider Pattern**: Service registration and dependency injection
3. **Worker Pattern**: Async job processing with queue management
4. **Hook System**: Modules can hook into various system processes
5. **Stage Pattern**: Multi-stage configuration generation

### Important Classes and Interfaces

- `WorkerBase` - Base class for all background workers
- `PbxExtensionBase` - Base class for all modules
- `ConfigInterface` - Interface for module configuration hooks
- `AsteriskConfInterface` - Interface for Asterisk config generation
- `PBXCoreREST` - Main REST API entry point

### System Services

The PBX runs multiple system services managed by monit:
- `asterisk` - Main PBX engine
- `beanstalkd` - Job queue
- `redis` - Cache and IPC
- `php-fpm` - PHP process manager
- `nginx` - Web server
- `fail2ban` - Security service

### Quick Links to Development Guides

- **[Module Development](src/Modules/CLAUDE.md)** - Create custom modules to extend PBX functionality
- **[Worker Development](src/Core/Workers/CLAUDE.md)** - Build background workers for async processing
- **[REST API Development](src/PBXCoreREST/CLAUDE.md)** - Add new API endpoints and processors
- **[Admin UI Development](src/AdminCabinet/CLAUDE.md)** - Extend the web administration interface
- **[Asterisk Integration](src/Core/Asterisk/CLAUDE.md)** - Work with Asterisk configuration and AMI
- **[Models Documentation](src/Common/Models/CLAUDE.md)** - Comprehensive guide to all database models

### Development Resources

Additional documentation available in the development docs repository:
- `core.md` - Internal structure details
- `admin-interface.md` - Admin interface structure
- `api/rest-api.md` - REST API documentation
- `module-developement/module-class.md` - Module class implementation guide
- `module-developement/module-installer.md` - Module installer implementation guide

## Code Snippets

- `require_once 'Globals.php'; usually we add this line to CLI PHP scripts to load all dependecies`

## Translation Guidelines

- When adding translations, it is enough to add them only to Russian, the system will translate them into other languages automatically after placing them in the repository using the service. weblate.mikopbx.com

## Frontend Development

- To include new JS or CSS we add it into AssetProvider

## External Documentation Links

### Core Technologies
- 📖 **[Phalcon Framework](https://github.com/phalcon/cphalcon)** - High performance PHP framework documentation
- 📖 **[Fomantic-UI](https://github.com/fomantic/fomantic-ui)** - Community fork of Semantic-UI framework
- 📖 **[PHP Documentation](https://github.com/php/doc-en)** - Official PHP documentation (English)
- 📖 **[Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)** - JavaScript coding standards and best practices
- 📖 **[Asterisk Documentation](https://github.com/asterisk/documentation)** - Official Asterisk PBX documentation