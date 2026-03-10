[![Статус перевода](https://weblate.mikopbx.com/widgets/mikopbx/-/admin-web-interface/svg-badge.svg)](https://weblate.mikopbx.com/engage/mikopbx/)
[![Загрузки](https://img.shields.io/github/downloads/mikopbx/core/total)](https://github.com/mikopbx/Core/releases)
[![Последний релиз](https://img.shields.io/github/v/release/mikopbx/core?color=blue)](https://github.com/mikopbx/Core/releases/latest)
[![Последний коммит](https://img.shields.io/github/last-commit/mikopbx/core/develop?label=last%20commit%20on%20develop)](https://github.com/mikopbx/Core/tree/develop)
[![Качество кода](https://img.shields.io/github/actions/workflow/status/mikopbx/core/code-quality.yml?branch=develop&label=code%20quality)](https://github.com/mikopbx/Core/actions/workflows/code-quality.yml)
![Лицензия](https://img.shields.io/github/license/mikopbx/core)

# MikoPBX — Бесплатная АТС для малого бизнеса

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

> [🇬🇧 English version](README.md)

## Что такое MikoPBX?

MikoPBX — это АТС с открытым исходным кодом и современным веб-интерфейсом для управления [Asterisk](https://www.asterisk.org/). Поставляется как компактный Linux-дистрибутив с полной предустановкой всех необходимых сервисов — Asterisk, Nginx, PHP-FPM, Redis, Fail2Ban и других. Вы можете написать любой модуль и распространять его через встроенный маркетплейс.

Устанавливайте MikoPBX на физический сервер, в виртуальную машину, Docker- или LXC-контейнер, либо в любом крупном облаке (AWS, Google Cloud, Azure и др.)

<p align="center">
    <a href="https://www.mikopbx.ru">
        <img src="https://github.com/mikopbx/assets/raw/master/img/screenshots/ExtensionsList.png"/>
    </a>
</p>

Система имеет удобный веб-интерфейс с записью разговоров, конференц-связью, голосовой почтой, переводом и перехватом звонков, очередями вызовов, IVR-меню, правилами входящих и исходящих вызовов, переключателем праздников и ночного режима, редактором call-flow и маркетплейсом с платными и бесплатными расширениями. Вся основная бизнес-функциональность бесплатна навсегда!

* Английский [сайт](https://www.mikopbx.com)
* Русский [сайт](https://www.mikopbx.ru)

## Начало работы

### Способы установки

MikoPBX можно развернуть несколькими способами в зависимости от вашего окружения:

#### На физический сервер
- [Установка с Live USB](https://docs.mikopbx.ru/mikopbx/setup/bare-metal/live-usb)
- [Установка на загрузочный USB](https://docs.mikopbx.ru/mikopbx/setup/bare-metal/bootable-usb)

#### Виртуальная машина

Скачайте [последний ISO](https://github.com/mikopbx/Core/releases/latest) и загрузитесь с него в гипервизоре:

| Гипервизор | Инструкция |
|------------|------------|
| VMware ESXi | [Руководство по установке](https://docs.mikopbx.ru/mikopbx/setup/hypervisor/vmware-esxi) |
| VMware Workstation Pro | [Руководство по установке](https://docs.mikopbx.ru/mikopbx/setup/hypervisor/vmware-workstation-pro) |
| VMware Fusion (Mac) | [Руководство по установке](https://docs.mikopbx.ru/mikopbx/setup/hypervisor/vmware-fusion) |
| VirtualBox | [Руководство по установке](https://docs.mikopbx.ru/mikopbx/setup/hypervisor/virtualbox) |
| Hyper-V | [Руководство по установке](https://docs.mikopbx.ru/mikopbx/setup/hypervisor/hyper-v) |
| Proxmox (ВМ) | [Руководство по установке](https://docs.mikopbx.ru/mikopbx/setup/hypervisor/proxmox) |
| Proxmox (LXC-контейнер) | [Руководство по установке](https://docs.mikopbx.ru/mikopbx/setup/hypervisor/proxmox/lxc) |
| UTM (Apple Silicon) | [Руководство по установке](https://docs.mikopbx.ru/mikopbx/setup/hypervisor/utm) |

#### Docker-контейнер

- [Установка Docker и подготовка](https://docs.mikopbx.ru/mikopbx/setup/docker/docker-installation)
- [Запуск MikoPBX в контейнере](https://docs.mikopbx.ru/mikopbx/setup/docker/running-mikopbx-in-container)
- [Запуск MikoPBX через Docker Compose](https://docs.mikopbx.ru/mikopbx/setup/docker/running-mikopbx-using-docker-compose)

#### Облачные провайдеры

| Провайдер | Инструкция |
|-----------|------------|
| Яндекс.Облако | [Обзор](https://docs.mikopbx.ru/mikopbx/setup/cloud/yandex-cloud) &bull; [Marketplace](https://docs.mikopbx.ru/mikopbx/setup/cloud/yandex-cloud/yandex-cloud-marketplace) &bull; [Произвольный образ](https://docs.mikopbx.ru/mikopbx/setup/cloud/yandex-cloud/proizvolnyi-obraz) &bull; [CLI](https://docs.mikopbx.ru/mikopbx/setup/cloud/yandex-cloud/yandex-cloud-cli) |
| VK Cloud | [Развёртывание](https://docs.mikopbx.ru/mikopbx/setup/cloud/vk-cloud) |
| Selectel | [Развёртывание](https://docs.mikopbx.ru/mikopbx/setup/cloud/selectel) |
| 1C Облачная инфраструктура | [Развёртывание](https://docs.mikopbx.ru/mikopbx/setup/cloud/1c-oblachnaya-infrastruktura) |
| AWS EC2 | [Развёртывание](https://docs.mikopbx.ru/mikopbx/setup/cloud/aws/aws-deployment-guide) &bull; [AWS Marketplace](https://docs.mikopbx.ru/mikopbx/setup/cloud/aws/aws-marketplace) |
| Google Cloud | [Развёртывание](https://docs.mikopbx.ru/mikopbx/setup/cloud/google-cloud/deployment-guide) &bull; [GCP Marketplace](https://docs.mikopbx.ru/mikopbx/setup/cloud/google-cloud/marketplace) |
| Microsoft Azure | [Развёртывание](https://docs.mikopbx.ru/mikopbx/setup/cloud/microsoft-azure) |
| DigitalOcean | [Развёртывание](https://docs.mikopbx.ru/mikopbx/setup/cloud/digitalocean) |
| Vultr | [Развёртывание](https://docs.mikopbx.ru/mikopbx/setup/cloud/vultr) |
| Alibaba Cloud | [Развёртывание](https://docs.mikopbx.ru/mikopbx/setup/cloud/alibaba-cloud) |
| Hetzner Cloud | [Развёртывание](https://docs.mikopbx.ru/mikopbx/setup/cloud/hetzner-cloud) |

### Первые шаги после установки

Откройте веб-интерфейс и войдите с учётными данными по умолчанию — логин: `admin`, пароль: `admin`.
Затем следуйте [руководству по быстрому старту](https://docs.mikopbx.ru/mikopbx/readme/quick-start).

## Возможности

* Компактный Linux-дистрибутив — загружается за секунды.
* Простая установка и настройка.
* Мультиязычный интерфейс (26 языков) с переводом сообществом через [Weblate](https://weblate.mikopbx.com).
* Архитектуры x86_64 и ARM64.
* Актуальный PJSIP-стек и Asterisk 22 LTS.
* Двойной стек IPv4/IPv6.
* Fail2Ban, файервол iptables, аутентификация WebAuthn/Passkey.
* Модульная архитектура с маркетплейсом плагинов.
* PHP 8.4, [Phalcon Framework](https://phalcon.io), Nginx, Redis.
* REST API с 259+ эндпоинтами и JWT-аутентификацией.
* Облачный автопровижининг (AWS, GCP, Azure, DigitalOcean, Vultr, Yandex Cloud, VK Cloud, Alibaba Cloud).
* Кодовая база соответствует стандартам PSR и Airbnb JS style.

## Системные требования

| Одновременных вызовов | CPU | RAM | Диск |
|------------------------|-----|-----|------|
| 5–10 | 1 ГГц x86-64 или ARM64, 1–2 ядра | 2 ГБ | 1 ГБ система + 50 ГБ записи |
| До 25 | 3 ГГц x86-64 или ARM64 | 2 ГБ | 1 ГБ система + 50 ГБ записи |
| 25+ | 2× CPU 3 ГГц x86-64 | 4 ГБ+ | 1 ГБ система + 50 ГБ записи |

Подробнее — [системные требования](https://docs.mikopbx.ru/mikopbx/readme/system-requirements).

## Как модифицировать систему

Для простой кастомизации используйте редактор приложений диалплана. Поддерживается PHP-AGI и язык диалплана Asterisk.

<p align="center">
    <img src="https://github.com/mikopbx/assets/raw/master/img/screenshots/ApplicationEditor.png"/>
</p>

Или редактируйте системные файлы напрямую через веб-интерфейс.

<p align="center">
    <img src="https://github.com/mikopbx/assets/raw/master/img/screenshots/SystemFileCustomization.png"/>
</p>

MikoPBX обычно загружается с раздела «только для чтения». Чтобы изменить файлы ядра, перемонтируйте раздел в режим записи командой SSH: `remount-offload`

Для добавления новой функциональности рекомендуем использовать репозиторий [ModuleTemplate](https://github.com/mikopbx/ModuleTemplate).

## Архитектура

MikoPBX — это самодостаточный Linux-дистрибутив, собранный на базе [T2 SDE](https://t2sde.org/). Ключевые компоненты:

| Компонент | Версия | Назначение |
|-----------|--------|------------|
| **Asterisk** | 22 | Движок АТС с PJSIP-стеком |
| **PHP** | 8.4 | Среда исполнения |
| **Phalcon** | 5 | Высокопроизводительный PHP-фреймворк |
| **Nginx** | 1.29 | Веб-сервер с поддержкой WebSocket (nchan) |
| **Redis** | 7 | Кеш, сессии и очередь API |
| **Beanstalkd** | 1.12 | Обработка фоновых задач |
| **Fail2Ban** | 1 | Защита от вторжений |
| **SQLite** | — | Основная БД и хранение CDR |

### Структура исходного кода

```
src/
├── AdminCabinet/     # Веб-интерфейс (MVC + Volt-шаблоны + Semantic UI)
├── Common/           # Модели, переводы, провайдеры DI
├── Core/             # Конфигурации Asterisk, системные утилиты, воркеры
├── Modules/          # Фреймворк модулей
├── PBXCoreREST/      # REST API (49 контроллеров, 259+ эндпоинтов)
└── Service/          # Сервисный слой
```

## Перевод интерфейса и документации

Веб-интерфейс переведён на 26 языков силами сообщества:

<p align="center">
    <img src="https://github.com/mikopbx/assets/raw/master/img/screenshots/LanguageSettings2.png" height="500"/>
</p>

Если вы нашли ошибку в переводе, исправьте её на сервисе [Weblate](https://weblate.mikopbx.com).

## Участие в разработке

Мы приветствуем вклад в проект! Ознакомьтесь с [CONTRIBUTING.md](CONTRIBUTING.md).

## Сообщество и поддержка

- **Форум**: [forum.mikopbx.com](https://forum.mikopbx.com) — вопросы, обсуждения, помощь сообщества
- **Telegram**: [Чат разработчиков](https://t.me/mikopbx_dev) — общение в реальном времени
- **Баг-репорты**: [GitHub Issues](https://github.com/mikopbx/Core/issues)
- **Документация**: [docs.mikopbx.ru](https://docs.mikopbx.ru)
- **Платная поддержка**: [Профессиональная поддержка](https://www.mikopbx.com/support/) от MIKO LLC

## Спонсоры

Станьте спонсором и разместите ваш логотип в README на GitHub со ссылкой на ваш сайт. [Стать спонсором](https://patreon.com/mikopbx)

## Лицензия

MikoPBX© — бесплатная АТС для малого бизнеса
Copyright © 2017–2026 Алексей Портнов и Николай Бекетов

Эта программа является свободным программным обеспечением: вы можете распространять
её и/или модифицировать в соответствии с условиями GNU General Public License,
опубликованной Free Software Foundation; либо версии 3 лицензии, либо
(по вашему выбору) любой более поздней версии.

Эта программа распространяется в надежде, что она будет полезной,
но БЕЗ КАКИХ-ЛИБО ГАРАНТИЙ. Подробности см. в GNU General Public License.

Вы должны были получить копию GNU General Public License вместе с этой программой.
Если нет, см. <https://www.gnu.org/licenses/>.
