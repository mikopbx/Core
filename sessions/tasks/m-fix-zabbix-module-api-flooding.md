---
name: m-fix-zabbix-module-api-flooding
branch: fix/zabbix-module-caching
status: pending
created: 2026-04-03
---

# ModuleZabbixAgent5 — устранить лавину REST API запросов через кэширование

## Problem/Goal

ModuleZabbixAgent5 при каждом опросе Zabbix-сервера порождает отдельный PHP-процесс (`AsteriskInfo.php`) для каждой комбинации транк × метрика × направление × период. Каждый процесс:

1. Поднимает полный Phalcon DI-стек (~46MB RAM)
2. Делает HTTP-запрос к REST API `cdr:getStatsByProvider`
3. Запрос попадает в Redis-очередь → WorkerApiCommands → SQLite CDR

При 6 провайдерах и стандартных Zabbix-шаблонах это **десятки параллельных запросов** каждые 30-60 секунд. На боевом сервере (sip.miko.ru) это вызвало:
- Load average до 2.0 на 3 CPU
- Очередь API до 1058 pending requests
- Таймауты 30+ секунд на все API-запросы
- Полную недоступность веб-интерфейса
- Zombie-процессы (php <defunct>)

**Сам SQL-запрос быстрый** (4-70ms на 224K записей). Проблема в thundering herd — массовые параллельные REST API запросы забивают очередь из 3 WorkerApiCommands.

## Архитектурное решение

Заменить подход «каждый Zabbix-опрос = REST API запрос» на «фоновый воркер считает → Zabbix читает из кэша»:

1. **Фоновый воркер** (WorkerZabbixStatsCollector или расширение ConnectorDB):
   - Раз в N секунд (настраиваемо, по умолчанию 60) считает статистику по всем провайдерам одним запросом
   - Складывает результаты в Redis с TTL
   - Ключи: `zabbix:stats:{providerId}:{direction}:{period}` = JSON с метриками

2. **AsteriskInfo.php::trunkCalls()** — вместо REST API вызова просто делает `redis-cli GET` нужного ключа

## Success Criteria

- [ ] Фоновый воркер считает статистику по расписанию (не чаще раза в минуту)
- [ ] AsteriskInfo.php читает готовые данные из Redis без REST API вызовов
- [ ] Один Zabbix-опрос НЕ порождает PHP-процесс с полным DI-стеком (или хотя бы не делает HTTP-запрос)
- [ ] При 6 провайдерах нагрузка на API-очередь = 0 запросов от Zabbix-модуля
- [ ] Статистика обновляется не реже раза в минуту
- [ ] getAllProviderStatuses() тоже кэшируется (ещё один тяжёлый вызов — `getStatuses`)

## Context Manifest

### Ключевые файлы модуля (на сервере)

| Файл | Назначение |
|------|------------|
| `/storage/usbdisk1/mikopbx/custom_modules/ModuleZabbixAgent5/Lib/AsteriskInfo.php` | Основной класс — вызывается из Zabbix UserParameter скриптов |
| `/storage/usbdisk1/mikopbx/custom_modules/ModuleZabbixAgent5/bin/asterisk-stats.sh` | Shell-обёртка, вызывающая AsteriskInfo.php |
| `/etc/custom_modules/ModuleZabbixAgent5/zabbix_agentd.conf` | Конфиг Zabbix-агента с UserParameter определениями |

### Методы AsteriskInfo.php

| Метод | Что делает | Как вызывает API |
|-------|------------|------------------|
| `trunkCalls($trunkId, $period, $direction, $metric)` | CDR статистика по транку | `callApi('/pbxcore/api/v3/cdr:getStatsByProvider', ...)` |
| `getAllProviderStatuses()` | Статусы всех провайдеров | `callApi('/pbxcore/api/v3/sip-providers:getStatuses')` |
| `countCalls()` | Количество активных звонков | `callApi('/pbxcore/api/v3/pbx-status:getActiveCalls')` |
| `callApi($path, $params)` | Обёртка REST API через PBXCoreRESTClientProvider | HTTP GET к localhost |

### Ключевые файлы ядра

| Файл | Зачем нужен |
|------|-------------|
| `src/PBXCoreREST/Lib/Cdr/GetStatsByProviderAction.php` | SQL-запрос к CDR (строки 199-221) — сам по себе быстрый (4-70ms) |
| `src/PBXCoreREST/Workers/WorkerApiCommands.php` | 3 инстанса обрабатывают Redis-очередь — узкое место при лавине запросов |

### Диагностические данные (production 2026-04-03)

- **Timeout breakdown**: getStatsByProvider 81 (52%), getStatuses 42 (27%), getActiveCalls 10 (6%)
- **CDR DB**: 273K записей, 173MB, SQLite
- **SQL performance**: 4-70ms на демо-сервере (проблема не в SQL)
- **Причина таймаутов**: thundering herd — десятки параллельных REST API запросов забивают очередь 3 воркеров

## User Notes
- Модуль пока отключён на боевом сервере sip.miko.ru
- Репозиторий модуля отдельный от Core — нужно найти или клонировать
- Демо-сервер 172.16.32.94 имеет копию CDR базы для тестирования

## Work Log
- [2026-04-03] Task created based on production incident analysis on sip.miko.ru
