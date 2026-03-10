[![Translation status](https://weblate.mikopbx.com/widgets/mikopbx/-/admin-web-interface/svg-badge.svg)](https://weblate.mikopbx.com/engage/mikopbx/)
[![GitHub All Releases](https://img.shields.io/github/downloads/mikopbx/core/total)](https://github.com/mikopbx/Core/releases)
[![Latest Release](https://img.shields.io/github/v/release/mikopbx/core?color=blue)](https://github.com/mikopbx/Core/releases/latest)
[![GitHub last commit (branch)](https://img.shields.io/github/last-commit/mikopbx/core/develop?label=last%20commit%20on%20develop)](https://github.com/mikopbx/Core/tree/develop)
[![Code Quality](https://img.shields.io/github/actions/workflow/status/mikopbx/core/code-quality.yml?branch=develop&label=code%20quality)](https://github.com/mikopbx/Core/actions/workflows/code-quality.yml)
![GitHub](https://img.shields.io/github/license/mikopbx/core)

# MikoPBX — Free Phone System for Small Business

```

88b           d88  88  88                     88888888ba   88888888ba  8b        d8
888b         d888  ""  88                     88      "8b  88      "8b  Y8,    ,8P
88`8b       d8'88      88                     88      ,8P  88      ,8P   `8b  d8'
88 `8b     d8' 88  88  88   ,d8   ,adPPYba,   88aaaaaa8P'  88aaaaaa8P'     Y88P
88  `8b   d8'  88  88  88 ,a8"   a8"     "8a  88""""""'    88""""""8b,     d88b
88   `8b d8'   88  88  8888[     8b       d8  88           88      `8b   ,8P  Y8,
88    `888'    88  88  88`"Yba,  "8a,   ,a8"  88           88      a8P  d8'    `8b
88     `8'     88  88  88   `Y8a  `"YbbdP"'   88           88888888P"  8P        Y8


```

> [🇷🇺 Русская версия](README.ru.md)

## What's MikoPBX?

MikoPBX is an open-source PBX system with a modern web interface for managing [Asterisk](https://www.asterisk.org/). It ships as a compact Linux distribution with all necessary services pre-configured — Asterisk, Nginx, PHP-FPM, Redis, Fail2Ban, and more. You can write any module you can think of and distribute it to your users through the built-in marketplace.

Install MikoPBX on premise, in a virtual machine, in a Docker or LXC container, or on any major cloud provider (AWS, Google Cloud, Azure, etc.)

<p align="center">
    <a href="https://www.mikopbx.com">
        <img src="https://github.com/mikopbx/assets/raw/master/img/screenshots/ExtensionsList.png"/>
    </a>
</p>

The system has an easy and convenient web interface with call recording, conference calls, voicemail, call transfers and pickup, call queues, IVR menus, inbound and outbound call rules, holidays and night-time call switcher, custom call-flow programming, and a marketplace with paid and free extensions. All core business functionality is free forever!

* English [website](https://www.mikopbx.com)
* Russian [website](https://www.mikopbx.ru)

## Getting Started

### Installation Methods

MikoPBX can be deployed in multiple ways depending on your environment:

#### Standalone / Bare Metal
- [Live USB installation](https://docs.mikopbx.com/mikopbx/english/setup/bare-metal/live-usb)
- [Bootable USB installation](https://docs.mikopbx.com/mikopbx/english/setup/bare-metal/bootable-usb)

#### Virtual Machine

Download the [latest ISO](https://github.com/mikopbx/Core/releases/latest) and boot from it in your hypervisor:

| Hypervisor | Guide |
|------------|-------|
| VMware ESXi | [Installation guide](https://docs.mikopbx.com/mikopbx/english/setup/hypervisor/vmware-esxi) |
| VMware Workstation Pro | [Installation guide](https://docs.mikopbx.com/mikopbx/english/setup/hypervisor/vmware-workstation-pro) |
| VMware Fusion (Mac) | [Installation guide](https://docs.mikopbx.com/mikopbx/english/setup/hypervisor/vmware-fusion) |
| VirtualBox | [Installation guide](https://docs.mikopbx.com/mikopbx/english/setup/hypervisor/virtualbox) |
| Hyper-V | [Installation guide](https://docs.mikopbx.com/mikopbx/english/setup/hypervisor/hyper-v) |
| Proxmox (VM) | [Installation guide](https://docs.mikopbx.com/mikopbx/english/setup/hypervisor/proxmox) |
| Proxmox (LXC container) | [Installation guide](https://docs.mikopbx.com/mikopbx/english/setup/hypervisor/proxmox/lxc) |
| UTM (Apple Silicon) | [Installation guide](https://docs.mikopbx.com/mikopbx/english/setup/hypervisor/utm) |

#### Docker Container

- [Docker installation prerequisites](https://docs.mikopbx.com/mikopbx/english/setup/docker/docker-installation)
- [Running MikoPBX in a container](https://docs.mikopbx.com/mikopbx/english/setup/docker/running-mikopbx-in-container)
- [Running MikoPBX with Docker Compose](https://docs.mikopbx.com/mikopbx/english/setup/docker/running-mikopbx-using-docker-compose)

#### Cloud Providers

| Provider | Guide |
|----------|-------|
| AWS EC2 | [Deployment guide](https://docs.mikopbx.com/mikopbx/english/setup/cloud/aws/aws-deployment-guide) &bull; [AWS Marketplace](https://docs.mikopbx.com/mikopbx/english/setup/cloud/aws/aws-marketplace) |
| Google Cloud | [Deployment guide](https://docs.mikopbx.com/mikopbx/english/setup/cloud/google-cloud/google-cloud) &bull; [GCP Marketplace](https://docs.mikopbx.com/mikopbx/english/setup/cloud/google-cloud/google-cloud-marketplace) |
| Microsoft Azure | [Deployment guide](https://docs.mikopbx.com/mikopbx/english/setup/cloud/microsoft-azure) |
| DigitalOcean | [Deployment guide](https://docs.mikopbx.com/mikopbx/english/setup/cloud/digitalocean) |
| Vultr | [Deployment guide](https://docs.mikopbx.com/mikopbx/english/setup/cloud/vultr) |
| Alibaba Cloud | [Deployment guide](https://docs.mikopbx.com/mikopbx/english/setup/cloud/alibaba-cloud) |
| Hetzner Cloud | [Deployment guide](https://docs.mikopbx.com/mikopbx/english/setup/cloud/hetzner-cloud) |

### First Steps After Installation

Open the web interface and log in with default credentials — username: `admin`, password: `admin`.
Then follow the [Quick Start guide](https://docs.mikopbx.com/mikopbx/english/readme/quick-start) to configure your system.

## Features

* Compact Linux distribution — boots in seconds.
* Easy to install, easy to set up.
* Multilingual interface (26 languages) with community translation via [Weblate](https://weblate.mikopbx.com).
* x86_64 and ARM64 architectures.
* Latest PJSIP stack and Asterisk 22 LTS.
* Dual-stack IPv4/IPv6 networking.
* Fail2Ban, iptables firewall, WebAuthn/Passkey authentication.
* Modular architecture with a plugins marketplace.
* PHP 8.4, [Phalcon Framework](https://phalcon.io), Nginx, Redis.
* REST API with 259+ endpoints and JWT authentication.
* Cloud auto-provisioning (AWS, GCP, Azure, DigitalOcean, Vultr, Yandex Cloud, VK Cloud, Alibaba Cloud).
* Modern codebase written according to PSR standards and Airbnb JS style.

## Requirements

| Concurrent Calls | CPU | RAM | Storage |
|-------------------|-----|-----|---------|
| 5–10 | 1 GHz x86-64 or ARM64, 1–2 cores | 2 GB | 1 GB system + 50 GB recordings |
| Up to 25 | 3 GHz x86-64 or ARM64 | 2 GB | 1 GB system + 50 GB recordings |
| 25+ | Dual CPU 3 GHz x86-64 | 4 GB+ | 1 GB system + 50 GB recordings |

See the full [system requirements](https://docs.mikopbx.com/mikopbx/english/readme/system-requirements).

## How to Modify Your System

For easy customisations, use the dialplan application editor. It supports PHP-AGI or Asterisk Dialplan language.

<p align="center">
    <img src="https://github.com/mikopbx/assets/raw/master/img/screenshots/ApplicationEditor.png"/>
</p>

Or use direct system file customisation on the web interface.

<p align="center">
    <img src="https://github.com/mikopbx/assets/raw/master/img/screenshots/SystemFileCustomization.png"/>
</p>

MikoPBX usually loads from a read-only *offload* partition. If you want to change something in the core, remount the partition to write mode with the SSH command: `remount-offload`

If you want to add new functionality, we strongly advise you look at the [ModuleTemplate](https://github.com/mikopbx/ModuleTemplate) repository.

## Architecture

MikoPBX is a self-contained Linux distribution built on [T2 SDE](https://t2sde.org/). Key components:

| Component | Version | Purpose |
|-----------|---------|---------|
| **Asterisk** | 22 | PBX engine with PJSIP stack |
| **PHP** | 8.4 | Application runtime |
| **Phalcon** | 5 | High-performance PHP framework |
| **Nginx** | 1.29 | Web server with WebSocket support (nchan) |
| **Redis** | 7 | Cache, sessions, and API queue |
| **Beanstalkd** | 1.12 | Background job processing |
| **Fail2Ban** | 1 | Intrusion prevention |
| **SQLite** | — | Main database and CDR storage |

### Source Structure

```
src/
├── AdminCabinet/     # Web UI (MVC + Volt templates + Semantic UI)
├── Common/           # Models, translations, DI providers
├── Core/             # Asterisk configs, system utilities, workers
├── Modules/          # Module framework
├── PBXCoreREST/      # REST API (49 controllers, 259+ endpoints)
└── Service/          # Service layer
```

## Interface and Documentation Translation

The web interface has been translated into 26 languages with the help of our community:

<p align="center">
    <img src="https://github.com/mikopbx/assets/raw/master/img/screenshots/LanguageSettings2.png" height="500"/>
</p>

If you find any mistakes, you are welcome to fix them on the [Weblate](https://weblate.mikopbx.com) translation service.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Community & Support

- **Forum**: [forum.mikopbx.com](https://forum.mikopbx.com) — questions, discussions, community help
- **Telegram**: [Developer Chat](https://t.me/mikopbx_dev) — real-time community chat
- **Bug Reports**: [GitHub Issues](https://github.com/mikopbx/Core/issues)
- **Documentation**: [docs.mikopbx.com](https://docs.mikopbx.com)
- **Paid Support**: [Professional support](https://www.mikopbx.com/support/) from MIKO LLC

## Sponsors

Become a sponsor and get your logo on our README on GitHub with a link to your site. [Become a sponsor](https://patreon.com/mikopbx)

## License

MikoPBX© — free phone system for small business
Copyright © 2017–2026 Alexey Portnov and Nikolay Beketov

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program.
If not, see <https://www.gnu.org/licenses/>.
