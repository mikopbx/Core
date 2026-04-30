<!--@nrg.languages=en,ru-->
<!--@nrg.defaultLanguage=en-->
[![Translation status](https://weblate.mikopbx.com/widgets/mikopbx/-/admin-web-interface/svg-badge.svg)](https://weblate.mikopbx.com/engage/mikopbx/)<!--en-->
[![GitHub All Releases](https://img.shields.io/github/downloads/mikopbx/core/total)](https://github.com/mikopbx/Core/releases)<!--en-->
[![Latest Release](https://img.shields.io/github/v/release/mikopbx/core?color=blue)](https://github.com/mikopbx/Core/releases/latest)<!--en-->
[![GitHub last commit (branch)](https://img.shields.io/github/last-commit/mikopbx/core/develop?label=last%20commit%20on%20develop)](https://github.com/mikopbx/Core/tree/develop)<!--en-->
[![Code Quality](https://img.shields.io/github/actions/workflow/status/mikopbx/core/code-quality.yml?branch=develop&label=code%20quality)](https://github.com/mikopbx/Core/actions/workflows/code-quality.yml)<!--en-->
![GitHub](https://img.shields.io/github/license/mikopbx/core)<!--en-->
<!--en-->
# MikoPBX — Free Phone System for Small Business<!--en-->
<!--en-->
```<!--en-->
<!--en-->
88b           d88  88  88                     88888888ba   88888888ba  8b        d8<!--en-->
888b         d888  ""  88                     88      "8b  88      "8b  Y8,    ,8P<!--en-->
88`8b       d8'88      88                     88      ,8P  88      ,8P   `8b  d8'<!--en-->
88 `8b     d8' 88  88  88   ,d8   ,adPPYba,   88aaaaaa8P'  88aaaaaa8P'     Y88P<!--en-->
88  `8b   d8'  88  88  88 ,a8"   a8"     "8a  88""""""'    88""""""8b,     d88b<!--en-->
88   `8b d8'   88  88  8888[     8b       d8  88           88      `8b   ,8P  Y8,<!--en-->
88    `888'    88  88  88`"Yba,  "8a,   ,a8"  88           88      a8P  d8'    `8b<!--en-->
88     `8'     88  88  88   `Y8a  `"YbbdP"'   88           88888888P"  8P        Y8<!--en-->
<!--en-->
<!--en-->
```<!--en-->
<!--en-->
> [🇷🇺 Русская версия](README.ru.md)<!--en-->
<!--en-->
## What's MikoPBX?<!--en-->
<!--en-->
MikoPBX is an open-source PBX system with a modern web interface for managing [Asterisk](https://www.asterisk.org/). It ships as a compact Linux distribution with all necessary services pre-configured — Asterisk, Nginx, PHP-FPM, Redis, Fail2Ban, and more. You can write any module you can think of and distribute it to your users through the built-in marketplace.<!--en-->
<!--en-->
Install MikoPBX on premise, in a virtual machine, in a Docker or LXC container, or on any major cloud provider (AWS, Google Cloud, Azure, etc.)<!--en-->
<!--en-->
<p align="center"><!--en-->
    <a href="https://www.mikopbx.com"><!--en-->
        <img src="https://github.com/mikopbx/assets/raw/master/img/screenshots/ExtensionsList.png"/><!--en-->
    </a><!--en-->
</p><!--en-->
<!--en-->
The system has an easy and convenient web interface with call recording, conference calls, voicemail, call transfers and pickup, call queues, IVR menus, inbound and outbound call rules, holidays and night-time call switcher, custom call-flow programming, and a marketplace with paid and free extensions. All core business functionality is free forever!<!--en-->
<!--en-->
* English [website](https://www.mikopbx.com)<!--en-->
* Russian [website](https://www.mikopbx.ru)<!--en-->
<!--en-->
## Getting Started<!--en-->
<!--en-->
### Installation Methods<!--en-->
<!--en-->
MikoPBX can be deployed in multiple ways depending on your environment:<!--en-->
<!--en-->
#### Standalone / Bare Metal<!--en-->
- [Live USB installation](https://docs.mikopbx.com/mikopbx/english/setup/bare-metal/live-usb)<!--en-->
- [Bootable USB installation](https://docs.mikopbx.com/mikopbx/english/setup/bare-metal/bootable-usb)<!--en-->
<!--en-->
#### Virtual Machine<!--en-->
<!--en-->
Download the [latest ISO](https://github.com/mikopbx/Core/releases/latest) and boot from it in your hypervisor:<!--en-->
<!--en-->
| Hypervisor | Guide |<!--en-->
|------------|-------|<!--en-->
| VMware ESXi | [Installation guide](https://docs.mikopbx.com/mikopbx/english/setup/hypervisor/vmware-esxi) |<!--en-->
| VMware Workstation Pro | [Installation guide](https://docs.mikopbx.com/mikopbx/english/setup/hypervisor/vmware-workstation-pro) |<!--en-->
| VMware Fusion (Mac) | [Installation guide](https://docs.mikopbx.com/mikopbx/english/setup/hypervisor/vmware-fusion) |<!--en-->
| VirtualBox | [Installation guide](https://docs.mikopbx.com/mikopbx/english/setup/hypervisor/virtualbox) |<!--en-->
| Hyper-V | [Installation guide](https://docs.mikopbx.com/mikopbx/english/setup/hypervisor/hyper-v) |<!--en-->
| Proxmox (VM) | [Installation guide](https://docs.mikopbx.com/mikopbx/english/setup/hypervisor/proxmox) |<!--en-->
| Proxmox (LXC container) | [Installation guide](https://docs.mikopbx.com/mikopbx/english/setup/hypervisor/proxmox/lxc) |<!--en-->
| UTM (Apple Silicon) | [Installation guide](https://docs.mikopbx.com/mikopbx/english/setup/hypervisor/utm) |<!--en-->
<!--en-->
#### Docker Container<!--en-->
<!--en-->
- [Docker installation prerequisites](https://docs.mikopbx.com/mikopbx/english/setup/docker/docker-installation)<!--en-->
- [Running MikoPBX in a container](https://docs.mikopbx.com/mikopbx/english/setup/docker/running-mikopbx-in-container)<!--en-->
- [Running MikoPBX with Docker Compose](https://docs.mikopbx.com/mikopbx/english/setup/docker/running-mikopbx-using-docker-compose)<!--en-->
<!--en-->
#### Cloud Providers<!--en-->
<!--en-->
| Provider | Guide |<!--en-->
|----------|-------|<!--en-->
| AWS EC2 | [Deployment guide](https://docs.mikopbx.com/mikopbx/english/setup/cloud/aws/aws-deployment-guide) &bull; [AWS Marketplace](https://docs.mikopbx.com/mikopbx/english/setup/cloud/aws/aws-marketplace) |<!--en-->
| Google Cloud | [Deployment guide](https://docs.mikopbx.com/mikopbx/english/setup/cloud/google-cloud/google-cloud) &bull; [GCP Marketplace](https://docs.mikopbx.com/mikopbx/english/setup/cloud/google-cloud/google-cloud-marketplace) |<!--en-->
| Microsoft Azure | [Deployment guide](https://docs.mikopbx.com/mikopbx/english/setup/cloud/microsoft-azure) |<!--en-->
| DigitalOcean | [Deployment guide](https://docs.mikopbx.com/mikopbx/english/setup/cloud/digitalocean) |<!--en-->
| Vultr | [Deployment guide](https://docs.mikopbx.com/mikopbx/english/setup/cloud/vultr) |<!--en-->
| Alibaba Cloud | [Deployment guide](https://docs.mikopbx.com/mikopbx/english/setup/cloud/alibaba-cloud) |<!--en-->
| Hetzner Cloud | [Deployment guide](https://docs.mikopbx.com/mikopbx/english/setup/cloud/hetzner-cloud) |<!--en-->
<!--en-->
### First Steps After Installation<!--en-->
<!--en-->
Open the web interface and log in with default credentials — username: `admin`, password: `admin`.<!--en-->
Then follow the [Quick Start guide](https://docs.mikopbx.com/mikopbx/english/readme/quick-start) to configure your system.<!--en-->
<!--en-->
## Features<!--en-->
<!--en-->
* Compact Linux distribution — boots in seconds.<!--en-->
* Easy to install, easy to set up.<!--en-->
* Multilingual interface (26 languages) with community translation via [Weblate](https://weblate.mikopbx.com).<!--en-->
* x86_64 and ARM64 architectures.<!--en-->
* Latest PJSIP stack and Asterisk 22 LTS.<!--en-->
* Dual-stack IPv4/IPv6 networking.<!--en-->
* Fail2Ban, iptables firewall, WebAuthn/Passkey authentication.<!--en-->
* Modular architecture with a plugins marketplace.<!--en-->
* PHP 8.4, [Phalcon Framework](https://phalcon.io), Nginx, Redis.<!--en-->
* REST API with 259+ endpoints and JWT authentication.<!--en-->
* Cloud auto-provisioning (AWS, GCP, Azure, DigitalOcean, Vultr, Yandex Cloud, VK Cloud, Alibaba Cloud).<!--en-->
* Modern codebase written according to PSR standards and Airbnb JS style.<!--en-->
<!--en-->
## Requirements<!--en-->
<!--en-->
| Concurrent Calls | CPU | RAM | Storage |<!--en-->
|-------------------|-----|-----|---------|<!--en-->
| 5–10 | 1 GHz x86-64 or ARM64, 1–2 cores | 2 GB | 1 GB system + 50 GB recordings |<!--en-->
| Up to 25 | 3 GHz x86-64 or ARM64 | 2 GB | 1 GB system + 50 GB recordings |<!--en-->
| 25+ | Dual CPU 3 GHz x86-64 | 4 GB+ | 1 GB system + 50 GB recordings |<!--en-->
<!--en-->
See the full [system requirements](https://docs.mikopbx.com/mikopbx/english/readme/system-requirements).<!--en-->
<!--en-->
## How to Modify Your System<!--en-->
<!--en-->
For easy customisations, use the dialplan application editor. It supports PHP-AGI or Asterisk Dialplan language.<!--en-->
<!--en-->
<p align="center"><!--en-->
    <img src="https://github.com/mikopbx/assets/raw/master/img/screenshots/ApplicationEditor.png"/><!--en-->
</p><!--en-->
<!--en-->
Or use direct system file customisation on the web interface.<!--en-->
<!--en-->
<p align="center"><!--en-->
    <img src="https://github.com/mikopbx/assets/raw/master/img/screenshots/SystemFileCustomization.png"/><!--en-->
</p><!--en-->
<!--en-->
MikoPBX usually loads from a read-only *offload* partition. If you want to change something in the core, remount the partition to write mode with the SSH command: `remount-offload`<!--en-->
<!--en-->
If you want to add new functionality, we strongly advise you look at the [ModuleTemplate](https://github.com/mikopbx/ModuleTemplate) repository.<!--en-->
<!--en-->
## Architecture<!--en-->
<!--en-->
MikoPBX is a self-contained Linux distribution built on [T2 SDE](https://t2sde.org/). Key components:<!--en-->
<!--en-->
| Component | Version | Purpose |<!--en-->
|-----------|---------|---------|<!--en-->
| **Asterisk** | 22 | PBX engine with PJSIP stack |<!--en-->
| **PHP** | 8.4 | Application runtime |<!--en-->
| **Phalcon** | 5 | High-performance PHP framework |<!--en-->
| **Nginx** | 1.29 | Web server with WebSocket support (nchan) |<!--en-->
| **Redis** | 7 | Cache, sessions, and API queue |<!--en-->
| **Beanstalkd** | 1.12 | Background job processing |<!--en-->
| **Fail2Ban** | 1 | Intrusion prevention |<!--en-->
| **SQLite** | — | Main database and CDR storage |<!--en-->
<!--en-->
### Source Structure<!--en-->
<!--en-->
```<!--en-->
src/<!--en-->
├── AdminCabinet/     # Web UI (MVC + Volt templates + Semantic UI)<!--en-->
├── Common/           # Models, translations, DI providers<!--en-->
├── Core/             # Asterisk configs, system utilities, workers<!--en-->
├── Modules/          # Module framework<!--en-->
├── PBXCoreREST/      # REST API (49 controllers, 259+ endpoints)<!--en-->
└── Service/          # Service layer<!--en-->
```<!--en-->
<!--en-->
## Interface and Documentation Translation<!--en-->
<!--en-->
The web interface has been translated into 26 languages with the help of our community:<!--en-->
<!--en-->
<p align="center"><!--en-->
    <img src="https://github.com/mikopbx/assets/raw/master/img/screenshots/LanguageSettings2.png" height="500"/><!--en-->
</p><!--en-->
<!--en-->
If you find any mistakes, you are welcome to fix them on the [Weblate](https://weblate.mikopbx.com) translation service.<!--en-->
<!--en-->
## Contributing<!--en-->
<!--en-->
We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.<!--en-->
<!--en-->
## Community & Support<!--en-->
<!--en-->
- **Forum**: [forum.mikopbx.com](https://forum.mikopbx.com) — questions, discussions, community help<!--en-->
- **Telegram**: [Developer Chat](https://t.me/mikopbx_dev) — real-time community chat<!--en-->
- **Bug Reports**: [GitHub Issues](https://github.com/mikopbx/Core/issues)<!--en-->
- **Documentation**: [docs.mikopbx.com](https://docs.mikopbx.com)<!--en-->
- **Paid Support**: [Professional support](https://www.mikopbx.com/support/) from MIKO LLC<!--en-->
<!--en-->
## Sponsors<!--en-->
<!--en-->
Become a sponsor and get your logo on our README on GitHub with a link to your site. [Become a sponsor](https://patreon.com/mikopbx)<!--en-->
<!--en-->
## License<!--en-->
<!--en-->
MikoPBX© — free phone system for small business<!--en-->
Copyright © 2017–2026 Alexey Portnov and Nikolay Beketov<!--en-->
<!--en-->
This program is free software: you can redistribute it and/or modify<!--en-->
it under the terms of the GNU General Public License as published by<!--en-->
the Free Software Foundation; either version 3 of the License, or<!--en-->
(at your option) any later version.<!--en-->
<!--en-->
This program is distributed in the hope that it will be useful,<!--en-->
but WITHOUT ANY WARRANTY; without even the implied warranty of<!--en-->
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the<!--en-->
GNU General Public License for more details.<!--en-->
<!--en-->
You should have received a copy of the GNU General Public License along with this program.<!--en-->
If not, see <https://www.gnu.org/licenses/>.<!--en-->
[![Статус перевода](https://weblate.mikopbx.com/widgets/mikopbx/-/admin-web-interface/svg-badge.svg)](https://weblate.mikopbx.com/engage/mikopbx/)<!--ru-->
[![Загрузки](https://img.shields.io/github/downloads/mikopbx/core/total)](https://github.com/mikopbx/Core/releases)<!--ru-->
[![Последний релиз](https://img.shields.io/github/v/release/mikopbx/core?color=blue)](https://github.com/mikopbx/Core/releases/latest)<!--ru-->
[![Последний коммит](https://img.shields.io/github/last-commit/mikopbx/core/develop?label=last%20commit%20on%20develop)](https://github.com/mikopbx/Core/tree/develop)<!--ru-->
[![Качество кода](https://img.shields.io/github/actions/workflow/status/mikopbx/core/code-quality.yml?branch=develop&label=code%20quality)](https://github.com/mikopbx/Core/actions/workflows/code-quality.yml)<!--ru-->
![Лицензия](https://img.shields.io/github/license/mikopbx/core)<!--ru-->
<!--ru-->
# MikoPBX — Бесплатная АТС для малого бизнеса<!--ru-->
<!--ru-->
```<!--ru-->
<!--ru-->
88b           d88  88  88                     88888888ba   88888888ba  8b        d8<!--ru-->
888b         d888  ""  88                     88      "8b  88      "8b  Y8,    ,8P<!--ru-->
88`8b       d8'88      88                     88      ,8P  88      ,8P   `8b  d8'<!--ru-->
88 `8b     d8' 88  88  88   ,d8   ,adPPYba,   88aaaaaa8P'  88aaaaaa8P'     Y88P<!--ru-->
88  `8b   d8'  88  88  88 ,a8"   a8"     "8a  88""""""'    88""""""8b,     d88b<!--ru-->
88   `8b d8'   88  88  8888[     8b       d8  88           88      `8b   ,8P  Y8,<!--ru-->
88    `888'    88  88  88`"Yba,  "8a,   ,a8"  88           88      a8P  d8'    `8b<!--ru-->
88     `8'     88  88  88   `Y8a  `"YbbdP"'   88           88888888P"  8P        Y8<!--ru-->
<!--ru-->
<!--ru-->
```<!--ru-->
<!--ru-->
> [🇬🇧 English version](README.md)<!--ru-->
<!--ru-->
## Что такое MikoPBX?<!--ru-->
<!--ru-->
MikoPBX — это АТС с открытым исходным кодом и современным веб-интерфейсом для управления [Asterisk](https://www.asterisk.org/). Поставляется как компактный Linux-дистрибутив с полной предустановкой всех необходимых сервисов — Asterisk, Nginx, PHP-FPM, Redis, Fail2Ban и других. Вы можете написать любой модуль и распространять его через встроенный маркетплейс.<!--ru-->
<!--ru-->
Устанавливайте MikoPBX на физический сервер, в виртуальную машину, Docker- или LXC-контейнер, либо в любом крупном облаке (AWS, Google Cloud, Azure и др.)<!--ru-->
<!--ru-->
<p align="center"><!--ru-->
    <a href="https://www.mikopbx.ru"><!--ru-->
        <img src="https://github.com/mikopbx/assets/raw/master/img/screenshots/ExtensionsList.png"/><!--ru-->
    </a><!--ru-->
</p><!--ru-->
<!--ru-->
Система имеет удобный веб-интерфейс с записью разговоров, конференц-связью, голосовой почтой, переводом и перехватом звонков, очередями вызовов, IVR-меню, правилами входящих и исходящих вызовов, переключателем праздников и ночного режима, редактором call-flow и маркетплейсом с платными и бесплатными расширениями. Вся основная бизнес-функциональность бесплатна навсегда!<!--ru-->
<!--ru-->
* Английский [сайт](https://www.mikopbx.com)<!--ru-->
* Русский [сайт](https://www.mikopbx.ru)<!--ru-->
<!--ru-->
## Начало работы<!--ru-->
<!--ru-->
### Способы установки<!--ru-->
<!--ru-->
MikoPBX можно развернуть несколькими способами в зависимости от вашего окружения:<!--ru-->
<!--ru-->
#### На физический сервер<!--ru-->
- [Установка с Live USB](https://docs.mikopbx.ru/mikopbx/setup/bare-metal/live-usb)<!--ru-->
- [Установка на загрузочный USB](https://docs.mikopbx.ru/mikopbx/setup/bare-metal/bootable-usb)<!--ru-->
<!--ru-->
#### Виртуальная машина<!--ru-->
<!--ru-->
Скачайте [последний ISO](https://github.com/mikopbx/Core/releases/latest) и загрузитесь с него в гипервизоре:<!--ru-->
<!--ru-->
| Гипервизор | Инструкция |<!--ru-->
|------------|------------|<!--ru-->
| VMware ESXi | [Руководство по установке](https://docs.mikopbx.ru/mikopbx/setup/hypervisor/vmware-esxi) |<!--ru-->
| VMware Workstation Pro | [Руководство по установке](https://docs.mikopbx.ru/mikopbx/setup/hypervisor/vmware-workstation-pro) |<!--ru-->
| VMware Fusion (Mac) | [Руководство по установке](https://docs.mikopbx.ru/mikopbx/setup/hypervisor/vmware-fusion) |<!--ru-->
| VirtualBox | [Руководство по установке](https://docs.mikopbx.ru/mikopbx/setup/hypervisor/virtualbox) |<!--ru-->
| Hyper-V | [Руководство по установке](https://docs.mikopbx.ru/mikopbx/setup/hypervisor/hyper-v) |<!--ru-->
| Proxmox (ВМ) | [Руководство по установке](https://docs.mikopbx.ru/mikopbx/setup/hypervisor/proxmox) |<!--ru-->
| Proxmox (LXC-контейнер) | [Руководство по установке](https://docs.mikopbx.ru/mikopbx/setup/hypervisor/proxmox/lxc) |<!--ru-->
| UTM (Apple Silicon) | [Руководство по установке](https://docs.mikopbx.ru/mikopbx/setup/hypervisor/utm) |<!--ru-->
<!--ru-->
#### Docker-контейнер<!--ru-->
<!--ru-->
- [Установка Docker и подготовка](https://docs.mikopbx.ru/mikopbx/setup/docker/docker-installation)<!--ru-->
- [Запуск MikoPBX в контейнере](https://docs.mikopbx.ru/mikopbx/setup/docker/running-mikopbx-in-container)<!--ru-->
- [Запуск MikoPBX через Docker Compose](https://docs.mikopbx.ru/mikopbx/setup/docker/running-mikopbx-using-docker-compose)<!--ru-->
<!--ru-->
#### Облачные провайдеры<!--ru-->
<!--ru-->
| Провайдер | Инструкция |<!--ru-->
|-----------|------------|<!--ru-->
| Яндекс.Облако | [Обзор](https://docs.mikopbx.ru/mikopbx/setup/cloud/yandex-cloud) &bull; [Marketplace](https://docs.mikopbx.ru/mikopbx/setup/cloud/yandex-cloud/yandex-cloud-marketplace) &bull; [Произвольный образ](https://docs.mikopbx.ru/mikopbx/setup/cloud/yandex-cloud/proizvolnyi-obraz) &bull; [CLI](https://docs.mikopbx.ru/mikopbx/setup/cloud/yandex-cloud/yandex-cloud-cli) |<!--ru-->
| VK Cloud | [Развёртывание](https://docs.mikopbx.ru/mikopbx/setup/cloud/vk-cloud) |<!--ru-->
| Selectel | [Развёртывание](https://docs.mikopbx.ru/mikopbx/setup/cloud/selectel) |<!--ru-->
| 1C Облачная инфраструктура | [Развёртывание](https://docs.mikopbx.ru/mikopbx/setup/cloud/1c-oblachnaya-infrastruktura) |<!--ru-->
| AWS EC2 | [Развёртывание](https://docs.mikopbx.ru/mikopbx/setup/cloud/aws/aws-deployment-guide) &bull; [AWS Marketplace](https://docs.mikopbx.ru/mikopbx/setup/cloud/aws/aws-marketplace) |<!--ru-->
| Google Cloud | [Развёртывание](https://docs.mikopbx.ru/mikopbx/setup/cloud/google-cloud/deployment-guide) &bull; [GCP Marketplace](https://docs.mikopbx.ru/mikopbx/setup/cloud/google-cloud/marketplace) |<!--ru-->
| Microsoft Azure | [Развёртывание](https://docs.mikopbx.ru/mikopbx/setup/cloud/microsoft-azure) |<!--ru-->
| DigitalOcean | [Развёртывание](https://docs.mikopbx.ru/mikopbx/setup/cloud/digitalocean) |<!--ru-->
| Vultr | [Развёртывание](https://docs.mikopbx.ru/mikopbx/setup/cloud/vultr) |<!--ru-->
| Alibaba Cloud | [Развёртывание](https://docs.mikopbx.ru/mikopbx/setup/cloud/alibaba-cloud) |<!--ru-->
| Hetzner Cloud | [Развёртывание](https://docs.mikopbx.ru/mikopbx/setup/cloud/hetzner-cloud) |<!--ru-->
<!--ru-->
### Первые шаги после установки<!--ru-->
<!--ru-->
Откройте веб-интерфейс и войдите с учётными данными по умолчанию — логин: `admin`, пароль: `admin`.<!--ru-->
Затем следуйте [руководству по быстрому старту](https://docs.mikopbx.ru/mikopbx/readme/quick-start).<!--ru-->
<!--ru-->
## Возможности<!--ru-->
<!--ru-->
* Компактный Linux-дистрибутив — загружается за секунды.<!--ru-->
* Простая установка и настройка.<!--ru-->
* Мультиязычный интерфейс (26 языков) с переводом сообществом через [Weblate](https://weblate.mikopbx.com).<!--ru-->
* Архитектуры x86_64 и ARM64.<!--ru-->
* Актуальный PJSIP-стек и Asterisk 22 LTS.<!--ru-->
* Двойной стек IPv4/IPv6.<!--ru-->
* Fail2Ban, файервол iptables, аутентификация WebAuthn/Passkey.<!--ru-->
* Модульная архитектура с маркетплейсом плагинов.<!--ru-->
* PHP 8.4, [Phalcon Framework](https://phalcon.io), Nginx, Redis.<!--ru-->
* REST API с 259+ эндпоинтами и JWT-аутентификацией.<!--ru-->
* Облачный автопровижининг (AWS, GCP, Azure, DigitalOcean, Vultr, Yandex Cloud, VK Cloud, Alibaba Cloud).<!--ru-->
* Кодовая база соответствует стандартам PSR и Airbnb JS style.<!--ru-->
<!--ru-->
## Системные требования<!--ru-->
<!--ru-->
| Одновременных вызовов | CPU | RAM | Диск |<!--ru-->
|------------------------|-----|-----|------|<!--ru-->
| 5–10 | 1 ГГц x86-64 или ARM64, 1–2 ядра | 2 ГБ | 1 ГБ система + 50 ГБ записи |<!--ru-->
| До 25 | 3 ГГц x86-64 или ARM64 | 2 ГБ | 1 ГБ система + 50 ГБ записи |<!--ru-->
| 25+ | 2× CPU 3 ГГц x86-64 | 4 ГБ+ | 1 ГБ система + 50 ГБ записи |<!--ru-->
<!--ru-->
Подробнее — [системные требования](https://docs.mikopbx.ru/mikopbx/readme/system-requirements).<!--ru-->
<!--ru-->
## Как модифицировать систему<!--ru-->
<!--ru-->
Для простой кастомизации используйте редактор приложений диалплана. Поддерживается PHP-AGI и язык диалплана Asterisk.<!--ru-->
<!--ru-->
<p align="center"><!--ru-->
    <img src="https://github.com/mikopbx/assets/raw/master/img/screenshots/ApplicationEditor.png"/><!--ru-->
</p><!--ru-->
<!--ru-->
Или редактируйте системные файлы напрямую через веб-интерфейс.<!--ru-->
<!--ru-->
<p align="center"><!--ru-->
    <img src="https://github.com/mikopbx/assets/raw/master/img/screenshots/SystemFileCustomization.png"/><!--ru-->
</p><!--ru-->
<!--ru-->
MikoPBX обычно загружается с раздела «только для чтения». Чтобы изменить файлы ядра, перемонтируйте раздел в режим записи командой SSH: `remount-offload`<!--ru-->
<!--ru-->
Для добавления новой функциональности рекомендуем использовать репозиторий [ModuleTemplate](https://github.com/mikopbx/ModuleTemplate).<!--ru-->
<!--ru-->
## Архитектура<!--ru-->
<!--ru-->
MikoPBX — это самодостаточный Linux-дистрибутив, собранный на базе [T2 SDE](https://t2sde.org/). Ключевые компоненты:<!--ru-->
<!--ru-->
| Компонент | Версия | Назначение |<!--ru-->
|-----------|--------|------------|<!--ru-->
| **Asterisk** | 22 | Движок АТС с PJSIP-стеком |<!--ru-->
| **PHP** | 8.4 | Среда исполнения |<!--ru-->
| **Phalcon** | 5 | Высокопроизводительный PHP-фреймворк |<!--ru-->
| **Nginx** | 1.29 | Веб-сервер с поддержкой WebSocket (nchan) |<!--ru-->
| **Redis** | 7 | Кеш, сессии и очередь API |<!--ru-->
| **Beanstalkd** | 1.12 | Обработка фоновых задач |<!--ru-->
| **Fail2Ban** | 1 | Защита от вторжений |<!--ru-->
| **SQLite** | — | Основная БД и хранение CDR |<!--ru-->
<!--ru-->
### Структура исходного кода<!--ru-->
<!--ru-->
```<!--ru-->
src/<!--ru-->
├── AdminCabinet/     # Веб-интерфейс (MVC + Volt-шаблоны + Semantic UI)<!--ru-->
├── Common/           # Модели, переводы, провайдеры DI<!--ru-->
├── Core/             # Конфигурации Asterisk, системные утилиты, воркеры<!--ru-->
├── Modules/          # Фреймворк модулей<!--ru-->
├── PBXCoreREST/      # REST API (49 контроллеров, 259+ эндпоинтов)<!--ru-->
└── Service/          # Сервисный слой<!--ru-->
```<!--ru-->
<!--ru-->
## Перевод интерфейса и документации<!--ru-->
<!--ru-->
Веб-интерфейс переведён на 26 языков силами сообщества:<!--ru-->
<!--ru-->
<p align="center"><!--ru-->
    <img src="https://github.com/mikopbx/assets/raw/master/img/screenshots/LanguageSettings2.png" height="500"/><!--ru-->
</p><!--ru-->
<!--ru-->
Если вы нашли ошибку в переводе, исправьте её на сервисе [Weblate](https://weblate.mikopbx.com).<!--ru-->
<!--ru-->
## Участие в разработке<!--ru-->
<!--ru-->
Мы приветствуем вклад в проект! Ознакомьтесь с [CONTRIBUTING.md](CONTRIBUTING.md).<!--ru-->
<!--ru-->
## Сообщество и поддержка<!--ru-->
<!--ru-->
- **Форум**: [forum.mikopbx.com](https://forum.mikopbx.com) — вопросы, обсуждения, помощь сообщества<!--ru-->
- **Telegram**: [Чат разработчиков](https://t.me/mikopbx_dev) — общение в реальном времени<!--ru-->
- **Баг-репорты**: [GitHub Issues](https://github.com/mikopbx/Core/issues)<!--ru-->
- **Документация**: [docs.mikopbx.ru](https://docs.mikopbx.ru)<!--ru-->
- **Платная поддержка**: [Профессиональная поддержка](https://www.mikopbx.com/support/) от MIKO LLC<!--ru-->
<!--ru-->
## Спонсоры<!--ru-->
<!--ru-->
Станьте спонсором и разместите ваш логотип в README на GitHub со ссылкой на ваш сайт. [Стать спонсором](https://patreon.com/mikopbx)<!--ru-->
<!--ru-->
## Лицензия<!--ru-->
<!--ru-->
MikoPBX© — бесплатная АТС для малого бизнеса<!--ru-->
Copyright © 2017–2026 Алексей Портнов и Николай Бекетов<!--ru-->
<!--ru-->
Эта программа является свободным программным обеспечением: вы можете распространять<!--ru-->
её и/или модифицировать в соответствии с условиями GNU General Public License,<!--ru-->
опубликованной Free Software Foundation; либо версии 3 лицензии, либо<!--ru-->
(по вашему выбору) любой более поздней версии.<!--ru-->
<!--ru-->
Эта программа распространяется в надежде, что она будет полезной,<!--ru-->
но БЕЗ КАКИХ-ЛИБО ГАРАНТИЙ. Подробности см. в GNU General Public License.<!--ru-->
<!--ru-->
Вы должны были получить копию GNU General Public License вместе с этой программой.<!--ru-->
Если нет, см. <https://www.gnu.org/licenses/>.<!--ru-->
