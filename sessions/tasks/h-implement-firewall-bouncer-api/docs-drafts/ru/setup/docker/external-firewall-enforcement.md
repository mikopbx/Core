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
```

> 📌 `api_url` — это **базовый URL**. cs-firewall-bouncer сам дописывает
> `/v1/decisions/stream` и отправляет токен в заголовке `X-Api-Key`.
> Не указывайте полный путь к `decisions/stream` в `api_url` и не
> добавляйте префикс `Bearer ` к ключу — bouncer всё делает сам.

> ⚠️ Если ваш MikoPBX слушает HTTPS с self-signed сертификатом, добавьте
> `insecure_skip_verify: true` или установите CA-сертификат на хост.

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

В MVP-варианте на каждый poll возвращается **полный** список текущих
блокировок в массиве `new`, а массив `deleted` пуст. Bouncer применяет
решения идемпотентно — повторная отправка одного и того же IP не вызывает
ошибки.

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
