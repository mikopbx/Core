
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

📖 **PHP** — use the `php-style` skill (PSR-1/4/12, PHP 8.3 features).
📖 **JavaScript** — use the `js-style` skill (ES6+, Fomantic-UI, jQuery patterns).
- Use `use Phalcon\Di\Di;` instead of `use Phalcon\Di;` in imports.

### Directory Structure

```
src/
├── AdminCabinet/     # Web administration interface (MVC)  → CLAUDE.md
├── Common/
│   ├── Providers/    # Service providers for DI container  → CLAUDE.md
│   └── Models/       # Database models                     → CLAUDE.md
├── Core/
│   ├── Asterisk/     # Asterisk config generation          → CLAUDE.md
│   ├── System/       # Network, IPv6, containers, boot      → CLAUDE.md
│   │   └── CloudProvisioning/  # Cloud/NoCloud provisioning → CLAUDE.md
│   └── Workers/      # Background job processors            → CLAUDE.md
├── Modules/          # Module system base classes           → CLAUDE.md
├── PBXCoreREST/      # REST API implementation              → CLAUDE.md
└── Service/          # Service layer components

tests/                # AdminCabinet (PHPUnit+Selenium), api (pytest),
                      # Calls (bash/PHP), pycalltests (PJSUA2), PBXCoreREST
sites/                # Web assets and entry points
resources/            # Static resources (DB, sounds, rootfs)
```

Each subdirectory `CLAUDE.md` is auto-loaded when you read files in that subtree —
keep deep detail there, not here.

## Operational Conventions

### Important Paths
- **Database**: `/cf/conf/mikopbx.db`
- **System messages**: `/storage/usbdisk1/mikopbx/log/system/messages`
- **PHP errors**: `/storage/usbdisk1/mikopbx/log/php/error.log`
- **Nginx errors**: `/storage/usbdisk1/mikopbx/log/nginx/error.log`
- **Asterisk logs**: `/storage/usbdisk1/mikopbx/log/asterisk/`
- **Fail2ban logs**: `/storage/usbdisk1/mikopbx/log/fail2ban/fail2ban.log`

Use the **`container-inspector`** skill for container IPs/ports and restarts
(Docker + LXC), and the **`log-analyzer`** skill to diagnose log/worker issues.

### Filesystem Remount for Hot-Patching
The `/offload` partition (rootfs) is mounted read-only. To deploy files:
```bash
busybox mount -o remount,rw /offload
# copy files to /offload/rootfs/usr/www/...
busybox mount -o remount,ro /offload
```
**Important:** Use `busybox mount`, not bare `mount` — the system `mount` may fail on T2/Linux.
Mount point is `/offload` (not `/offload/rootfs`).

### macOS Hot-Patch Tar
When packaging files on macOS for `/offload/rootfs/usr/www`, use `COPYFILE_DISABLE=1 tar --no-xattrs ...` to suppress AppleDouble (`._*`) artefacts. Otherwise every directory on the host gets a parallel `._*` file (Forms/, Configs/, Messages/, …).

### Translation Cache Invalidation
After editing any `src/Common/Messages/*.php`, the cached `globalTranslateArray` at `/var/tmp/www_cache/js/localization-<lang>-<hash>.min.js` MUST be deleted on the target host. `AssetProvider::makeLocalizationAssets()` regenerates it only if the file is missing — the version hash does NOT recompute from translation content changes.

### Test Directory Mapping
Tests are synced host↔container: **Host** `src/Core/tests` → **Container** `/offload/rootfs/usr/www/tests`.
- **Call Flow Integration** (`tests/Calls`): bash/PHP on separate Asterisk (port 5062), CDR comparison, `ffprobe` for recording duration. See `tests/Calls/README.md`.
- **SIP Call Flow** (`tests/pycalltests`): runs inside container via PJSUA2 SWIG bindings, direct FS access for voicemail/recordings/audio. See `tests/pycalltests/README.md`.

### Code Snippets
```php
// For CLI PHP scripts and tests
require_once 'Globals.php'; // !!!IMPORTANT!!! NO NEED ANY PATH
```

### Frontend Development
- Include new JS/CSS through `AssetProvider`.
- Use the **`babel-compiler`** skill to transpile ES6+ → ES5, and **`js-style`** to validate.

### Translation Management
Use the **`translations`** skill (29 languages, Russian-first): add/translate/check/remove keys.

## Architecture Overview

### Core Components
1. **Dependency Injection** — Phalcon DI container, providers in `src/Common/Providers/` and `src/Core/Providers/`.
2. **Worker System** — base `WorkerBase`; Beanstalkd (CDR/Events) + Redis (API) queues; file-based JSON-task workers; `WorkerSafeScriptsCore` supervisor; crash watchdog auto-disables module workers crashing 100+ times in 30 min (`DISABLED_BY_CRASH_LOOP`). → `src/Core/Workers/CLAUDE.md`
3. **Module System** — base `PbxExtensionBase`, deployed to `/var/www/mikopbx/`. Disable reasons: `DISABLED_BY_USER`, `DISABLED_BY_EXCEPTION`, `DISABLED_BY_LICENSE`, `DISABLED_BY_CRASH_LOOP`. → `src/Modules/CLAUDE.md`
4. **Asterisk Configuration** — generators in `src/Core/Asterisk/Configs/`, stage-based (pre → generate → post), dual-stack IPv4/IPv6. → `src/Core/Asterisk/CLAUDE.md`
5. **Event System** — Nginx nchan pub/sub; `EventBusProvider` publishes via REST API; WebSocket for browser updates.
6. **Database** — SQLite for main DB and (separate) CDR DB. Models in `src/Common/Models/`. → `src/Common/Models/CLAUDE.md`
7. **REST API** — queued architecture: controllers enqueue to Redis for async processing; backpressure protection (fast-fail HTTP 503, stale-request drop). → `src/PBXCoreREST/CLAUDE.md`
8. **Admin Cabinet** — Phalcon MVC + Volt templates, Fomantic/Semantic UI. → `src/AdminCabinet/CLAUDE.md`
9. **Network / System** — dual-stack IP handling (`IpAddressHelper`), `Network` config manager, DHCP clients, container detection, boot. → `src/Core/System/CLAUDE.md`
10. **Cloud Provisioning** — unified ENV/IMDS/NoCloud provisioning with direct SQLite (early boot, no Redis). → `src/Core/System/CloudProvisioning/CLAUDE.md`

### Key Design Patterns
- **MVC** (AdminCabinet), **Provider** (DI registration), **Worker** (async queues), **Hook System** (modules hook into processes), **Stage** (multi-stage config generation), **DHCP Callback** (event-driven network config), **Smart Console** (test console accessibility before redirect).

### Important Classes
- `WorkerBase`, `PbxExtensionBase`, `ConfigInterface`, `AsteriskConfInterface`, `PBXCoreREST`
- `System` — container/capability detection (`isDocker`/`isLxc`/`isContainer`/`canManageNetwork`/`canManageFirewall`). See `src/Core/System/CLAUDE.md`.
- `IpAddressHelper` — dual-stack IPv4/IPv6 validation & CIDR utilities.
- `Network`, `Udhcpc` (IPv4), `Udhcpc6` (IPv6), `DnsConf`, `IptablesConf` — see `src/Core/System/CLAUDE.md`.
- `CloudProvider`, `ProvisioningConfig`, `NoCloud` — see `src/Core/System/CloudProvisioning/CLAUDE.md`.

### System Services (managed by monit)
`asterisk` (PBX engine), `beanstalkd` (queue), `redis` (cache/IPC/API queue), `php-fpm`, `nginx`, `fail2ban`.

MikoPBX runs as a single container (Docker app-container or LXC system-container)
bundling PHP 8.3, SQLite, Redis, Beanstalkd, Asterisk, Nginx. Container detection,
the Docker-vs-LXC capability matrix, IPv6 modes, DHCP callbacks and the boot/console
system are documented in **`src/Core/System/CLAUDE.md`**.

## Subdirectory Guides
- [Admin UI](src/AdminCabinet/CLAUDE.md) · [REST API](src/PBXCoreREST/CLAUDE.md) · [Workers](src/Core/Workers/CLAUDE.md) · [Modules](src/Modules/CLAUDE.md)
- [Asterisk](src/Core/Asterisk/CLAUDE.md) · [Models](src/Common/Models/CLAUDE.md) · [Providers](src/Common/Providers/CLAUDE.md)
- [System/Network/Boot](src/Core/System/CLAUDE.md) · [Cloud Provisioning](src/Core/System/CloudProvisioning/CLAUDE.md)
- [System Diagnostic](sites/admin-cabinet/assets/js/src/SystemDiagnostic/CLAUDE.md) · [Browser Tests](tests/AdminCabinet/CLAUDE.md)

## Skills & Agents

Skills and agents are surfaced automatically each session — just describe the task
in natural language (EN/RU) and the matching one is selected. Notable groups:
- **API/DB testing**: `api-client`, `auth-token-manager`, `openapi-analyzer`, `endpoint-validator`, `api-test-generator`, `sqlite-inspector`, `restapi-translations`
- **Infra/diagnostics**: `container-inspector`, `log-analyzer`, `asterisk-validator`, `asterisk-tester`, `teamcity-monitor`, `browserstack-tester`, `sentry-analyzer`
- **Code quality**: `php-style`, `js-style`, `code-search` (ast-grep), `babel-compiler`, `translations`, `commit-messages`
- **Agents** (`.claude/agents/`): `test-fix-loop-agent`, `js-optimizer-mikopbx`, `php-refactoring-specialist`, `security-audit-analyzer`, `pbx-translation-expert`, `rest-api-docker-tester`, `mikopbx-web-tester`, `playwright-test-{generator,healer,planner}`

## Reference Docs
- Security/UI: [XSS Protection](docs/xss-protection-guidelines.md), [DataTable Guidelines](docs/datatable-semantic-ui-guidelines.md), [Tooltip Guidelines](docs/TOOLTIP_GUIDELINES.md)
- External: [Phalcon](https://github.com/phalcon/cphalcon), [Fomantic-UI](https://github.com/fomantic/fomantic-ui), [PHP](https://github.com/php/doc-en), [Asterisk](https://github.com/asterisk/documentation)

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
- use Phalcon\Di\Di; instead of use Phalcon\Di; in imports.
