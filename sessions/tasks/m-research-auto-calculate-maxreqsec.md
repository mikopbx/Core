---
name: m-research-auto-calculate-maxreqsec
branch: none
status: pending
created: 2026-03-19
---

# Research: Auto-calculate safe PBXFirewallMaxReqSec from system data

## Problem/Goal
Текущий MaxReqSec (hashlimit per source IP) настраивается вручную. Неправильное значение приводит к:
- Слишком низкое: блокировка легитимных устройств (особенно за NAT при массовом reboot)
- Слишком высокое: не защищает от SIP flood

Нужна формула расчёта безопасного значения на основе реальных данных системы. Клиенты от 3 до 2200 сотрудников.

### Главная мотивация
MaxReqSec — это **первая линия обороны перед fail2ban**. При SIP flood без hashlimit:
- security_log растёт на гигабайты за минуты (7GB security_log.10 на boffart)
- fail2ban не успевает парсить лог и банить — падает или зависает
- Asterisk перегружается обработкой тысяч REGISTER/INVITE
hashlimit дропает flood на уровне iptables ДО Asterisk, защищая и логи и fail2ban.

## Success Criteria
- [ ] Формула расчёта MaxReqSec на основе данных системы
- [ ] Формула работает для диапазона 3-2200 сотрудников
- [ ] Учтён NAT-сценарий (все устройства с одного IP)
- [ ] Учтён пиковый сценарий (массовый reboot после отключения питания)
- [ ] Предложение по UI: автоматический расчёт vs рекомендация пользователю

## Data Sources Available in MikoPBX

### Можно получить из БД/конфигов:
- `Extensions::count()` — кол-во внутренних номеров (≈ кол-во SIP устройств)
- `SipProviders::count()` + `IaxProviders::count()` — кол-во провайдеров
- `SIPConf::MAX_CONTACTS_PEER` = 5 — макс контактов на peer
- `SIPConf::QUALIFY_FREQUENCY` = 60 — OPTIONS keepalive интервал
- `NetworkFilters::find()` — whitelist подсетей (NAT-сценарий)

### Можно получить из CDR:
- Пиковое кол-во одновременных вызовов (за последние 30 дней)
- Среднее кол-во вызовов в час

### Можно получить из Asterisk:
- `pjsip show registrations` — текущие регистрации
- `core show channels count` — активные каналы

## SIP Traffic Analysis

### Per-device нормальная нагрузка (NEW пакетов/сек от одного IP):
- REGISTER: 1 пакет каждые 60-120 сек
- Каждый вызов: ~5 NEW пакетов (INVITE, ACK, BYE, re-INVITE, CANCEL)
- OPTIONS keepalive (если включён): 1/мин

### Пиковые сценарии:
1. **Массовый reboot за NAT**: N устройств × REGISTER за 1-5 сек = N пакетов/сек
2. **Пиковый час в call-центре**: 100 одновременных вызовов × 5 пакетов = ~500 NEW/мин = ~8/сек
3. **Провайдер с qualify**: 1 OPTIONS/мин × кол-во trunk'ов

### Масштаб клиентов:
| Размер | Extensions | Типичный NAT | Пик при reboot | Безопасный лимит |
|--------|-----------|--------------|----------------|-----------------|
| Мини-офис | 3-10 | 3-10/сек | ~10 | 20 |
| Малый офис | 10-50 | 10-50/сек | ~50 | 100 |
| Средний | 50-200 | 50-200/сек | ~200 | 300 |
| Крупный | 200-500 | 200-500/сек | ~500 | 600 |
| Enterprise | 500-2200 | 500-2200/сек | ~2200 | 2500 |

## Draft Formula Ideas

### Вариант A: Линейная от extensions
```
maxReqSec = max(extensions * 1.5, 30)
```
Проблема: не учитывает NAT (может быть 2200 устройств за одним IP)

### Вариант B: С учётом NAT
```
// Если есть whitelist подсети с маской < /28 — вероятен NAT
hasNAT = NetworkFilters has subnet with mask < 28
natMultiplier = hasNAT ? extensions : max(extensions * 0.1, 10)
maxReqSec = max(natMultiplier * 1.5, 30)
```

### Вариант C: От пиковых вызовов (CDR-based)
```
peakCalls = max concurrent calls from CDR (last 30 days)
rebootBurst = extensions // worst case: all reboot at once
maxReqSec = max(peakCalls * 5, rebootBurst, 30)
```

### Вариант D: Комбинированный
```
baseRate = extensions * 1.2  // normal operation headroom
burstRate = extensions       // reboot scenario
peakRate = peakConcurrentCalls * 5  // peak call hour
maxReqSec = max(baseRate, burstRate, peakRate, 30)
```

## Key Questions
1. hashlimit `--hashlimit-mode srcip` считает per source IP — при NAT все устройства = 1 IP, нужен лимит >= кол-во устройств
2. hashlimit `--hashlimit-burst` = то же значение — burst допускает пик равный лимиту
3. Whitelist IP (Network Filters) должен идти ДО hashlimit (баг с порядком правил — отдельный фикс)
4. Если whitelist фикс реализован — NAT-клиенты в whitelist не попадают под hashlimit, и формула упрощается

## Implementation Options
1. **Auto-calculate при сохранении** — пересчитать при каждом сохранении настроек firewall
2. **Рекомендация в UI** — показать рекомендуемое значение, пользователь подтверждает
3. **Cron-based** — пересчитывать раз в день на основе CDR статистики

## Context Manifest
<!-- Added by context-gathering agent -->

## Work Log
- [2026-03-19] Task created
