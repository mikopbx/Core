# Инструкция по применению docs-черновиков

> Все четыре новых документа и точечные правки 8 существующих страниц
> рассчитаны на ветки `russian` и `english` репозитория
> `docs.mikopbx.com`. По договорённости в задаче (см. README.md User Notes)
> работаем без worktree, обычными `git checkout`.

## 0. Перед стартом

```bash
cd /Volumes/DevDisk/Developement/docs.mikopbx.com
git fetch origin
git status   # должно быть clean
```

Если есть локальные изменения — застэшируйте.

---

## 1. Русская ветка

```bash
git -C /Volumes/DevDisk/Developement/docs.mikopbx.com checkout russian
git -C /Volumes/DevDisk/Developement/docs.mikopbx.com pull --ff-only
```

### 1.1. Скопируйте 2 новых файла

```bash
DRAFTS=/Volumes/DevDisk/Developement/mikopbx/Core/sessions/tasks/h-implement-firewall-bouncer-api/docs-drafts
DOCS=/Volumes/DevDisk/Developement/docs.mikopbx.com

mkdir -p "$DOCS/setup/docker"
cp "$DRAFTS/ru/setup/docker/external-firewall-enforcement.md" \
   "$DOCS/setup/docker/external-firewall-enforcement.md"

mkdir -p "$DOCS/manual/system/api-keys"
cp "$DRAFTS/ru/manual/system/api-keys/firewall-export.md" \
   "$DOCS/manual/system/api-keys/firewall-export.md"
```

### 1.2. Внесите 8 правок в существующие страницы

Каждая правка — короткая вставка. Места указаны опорными строками.

#### a) `SUMMARY.md` — добавить ссылки на новые страницы

Найдите строку (около №47):

```
  * [Запуск MikoPBX с помощью docker compose](setup/docker/running-mikopbx-using-docker-compose.md)
```

**Вставьте ПОСЛЕ неё:**

```
  * [Внешний файрвол для Docker](setup/docker/external-firewall-enforcement.md)
```

Найдите строку (около №98):

```
    * [Интерактивная документация и список эндпоинтов](manual/system/api-keys/endpoints.md)
```

**Вставьте ПОСЛЕ неё:**

```
    * [Эндпоинт firewall-export](manual/system/api-keys/firewall-export.md)
```

#### b) `readme/security.md` — раздел про Docker

В разделе чек-листа (после описания критической уязвимости) добавьте
пункт:

```markdown
* **Docker-развёртывание**: при использовании bridge-режима внутренние
  правила файрвола и fail2ban не защищают веб-интерфейс. Настройте
  [внешний firewall-bouncer](../setup/docker/external-firewall-enforcement.md)
  или переключите контейнер в `network_mode: host`.
```

#### c) `manual/connectivity/firewall.md` — секция в конце

В самом низу файла добавьте:

```markdown
## Поведение в Docker-контейнере

В Docker (bridge-режим) внутренние правила файрвола MikoPBX и fail2ban
**не защищают веб-интерфейс**: контейнер не управляет iptables хоста, а
HTTP-клиенты приходят со шлюза `docker0`. SIP-защита продолжает работать
(UDP-DNAT сохраняет source IP).

Для защиты веб-интерфейса в Docker используйте один из двух подходов:

* `network_mode: host` для контейнера (если хост выделен под АТС);
* Внешний bouncer (CrowdSec-совместимый) поверх API MikoPBX —
  подробнее в разделе
  [Внешний файрвол для Docker](../../setup/docker/external-firewall-enforcement.md).
```

#### d) `manual/connectivity/fail2-ban.md` — note о bouncer

После основного описания добавьте:

```markdown
{% hint style="info" %}
**В Docker (bridge)** fail2ban пишет блокировки в Redis, но контейнер не
управляет iptables хоста — для веб-интерфейса блокировки не применяются
автоматически. Чтобы перенести их на host, поднимите внешний bouncer
(см. [Внешний файрвол для Docker](../../setup/docker/external-firewall-enforcement.md)).
SIP-защита при этом работает обычным способом.
{% endhint %}
```

#### e) `setup/docker/README.md` — добавить cross-link

Перед закрывающим `</tbody></table>` основной таблицы вариантов
добавьте ещё один `<tr>`:

```html
<tr><td><strong>Внешний файрвол для Docker</strong></td><td>Как защитить веб-интерфейс при `userland-proxy=true`: внешний bouncer или host-режим.</td><td></td><td><a href="external-firewall-enforcement.md">external-firewall-enforcement.md</a></td></tr>
```

#### f) `setup/docker/running-mikopbx-using-docker-compose.md` — внизу страницы

```markdown
{% hint style="warning" %}
В bridge-режиме (по умолчанию) внутренний файрвол MikoPBX не защищает
веб-интерфейс — контейнер не управляет iptables хоста. См.
[Внешний файрвол для Docker](external-firewall-enforcement.md).
{% endhint %}
```

#### g) `faq/setup/fine-tuning-the-firewall.md` — hint в начале

Сразу после `# Тонкая настройка firewall` (перед «При публикации АТС…»):

```markdown
{% hint style="warning" %}
Эта страница применима к bare-metal и LXC. Для Docker-инсталляций см.
[Внешний файрвол для Docker](../../setup/docker/external-firewall-enforcement.md).
{% endhint %}
```

#### h) `manual/system/api-keys/endpoints.md` — добавить ссылку

В разделе технических эндпоинтов добавьте строку:

```markdown
* [Эндпоинт firewall-export](firewall-export.md) — экспорт решений о
  блокировке для внешних bouncer'ов (CrowdSec-совместимый формат).
  Доступен с **MikoPBX 2026.1.76**.
```

### 1.3. Скриншоты (3 шт., в `.gitbook/assets/`)

Сделать вручную в развёрнутой АТС или через `browser-harness` после
накатывания фронтенд-изменений из основной ветки. Имена:

* `firewall-bouncer-banner.png` — баннер на странице **Файрвол** в
  Docker bridge.
* `bouncer-token-preset.png` — модалка с пресет-токеном после
  сохранения.
* `check-ip-visibility-result.png` — кнопка «Проверить видимость моего
  IP» с раскрытым результатом.

Положите файлы в `.gitbook/assets/` и вставьте `<figure>` в
`external-firewall-enforcement.md` на соответствующих местах.

### 1.4. Закоммитьте

```bash
git -C /Volumes/DevDisk/Developement/docs.mikopbx.com add -A
git -C /Volumes/DevDisk/Developement/docs.mikopbx.com commit -m "docs(ru): add external firewall enforcement guide for Docker bridge

- New: setup/docker/external-firewall-enforcement.md (main guide)
- New: manual/system/api-keys/firewall-export.md (technical reference)
- Updates: SUMMARY, security checklist, firewall, fail2-ban, Docker
  setup pages with cross-links + behavior notes
- Available starting from MikoPBX 2026.1.76

Refs: mikopbx/Core feature/firewall-bouncer-api"
```

---

## 2. Английская ветка

```bash
git -C /Volumes/DevDisk/Developement/docs.mikopbx.com checkout english
git -C /Volumes/DevDisk/Developement/docs.mikopbx.com pull --ff-only
```

### 2.1. Скопируйте 2 новых файла

```bash
DRAFTS=/Volumes/DevDisk/Developement/mikopbx/Core/sessions/tasks/h-implement-firewall-bouncer-api/docs-drafts
DOCS=/Volumes/DevDisk/Developement/docs.mikopbx.com

mkdir -p "$DOCS/setup/docker"
cp "$DRAFTS/en/setup/docker/external-firewall-enforcement.md" \
   "$DOCS/setup/docker/external-firewall-enforcement.md"

mkdir -p "$DOCS/manual/system/api-keys"
cp "$DRAFTS/en/manual/system/api-keys/firewall-export.md" \
   "$DOCS/manual/system/api-keys/firewall-export.md"
```

### 2.2. 8 правок (английские эквиваленты)

Точки вставки те же, что и в русской ветке. Текст вставок:

#### a) `SUMMARY.md`

После строки про docker-compose:

```
  * [External firewall for Docker](setup/docker/external-firewall-enforcement.md)
```

После строки про "Endpoint list" в разделе ApiKeys:

```
    * [The firewall-export endpoint](manual/system/api-keys/firewall-export.md)
```

#### b) `readme/security.md` (английский чек-лист)

```markdown
* **Docker deployment**: in bridge mode the built-in firewall and
  fail2ban do not protect the web interface. Set up an
  [external firewall bouncer](../setup/docker/external-firewall-enforcement.md)
  or switch the container to `network_mode: host`.
```

#### c) `manual/connectivity/firewall.md`

В конце:

```markdown
## Behaviour in Docker containers

In Docker bridge mode the MikoPBX built-in firewall and fail2ban **do
not protect the web interface**: the container cannot manage host
iptables, and HTTP clients arrive from the `docker0` gateway. SIP
protection continues to work (UDP DNAT preserves the source IP).

To protect the web interface in Docker, choose one of:

* `network_mode: host` for the container (when the host is dedicated
  to the PBX);
* An external CrowdSec-compatible bouncer in front of the MikoPBX API —
  see
  [External firewall for Docker](../../setup/docker/external-firewall-enforcement.md).
```

#### d) `manual/connectivity/fail2-ban.md`

```markdown
{% hint style="info" %}
**In Docker (bridge mode)** fail2ban writes bans to Redis but the
container cannot manage host iptables — web-interface bans are not
applied automatically. To project them to the host, run an external
bouncer (see
[External firewall for Docker](../../setup/docker/external-firewall-enforcement.md)).
SIP protection works normally.
{% endhint %}
```

#### e) `setup/docker/README.md`

Добавить `<tr>` в таблицу:

```html
<tr><td><strong>External firewall for Docker</strong></td><td>How to protect the web interface when `userland-proxy=true`: an external bouncer or host networking.</td><td></td><td><a href="external-firewall-enforcement.md">external-firewall-enforcement.md</a></td></tr>
```

#### f) `setup/docker/running-mikopbx-using-docker-compose.md`

```markdown
{% hint style="warning" %}
In the default bridge mode the built-in MikoPBX firewall does not
protect the web interface — the container cannot manage host iptables.
See [External firewall for Docker](external-firewall-enforcement.md).
{% endhint %}
```

#### g) `faq/setup/fine-tuning-the-firewall.md`

```markdown
{% hint style="warning" %}
This page applies to bare-metal and LXC installations. For Docker
deployments see
[External firewall for Docker](../../setup/docker/external-firewall-enforcement.md).
{% endhint %}
```

#### h) `manual/system/api-keys/endpoints.md`

```markdown
* [The firewall-export endpoint](firewall-export.md) — exports ban
  decisions for external bouncers (CrowdSec-compatible). Available
  starting from **MikoPBX 2026.1.76**.
```

### 2.3. Скриншоты — те же 3 файла, что и в RU (без перевода, общие).

### 2.4. Закоммитьте

```bash
git -C /Volumes/DevDisk/Developement/docs.mikopbx.com add -A
git -C /Volumes/DevDisk/Developement/docs.mikopbx.com commit -m "docs(en): add external firewall enforcement guide for Docker bridge

- New: setup/docker/external-firewall-enforcement.md (main guide)
- New: manual/system/api-keys/firewall-export.md (technical reference)
- Updates: SUMMARY, security checklist, firewall, fail2-ban, Docker
  setup pages with cross-links + behavior notes
- Available starting from MikoPBX 2026.1.76

Refs: mikopbx/Core feature/firewall-bouncer-api"
```

---

## 3. Пуш веток и PR

```bash
git -C /Volumes/DevDisk/Developement/docs.mikopbx.com push origin russian
git -C /Volumes/DevDisk/Developement/docs.mikopbx.com push origin english
```

PR создаются по одному на каждую ветку — сошлитесь в описании на
основной PR в `mikopbx/Core` (`feature/firewall-bouncer-api`).
