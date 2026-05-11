# LAPI-эндпоинт firewall-bouncer

> ℹ️ Эндпоинт доступен начиная с версии **MikoPBX 2026.1.76**.

Техническая страница для разработчиков своих bouncer'ов и для интеграций
с edge-провайдерами (Cloudflare, AWS WAF, кастомные nftables-генераторы).

## Базовая информация

* **Базовый URL:** `https://<MIKOPBX-HOST>/pbxcore/api/v3/firewall-bouncer/`
* **Эндпоинты:**
  * `GET /v1/decisions/stream` — полный snapshot решений в формате
    CrowdSec LAPI. Стоковый `cs-firewall-bouncer` дописывает этот путь
    к `api_url` сам.
  * `GET /v1/whitelist` — allow-list оператора как плоский JSON-массив
    (расширение MikoPBX, см. [Whitelist](#whitelist)).
* **Аутентификация:** bouncer-токен принимается в двух заголовках:
  * `X-Api-Key: <token>` — соглашение CrowdSec, шлёт стоковый
    `cs-firewall-bouncer`.
  * `Authorization: Bearer <token>` — удобен для `curl`, Postman и
    кастомных HTTP-клиентов. Оба варианта валидируют одну и ту же строку
    в `ApiKeys`, path-restriction и ACL действуют одинаково.
* **Permission scope:** `firewall_bouncer`. Создавайте токен с
  `allowed_paths: {"/api/v3/firewall-bouncer": "read"}` — пресет в UI
  ApiKeys уже делает это правильно.
* **Совместимость:** тело ответа `decisions/stream` повторяет shape
  CrowdSec LAPI один-в-один — `{new, deleted}` на верхнем уровне, без
  обёртки. Существующие CrowdSec bouncer'ы (`cs-firewall-bouncer`,
  `cs-cloudflare-bouncer`, `cs-nginx-bouncer` и десятки community-плагинов)
  работают «из коробки».

## Decisions stream

`GET /pbxcore/api/v3/firewall-bouncer/v1/decisions/stream`

```json
{
  "new": [
    {
      "id": 12345,
      "origin": "mikopbx-fail2ban",
      "type": "ban",
      "scope": "Ip",
      "value": "203.0.113.7",
      "duration": "3600s",
      "scenario": "mikopbx/sip"
    },
    {
      "id": 678901,
      "origin": "mikopbx-networkfilters",
      "type": "ban",
      "scope": "Range",
      "value": "198.51.100.0/24",
      "duration": "8760h",
      "scenario": "mikopbx/manual"
    }
  ],
  "deleted": []
}
```

### Поля решения

| Поле       | Тип    | Описание                                                                                |
| ---------- | ------ | --------------------------------------------------------------------------------------- |
| `id`       | int    | Стабильный положительный 32-битный ID — `crc32(value + scenario) & 0x7fffffff`.         |
| `origin`   | string | `mikopbx-fail2ban` (Redis) или `mikopbx-networkfilters` (БД оператора).                 |
| `type`     | string | Всегда `"ban"`.                                                                         |
| `scope`    | string | `"Ip"` для одиночного адреса или `"Range"` для CIDR.                                    |
| `value`    | string | IP-адрес или CIDR.                                                                      |
| `duration` | string | Оставшееся время до истечения, например `"3600s"` или `"8760h"`.                        |
| `scenario` | string | `mikopbx/sip`, `mikopbx/http`, `mikopbx/ami`, `mikopbx/iax`, `mikopbx/manual`.          |

### Сопоставление с CrowdSec

| MikoPBX                  | CrowdSec            | Источник                          |
| ------------------------ | ------------------- | --------------------------------- |
| `mikopbx-fail2ban`       | aggregated origin   | Redis-ключи `firewall:<cat>:<ip>` |
| `mikopbx-networkfilters` | aggregated origin   | Таблица `m_NetworkFilters.deny`   |
| `mikopbx/sip`            | scenario tag        | Категория `sip` в Redis           |
| `mikopbx/http`           | scenario tag        | Категория `http` в Redis          |
| `mikopbx/ami`            | scenario tag        | Категория `ami` в Redis           |
| `mikopbx/iax`            | scenario tag        | Категория `iax` в Redis           |
| `mikopbx/manual`         | scenario tag        | Записи оператора в UI «Файрвол»   |

## Поведение MVP

* На каждый poll возвращается **полный** snapshot текущих блокировок в
  массиве `new`. Массив `deleted` всегда пуст.
* Это валидный режим CrowdSec LAPI — bouncer применяет решения
  идемпотентно. Не оптимизация, но самый простой в реализации и проверке.
* `update_frequency: 10s` — рекомендованная частота опроса.

Query-параметры `startup`, `scopes`, `origins`, которые посылает
`cs-firewall-bouncer`, в MVP принимаются, но игнорируются: всегда
возвращается полный снимок. Это работает для всех существующих
CrowdSec bouncer'ов.

## Примеры

### curl

```bash
# API-ключ bouncer-а читайте из переменной окружения / менеджера
# секретов на хосте, где выполняется команда — никогда не вставляйте
# ключ открытым текстом в скрипты, которые попадают в git.
TOKEN=$BOUNCER_API_KEY

# Стиль CrowdSec:
curl -H "X-Api-Key: $TOKEN" \
  "https://pbx.example.com/pbxcore/api/v3/firewall-bouncer/v1/decisions/stream?startup=true" \
  | jq

# Стиль Bearer (эквивалентен):
curl -H "Authorization: Bearer $TOKEN" \
  "https://pbx.example.com/pbxcore/api/v3/firewall-bouncer/v1/decisions/stream" \
  | jq
```

### Минимальный кастомный bouncer (Python)

```python
import requests, time

BASE = "https://pbx.example.com/pbxcore/api/v3/firewall-bouncer"
HEADERS = {"X-Api-Key": TOKEN}

# Локальный whitelist bouncer'а (обновляется реже, чем решения).
whitelist = set(requests.get(f"{BASE}/v1/whitelist", headers=HEADERS).json())

while True:
    resp = requests.get(f"{BASE}/v1/decisions/stream", headers=HEADERS).json()
    bans = {d["value"] for d in resp["new"]}
    apply_iptables(bans - whitelist)
    time.sleep(10)
```

Обратите внимание: JSON-тело — это LAPI shape на верхнем уровне, без
обёртки `{result, data, ...}` вокруг `new`/`deleted`.

## Whitelist

`GET /pbxcore/api/v3/firewall-bouncer/v1/whitelist` возвращает
allow-list оператора как плоский JSON-массив:

```json
["10.0.0.0/8", "192.168.1.0/24"]
```

Источники, объединённые в ответ:

* `NetworkFilters` с признаком `newer_block_ip = '1'`,
* `Fail2BanRules.whitelist`.

Эндпоинт — **специфика MikoPBX**. Стоковый `cs-firewall-bouncer` его не
опрашивает: в CrowdSec LAPI нет типа решения «allow», bouncer ведёт
собственный `whitelists.yaml`. Предоставлен для MikoPBX-aware интеграций,
которым нужна согласованность whitelist на стороне сервера.

MikoPBX дополнительно проверяет whitelist на write-side (в
`DockerNetworkFilterService::isIpWhitelisted`), но это защита в глубину —
ваш bouncer всё равно должен вычитать whitelist из `new` перед
применением блокировок.

## Безопасность

* Эндпоинт whitelist отдаёт **операторские allow-list сети**. Никогда
  не выставляйте его без аутентификации.
* Bouncer-токен оптимально привязывать к NetworkFilter, разрешающему
  только IP хоста bouncer'а. При несовпадении источника API вернёт 403.
* После compromise — отзовите токен через UI ApiKeys; bouncer перестанет
  получать новые решения и через 30 секунд начнут истекать его
  локальные блокировки (если такой режим включён).
