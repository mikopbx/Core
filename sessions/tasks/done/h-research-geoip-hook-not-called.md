---
name: h-research-geoip-hook-not-called
branch: none
status: completed
created: 2026-03-18
---

# Research: Why MikoPBX Core doesn't call ModuleGeoIP onAfterIptablesReload hook

## Problem/Goal
Модуль ModuleGeoIP добавляет правило iptables (`-A INPUT -m set --match-set geoip_blocked_v4 src -j DROP`) через хук `onAfterIptablesReload()` в классе `GeoIPConf extends ConfigClass`. При каждом firewall reload Core пересоздаёт все iptables правила с нуля, а затем должен вызвать `onAfterIptablesReload()` у всех модулей — но у ModuleGeoIP этот хук не вызывается.

### Симптомы
1. GeoIP правило в iptables исчезает после firewall reload
2. В syslog нет записей от `GeoIPConf::onAfterIptablesReload` — ни успешных, ни ошибочных
3. Firewall reload происходит регулярно — в логах видны ReloadFirewallAction
4. GeoIP правило появляется только когда worker `WorkerGeoIPUpdater` завершает обновление CIDR и сам вызывает `IptablesConf::reloadFirewall()` — в этом случае хук срабатывает
5. Между firewall reload и следующим запуском worker'а есть окно уязвимости

## Success Criteria
- [x] Найти точную причину почему хук не вызывается при стандартном firewall reload
- [x] Предложить исправление (в Core или в модуле)
- [x] Если хук не может быть исправлен — предложить альтернативный подход

## Resolution
Хук `ON_AFTER_IPTABLES_RELOAD` уже присутствует в `IptablesConf::applyConfig()` строка 198. Он работает корректно как из CLI, так и через WorkerModelsEvents. Проблема была в том что на сервере стояла старая версия файла до коммита `cc9dd7300` (fix: replace iptables recent with hashlimit). После перезагрузки сервера и hot-patch'а файл обновился и хук заработал. Исправление в Core или модуле не требуется.

## Research Plan

### 1. Как Core вызывает хуки модулей при firewall reload
- `IptablesConf::reloadFirewall()` — где вызывается `onAfterIptablesReload`
- `ReloadFirewallAction` — как он вызывает reload и вызывает ли хуки
- `PBXConfModulesProvider::hookModulesMethod()` — механизм вызова хуков

### 2. Регистрация хука
- Как Core узнаёт что у модуля есть метод `onAfterIptablesReload`? Reflection? Реестр? Интерфейс?
- Есть ли кэш конфигов модулей
- Нужна ли дополнительная регистрация помимо наследования от ConfigClass

### 3. Сравнение с другими модулями
- Есть ли модули с `onAfterIptablesReload` в `/Volumes/DevDisk/apor/Developement/MikoPBX/Extensions/`
- Как они реализованы

### 4. Проверка на сервере
- `File is not original: /usr/www/src/Core/System/Configs/IptablesConf.php` — файл модифицирован, проверить не сломана ли логика хуков

## Key Files
- Core: `src/Core/System/Configs/IptablesConf.php`
- Core: `src/Core/Workers/Libs/WorkerModelsEvents/Actions/ReloadFirewallAction.php`
- Core: `src/Common/Providers/PBXConfModulesProvider.php`
- Core: `src/Core/Asterisk/Configs/AsteriskConfigInterface.php` (hook constants)
- Module: `/Volumes/DevDisk/apor/Developement/MikoPBX/Extensions/ModuleGeoIP/Lib/GeoIPConf.php`
- Server: `serber@boffart.miko.ru`, module path: `/storage/usbdisk1/mikopbx/custom_modules/ModuleGeoIP/`

## Context Manifest
<!-- Added by context-gathering agent -->

## Work Log
- [2026-03-18] Task created
