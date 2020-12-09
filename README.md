[![Translation status](https://weblate.mikopbx.com/widgets/mikopbx/-/admin-web-interface/svg-badge.svg)](https://weblate.mikopbx.com/engage/mikopbx/?utm_source=widget)
[![GitHub All Releases](https://img.shields.io/github/downloads/mikopbx/core/total)](https://github.com/mikopbx/Core/releases)
[![GitHub last commit (branch)](https://img.shields.io/github/last-commit/mikopbx/core/develop?label=last%20commit%20on%20develop)](https://github.com/mikopbx/Core/tree/develop)
[![Scrutinizer Code Quality](https://scrutinizer-ci.com/g/mikopbx/Core/badges/quality-score.png?b=develop)](https://scrutinizer-ci.com/g/mikopbx/Core/?branch=develop)
![GitHub](https://img.shields.io/github/license/mikopbx/core)
# MikoPBX - free phone system for small business

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

## What's MikoPBX?
MikoPBX is an open-source GUI (graphical user interface) that controls and manages Asterisk© (PBX). MikoPBX is licensed under GPL. MikoPBX is an entirely modular GUI for Asterisk written in PHP and Javascript. Meaning you can simply write any module you can think of and distribute it free of cost to your clients so that they can take advantage of beneficial features in [Asterisk](http://www.asterisk.org/ "Asterisk Home Page")

<p align="center">
    <a href="https://www.mikopbx.com">
        <img src="https://github.com/mikopbx/assets/raw/master/img/screenshots/ExtensionsList.png"/>
    </a>
</p>

MikoPBX is a full-featured phone solution with top performance level, high stability and rich functionality. You can install MikoPBX on premise (hardware installation) or in any type of cloud-services (Google cloud, Amazon Cloud Solution, Microsoft Azure etc.)

The system has an easy and convenient web interface, call recording, conference calls, voice mail, call transfers and pickup, call queues, interactive voice response(IVR) menu, inbound and outbound call rules. Also, you can find holidays and night-time calls switcher there. Apart from MikoPBX has custom call-flow programming module and marketplace with paid and free extensions. All general business functionality is absolutely free forever!

* The russian [website](https://www.mikopbx.ru)
* The english [website](https://www.mikopbx.com)

## Getting Started
1. Download [latest released](https://github.com/mikopbx/Core/releases/latest) ISO file in assets section
2. Create a new virtual machine (e.g. VMware Player)
3. Select **Other Linux 4.x kernel 64-bit** on the virtual machine settings
4. Boot from ISO firmware and install MikoPBX on storage according to internal instructions.
5. Continue set up your PBX system over a web interface with default credentials Username: *admin*  password: *admin*

Or follow our wiki for [additional instructions](https://wiki.mikopbx.com/en:setup#live_cd).

## Features
* A very little Linux distributive.
* Easy to install and easy to setup.
* Multilanguage interface with community-supported translation service.
* Wiki documentation with context helpers on the web interface.
* Latest PJSIP stack and Asterisk LTS 16 release installed.
* Fail2Ban and iptables already included.
* Modular architecture.
* Plugins marketplace.
* The PHP7.4 and [phalcon framework](https://phalcon.io)
* The modern codebase was written according to PSR standards and Airbnb JS code style.
* Friendly community :)

## Requirements
Concurrent calls | Minimum recommended
------------ | -------------
5 to 10 | 1 GHz x86-64, 512 MB RAM
Up to 25 | 3 GHz x86-64, 1 GB RAM
More than 25 | Dual CPUs 3 GHz x86-64, 2 MB RAM or more

## How to modify your system
MikoPBX usually loads from read-only *offload* partition. If you want to change something in the core module, you should remount the partition to *write mode* with a console (SSH) command **remount-offload**

If you want to add some new functionality, we strongly advise you look at [ModuleTemplate](https://github.com/mikopbx/ModuleTemplate) repository.

For some easy customisations, you can use a dialplan application point on a menu. Dialplan application supports PHP-AGI or Asterisk Dialplan language.
 <p align="center">
     <img src="https://github.com/mikopbx/assets/raw/master/img/screenshots/ApplicationEditor.png"/>
 </p>

Or direct system file customisation on the web interface.
<p align="center">
<img src="https://github.com/mikopbx/assets/raw/master/img/screenshots/SystemFileCustomization.png"/>
</p>

## How to report bugs and issues?
Be free to report about it [here](https://github.com/mikopbx/Core/issues)

For some ideas or question, you are welcome to  [our discussion club](https://github.com/mikopbx/Core/discussions)

The chat with developers you can find on [telegram](https://t.me/mikopbx_dev)

## Interface and documentation translation
We have already translated the web interface on several languages by Google translation service for the next list of languages:
<p align="center">
<img src="https://github.com/mikopbx/assets/raw/master/img/screenshots/LanguageSettings.png"/>
</p>

If you find some mistakes, you are welcome to fix it on [Weblate](https://weblate.mikopbx.com) translation service.

## Support
We offer [paid support](https://www.mikopbx.com/support/) from MIKO LLC., the company behind MikoPBX.

Or you can ask for community help [here](https://github.com/mikopbx/Core/discussions) or [here](https://qa.askozia.ru)

## Sponsors
Become a sponsor and get your logo on our README on Github with a link to your site. [Become a sponsor](https://patreon.com/mikopbx)

## License
MikoPBX is open source software licensed under the GPL-3.0 License.
