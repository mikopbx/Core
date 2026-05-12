# Внешний файрвол для Docker-развёртываний

> ℹ️ Возможность доступна начиная с версии **MikoPBX 2026.1.76**. На более
> ранних версиях LAPI-эндпоинт `firewall-bouncer`, баннер на странице
> файрвола и кнопка «Токен для bouncer» отсутствуют.

## Проблема

В Docker-режиме MikoPBX внутренние правила файрвола и fail2ban **не защищают
веб-интерфейс**:

* Контейнер не управляет iptables хоста.
* При `userland-proxy=true` (поведение Docker по умолчанию) контейнер видит
  HTTP-клиента как `docker0`-шлюз (например `172.17.0.1`), а не как реальный
  IP атакующего. ACL уровня Nginx и fail2ban-jail для веб-формы блокируют
  только этот шлюз — то есть никого.

SIP-защита при этом работает: UDP-DNAT сохраняет source IP, Asterisk видит
реальный адрес, fail2ban пишет блокировку в Redis и `module reload acl`
отбивает дальнейшие REGISTER. Сломан именно HTTP-сегмент.

Решение — экспортировать решения о блокировке наружу и применять их в
**настоящем** файрволе хоста (или edge-CDN, или security-group облака) при
помощи внешнего обработчика правил.

## Шаг 1. Проверьте, ваш ли это случай

На странице **Безопасность → Доступ к веб-интерфейсу** есть жёлтый баннер
«Docker bridge: требуется внешний обработчик правил». Если он показан —
этот документ для вас. Кнопка **Проверить видимость моего IP** запросит
эндпоинт `system:checkClientIpVisibility` и покажет три значения:

* `ip_visible` — реальный IP клиента виден, ничего не требуется.
* `ip_not_visible` — IP клиента подменён на шлюз Docker bridge: правила
  HTTP-файрвола работать не будут.
* `proxy_detected` — перед АТС стоит reverse-proxy, и АТС намеренно не
  доверяет proxy-заголовкам. Настройте прокси на отображение реального IP
  или разверните внешний bouncer.

## Шаг 2. Выберите подход

### Вариант A — `network_mode: host` (минимум усилий)

Если хост — выделенный сервер для АТС и нет конфликтов портов, переключите
контейнер в host-режим:

```yaml
services:
  mikopbx:
    image: mikopbx/mikopbx:latest
    network_mode: host
    # удалите все `ports:`
```

В этом режиме контейнер использует сетевой namespace хоста, Asterisk и Nginx
видят реальные source-IP, а внутренний файрвол работает «как на bare metal».
Подходит лучше всего для SIP-нагруженных инсталляций.

Ограничения: один host-режим на хост, нельзя поднять рядом несколько копий
АТС, конфликты с другими процессами на стандартных портах.

### Вариант B — `cs-firewall-bouncer` apt-пакетом на хосте

Контейнер MikoPBX остаётся в bridge-режиме. На Linux-хосте ставится
`cs-firewall-bouncer` (open-source, проект CrowdSec), который **поллит**
эндпоинт MikoPBX каждые 10 секунд и переносит решения в iptables/nftables
хоста.

Это рекомендуемый вариант для большинства инсталляций.

#### 1. Создайте API-токен

1. Откройте **Система → API-ключи**.
2. Нажмите кнопку **Токен для bouncer** (предзаполняет правильное
   ограничение пути).
3. Сохраните. Откроется модальное окно с готовой конфигурацией
   `cs-firewall-bouncer.yaml` — **скопируйте её сразу**, API-ключ
   показывается только один раз.

Полученный токен ограничен путём `/api/v3/firewall-bouncer` и не имеет
доступа к остальному API. Опционально привяжите токен к NetworkFilter,
чтобы дополнительно ограничить source-IP, с которого bouncer обращается
к АТС.

#### 2. Установите bouncer на хосте

```bash
# Debian / Ubuntu
curl -s https://install.crowdsec.net | sudo sh
sudo apt-get install -y crowdsec-firewall-bouncer-iptables
```

#### 3. Настройте

Откройте `/etc/crowdsec/bouncers/cs-firewall-bouncer.yaml` и замените
`api_url` / `api_key` на значения из шага 1:

```yaml
api_url: http://<MIKOPBX-HOST>/pbxcore/api/v3/firewall-bouncer/
api_key: <token-from-modal>
update_frequency: 10s
mode: iptables
log_mode: stdout
log_level: info

# КРИТИЧНО для Docker-развёртываний: правило ОБЯЗАНО быть в цепочке
# DOCKER-USER, иначе трафик, который Docker пробрасывает в контейнер,
# обходит INPUT/FORWARD полностью, и бан в iptables есть, а атакующий
# проходит как ни в чём не бывало.
iptables_chains:
  - INPUT
  - FORWARD
  - DOCKER-USER

# Отключите IPv6, если Docker без IPv6-bridge'а. На хостах без Docker
# IPv6 в ip6tables нет цепочки DOCKER-USER, и bouncer падает с
# fatal-ошибкой при запуске.
disable_ipv6: true
```

> 📌 `api_url` — это **базовый URL**. cs-firewall-bouncer сам дописывает
> `/v1/decisions/stream` и отправляет токен в заголовке `X-Api-Key`.
> Не указывайте полный путь к `decisions/stream` в `api_url` и не
> добавляйте префикс `Bearer ` к ключу — bouncer всё делает сам.

> ⚠️ Если ваш MikoPBX слушает HTTPS с self-signed сертификатом, добавьте
> `insecure_skip_verify: true` или установите CA-сертификат на хост.

> 🚨 `iptables_chains: [INPUT, FORWARD, DOCKER-USER]` — это **не**
> дефолт CrowdSec (по умолчанию там только `INPUT`). Без `DOCKER-USER`
> трафик, который Docker маршрутизирует в контейнер, идёт через
> цепочку `DOCKER` и не доходит до DROP-правила bouncer'а — бан виден
> в iptables, но в реальности не работает. Это самая частая ловушка
> при подключении CrowdSec к Docker-развёрнутой АТС.

```bash
sudo systemctl restart crowdsec-firewall-bouncer.service
sudo systemctl status crowdsec-firewall-bouncer.service
```

#### 4. Проверьте

* В логах bouncer должно появиться `received N new decisions, 0 deleted`.
* `sudo iptables -L CROWDSEC -n` (или `crowdsec-firewall-bouncer-iptables-v6`
  для IPv6) покажет добавленные блокировки.
* Заблокируйте тестовый IP вручную через раздел **Файрвол → Сети** или
  спровоцируйте fail2ban-блокировку и убедитесь, что строка появилась в
  iptables хоста в течение 30 секунд.

## Замечания по production-развёртыванию

### Защита SSH (и других админ-портов) от bouncer'а

Bouncer'ы CrowdSec блокируют **на уровне IP, а не протокола** — одна
запись в ipset дропает все TCP- и UDP-пакеты с забаненного адреса. В
том числе порт 22. Если IP оператора по ошибке попадёт в бан-лист
(скажем, fail2ban зафиксировал три неудачных `auth:login` с NAT-IP
офиса), то SSH тоже отрежется, и админ запрётся снаружи хоста.

Вставьте высокоприоритетный ACCEPT для админ-порта **до** DROP-правила
bouncer'а, чтобы административный доступ оставался жив даже если IP
самого оператора попадёт в бан:

```bash
# Always-accept SSH (port 22) — переживает любые изменения bouncer'а
sudo iptables -I INPUT 1 -p tcp --dport 22 -j ACCEPT \
  -m comment --comment "admin-protect"

# Сохранить между ребутами (Debian / Ubuntu)
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

Повторите для любых других портов, через которые вы администрируете
машину (Wireguard, serial-консоль провайдера и т.д.) — для всего, что
**не должно** падать под bouncer'а.

### Опционально: safety-net на systemd-timer

Для инсталляций, где потеря доступа к хосту дорого стоит, добавьте
systemd-timer, периодически чистящий ipset bouncer'а. Bouncer
перезальёт текущие баны на следующем poll'е, так что это безопасный
safety-net с ограниченным blast radius, а не отключение функции:

```ini
# /etc/systemd/system/crowdsec-safety-flush.service
[Unit]
Description=Safety net - flush crowdsec ipset to prevent lockout
After=crowdsec-firewall-bouncer.service

[Service]
Type=oneshot
ExecStart=/usr/sbin/ipset flush crowdsec-blacklists
```

```ini
# /etc/systemd/system/crowdsec-safety-flush.timer
[Unit]
Description=Run crowdsec ipset flush every 30 minutes

[Timer]
OnBootSec=30min
OnUnitActiveSec=30min
Unit=crowdsec-safety-flush.service

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now crowdsec-safety-flush.timer
```

30 минут — разумный дефолт: короче, чем время остывания кофе
оператора, если он случайно себя забанит, и длинее, чем нужно
реальной атаке, чтобы заметно ущербнуть.

### Bouncer-баны покрывают все протоколы — by design

CrowdSec мапит решения в один ipset на IP-семейство. Правила iptables
дропают **весь** трафик с перечисленных IP, независимо от протокола
и порта. Бан `mikopbx/http` (HTTP-брутфорс) автоматически отрезает
тому же IP и SIP / IAX / AMI / SSH — и наоборот: бан `mikopbx/sip`
(fail2ban-jail Asterisk) тоже дропнет HTTP и AMI от того же IP.
MikoPBX отдаёт в bouncer-стрим **все четыре категории** банов (`sip`,
`http`, `ami`, `iax`) одинаково, так что после подключения bouncer'а
любая блокировка становится IP-wide.

Для большинства инсталляций это правильное поведение — если IP
агрессивен к HTTP, в SIP его пускать тоже незачем, и наоборот. Но
если нужно **по-протокольное** разделение (например, блокировать
HTTP-брутфорсеров, не трогая их SIP), bouncer для этой АТС поднимать
**не нужно**. Существующий путь защиты SIP внутри Docker'а
(`fail2ban` → Redis → pjsip ACL внутри Asterisk) изолирует SIP-баны
именно потому, что они не уходят в host ipset — а bouncer ровно это
поведение и меняет.

## Формат ответа эндпоинта

`GET /pbxcore/api/v3/firewall-bouncer/v1/decisions/stream` возвращает
снимок текущих решений в виде, который ожидает стоковый
cs-firewall-bouncer — `{new, deleted}` на верхнем уровне, без обёртки
MikoPBX:

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
    }
  ],
  "deleted": []
}
```

Массив `new[]` всегда содержит полный снимок текущих банов — bouncer
обновляет таймауты своих ipset/nftables-записей до значения `duration`
на каждом poll'е, поэтому активный бан живёт ровно столько, сколько
указал источник. Массив `deleted[]` считается per-token (MikoPBX хранит
прошлый снимок по id'у ApiKey) и содержит решения, которые исчезли с
предыдущего опроса. Снятие бана оператором доходит до ipset bouncer'а
за один poll-цикл (≈ 5–10 секунд), а не ждёт естественного истечения
TTL.

`?startup=true` на первом poll'е после рестарта bouncer'а сбрасывает
per-token cursor и возвращает `deleted: []` — свежезапущенный bouncer
не получит фантомных удалений для состояния, которое он никогда не
отслеживал.

Оба варианта заголовков аутентифицируют один и тот же токен:

```bash
# Стоковый cs-firewall-bouncer (соглашение CrowdSec):
curl -H "X-Api-Key: <token>" \
     "http://<MIKOPBX-HOST>/pbxcore/api/v3/firewall-bouncer/v1/decisions/stream?startup=true"

# Эквивалент для ручных проб curl/Postman/Insomnia:
curl -H "Authorization: Bearer <token>" \
     "http://<MIKOPBX-HOST>/pbxcore/api/v3/firewall-bouncer/v1/decisions/stream"
```

### Сосуществующий эндпоинт whitelist (кастомный)

`GET /pbxcore/api/v3/firewall-bouncer/v1/whitelist` возвращает whitelist
оператора как плоский JSON-массив:

```json
["10.0.0.0/8", "192.168.1.0/24"]
```

Этот эндпоинт — **специфика MikoPBX**. Стоковый cs-firewall-bouncer его
не опрашивает (в CrowdSec LAPI нет типа решения «allow», bouncer ведёт
собственный `whitelists.yaml`). Предоставлен для MikoPBX-aware
интеграций, которым нужна согласованность whitelist с NetworkFilters
АТС на стороне сервера.

## Технические подробности

Детальный формат, query-параметры и сопоставление категорий MikoPBX
с полями CrowdSec описаны в разделе
[Эндпоинт firewall-export](../../manual/system/api-keys/firewall-export.md).
