---
name: h-implement-sip-scanner-useragent-filter
branch: feature/sip-scanner-filter
status: pending
created: 2026-03-20
---

# SIP scanner User-Agent filter via iptables string matching

## Problem/Goal
SIP-сканеры (sipvicious, friendly-scanner и др.) используют характерные User-Agent строки. Дропаем их пакеты на уровне iptables ДО Asterisk — без нагрузки на PBX, логи и fail2ban.

## Architecture

### Конфиг-файл с User-Agent'ами
Список сканеров хранится в файле, по одному User-Agent на строку.
Файл записывается через `Util::fileWriteContent()` — это позволяет пользователю
редактировать его через "Кастомизация системных файлов" в web-интерфейсе.

```php
$directory = '/etc/asterisk';  // или подходящая директория
$filename = 'sip_scanner_useragents.conf';
Util::fileWriteContent($directory . '/' . $filename, $config);
```

Формат файла:
```
# Known SIP scanner User-Agents (one per line)
# Lines starting with # are comments
friendly-scanner
sipvicious
sipcli
sip-scan
sipsak
sundayddr
iWar
VaxSIPUserAgent
pplsip
scanSIP
siparmyknife
Gulp
Nmap
CensysInspect
sip-redirector
```

### Генерация iptables правил
`IptablesConf::applyConfig()` читает файл, для каждой строки генерирует правила:

```php
$agents = file($configPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach ($agents as $agent) {
    $agent = trim($agent);
    if ($agent === '' || str_starts_with($agent, '#')) continue;
    foreach (['udp', 'tcp'] as $protocol) {
        foreach ([$this->sipPort, $this->tlsPort] as $port) {
            $rule = "-p $protocol --dport $port"
                  . " -m string --string " . escapeshellarg($agent) . " --algo bm --to 65535";
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
5. Module hooks (GeoIP DROP)
6. ACCEPT catch-all services
7. DROP default

## Default Scanner List (15 User-Agents)

| User-Agent | Инструмент | Распространённость |
|-----------|-----------|-------------------|
| friendly-scanner | SIPVicious (старые) | Очень высокая |
| sipvicious | SIPVicious (новые) | Очень высокая |
| sipcli | SIPcli | Высокая |
| sip-scan | Generic scanner | Высокая |
| sipsak | SIP Swiss Army Knife | Высокая |
| pplsip | PPL SIP scanner | Высокая |
| Nmap | Nmap SIP scripts | Высокая |
| CensysInspect | Censys scanner | Высокая |
| sundayddr | SundayDDR | Средняя |
| iWar | iWar wardialer | Средняя |
| VaxSIPUserAgent | Vax SIP | Средняя |
| scanSIP | ScanSIP | Средняя |
| siparmyknife | SIP Army Knife | Средняя |
| Gulp | SIP tool | Средняя |
| sip-redirector | Redirect scanner | Низкая |

## WebRTC Limitation
WebRTC использует SIP over WebSocket (порт 8089 TLS). Iptables `string match` не видит
содержимое WebSocket фреймов (зашифровано TLS). Фильтрация WebRTC User-Agent возможна
только на уровне Asterisk/PJSIP — отдельная задача.

## Key Files
- `src/Core/System/Configs/IptablesConf.php` — генерация правил
- Новый конфиг: `/etc/asterisk/sip_scanner_useragents.conf`

## Success Criteria
- [ ] Файл конфигурации с User-Agent'ами записывается через Util::fileWriteContent
- [ ] Пользователь может редактировать список через "Кастомизация системных файлов"
- [ ] Пакеты с User-Agent из списка дропаются на iptables (UDP+TCP, SIP+TLS порты)
- [ ] Правила добавляются при каждом firewall reload
- [ ] Легитимные SIP-клиенты не блокируются
- [ ] Комментарии (#) и пустые строки в конфиге игнорируются

## Context Manifest
<!-- Added by context-gathering agent -->

## Work Log
- [2026-03-20] Task created
