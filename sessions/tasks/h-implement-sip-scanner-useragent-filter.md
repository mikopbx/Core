---
name: h-implement-sip-scanner-useragent-filter
branch: feature/sip-scanner-filter
status: pending
created: 2026-03-20
---

# SIP scanner User-Agent filter via iptables string matching

## Problem/Goal
SIP-сканеры (sipvicious, friendly-scanner и др.) используют характерные User-Agent строки. Можно дропать их пакеты на уровне iptables ДО Asterisk — без нагрузки на PBX, логи и fail2ban.

Используем `iptables -m string --algo bm` для поиска известных User-Agent строк в SIP-пакетах на портах 5060/5061 (UDP+TCP).

## Scanner User-Agents to Block

```
sipcli
sip-scan
iWar
sipvicious
sipsak
sundayddr
VaxSIPUserAgent
friendly-scanner
```

Дополнительно исследовать:
- `censysinspect` — видели в логах boffart
- `pplsip` — распространённый сканер
- `LinPhone` (если не используется клиентами)
- Пустой User-Agent

## Implementation

Правила добавляются в `IptablesConf::applyConfig()` после ESTABLISHED,RELATED и перед hashlimit:

```php
// Drop known SIP scanner User-Agents at iptables level
$scannerAgents = ['sipcli', 'sip-scan', 'iWar', 'sipvicious', 'sipsak',
                  'sundayddr', 'VaxSIPUserAgent', 'friendly-scanner'];
foreach ($scannerAgents as $agent) {
    foreach (['udp', 'tcp'] as $protocol) {
        foreach ([$this->sipPort, $this->tlsPort] as $port) {
            $rule = "-p $protocol --dport $port"
                  . " -m string --string '$agent' --algo bm --to 65535";
            $arr_command[] = $this->getIptablesInputRule($port, $rule, 'DROP');
        }
    }
}
```

### Порядок правил в цепочке INPUT:
1. ACCEPT ESTABLISHED,RELATED
2. **DROP known scanner User-Agents** ← новое
3. DROP hashlimit (rate-limit)
4. ACCEPT whitelist (Network Filters)
5. ACCEPT catch-all services
6. Module hooks (GeoIP DROP)
7. DROP default

## Key File
- `src/Core/System/Configs/IptablesConf.php` — метод `applyConfig()`

## Success Criteria
- [ ] Пакеты с User-Agent из списка дропаются на iptables без Asterisk
- [ ] Правила для UDP и TCP на SIP/TLS портах
- [ ] Правила добавляются при firewall reload
- [ ] Не блокируют легитимные SIP-клиенты (Zoiper, Ocsip, Linphone)
- [ ] Список User-Agent'ов расширяемый

## Context Manifest
<!-- Added by context-gathering agent -->

## Work Log
- [2026-03-20] Task created
