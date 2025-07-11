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

# Generate test data (see composer.json for full list)
composer generate-extensions-tests
composer generate-sip-providers-tests
```

## Architecture Overview

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
- `beanstalkd` - Job queue
- `redis` - Cache and IPC
- `php-fpm` - PHP process manager
- `nginx` - Web server
- `fail2ban` - Security service

## Development Guidelines

### Code Snippets
```php
// For CLI PHP scripts
require_once 'Globals.php'; // Loads all dependencies
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

## External Documentation

### Core Technologies
- 📖 **[Phalcon Framework](https://github.com/phalcon/cphalcon)** - High performance PHP framework
- 📖 **[Fomantic-UI](https://github.com/fomantic/fomantic-ui)** - Community fork of Semantic-UI
- 📖 **[PHP Documentation](https://github.com/php/doc-en)** - Official PHP documentation
- 📖 **[Asterisk Documentation](https://github.com/asterisk/documentation)** - Official Asterisk docs