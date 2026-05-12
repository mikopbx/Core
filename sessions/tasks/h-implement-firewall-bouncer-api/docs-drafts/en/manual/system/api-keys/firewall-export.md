# The firewall-bouncer LAPI endpoint

> ℹ️ Available starting from **MikoPBX 2026.1.76**.

Technical reference for developers writing their own bouncers and for
integrating MikoPBX with edge providers (Cloudflare, AWS WAF, custom
nftables generators).

## Basics

* **Base URL:** `https://<MIKOPBX-HOST>/pbxcore/api/v3/firewall-bouncer/`
* **Endpoints:**
  * `GET /v1/decisions/stream` — full decision snapshot in CrowdSec LAPI
    format. Stock `cs-firewall-bouncer` polls this path automatically by
    appending it to `api_url`.
  * `GET /v1/whitelist` — operator allow-list as a flat JSON array
    (MikoPBX extension, see [Whitelist](#whitelist)).
* **Auth:** the bouncer token can be sent in either header:
  * `X-Api-Key: <token>` — what stock `cs-firewall-bouncer` sends.
  * `Authorization: Bearer <token>` — convenient for `curl`, Postman,
    or custom HTTP clients. Both forms validate the same `ApiKeys` row,
    so path restrictions and ACLs apply identically.
* **Permission scope:** `firewall_bouncer`. Issue tokens with
  `allowed_paths: {"/api/v3/firewall-bouncer": "read"}` — the UI preset
  in the ApiKeys section does this for you.
* **Compatibility:** the `decisions/stream` response shape matches the
  CrowdSec LAPI exactly (`{new, deleted}` at the top level, no envelope).
  Existing CrowdSec bouncers (`cs-firewall-bouncer`,
  `cs-cloudflare-bouncer`, `cs-nginx-bouncer`, and dozens of community
  plugins) work out of the box.

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

### Decision fields

| Field      | Type   | Description                                                                       |
| ---------- | ------ | --------------------------------------------------------------------------------- |
| `id`       | int    | Stable positive 32-bit integer — `crc32(value + scenario) & 0x7fffffff`.          |
| `origin`   | string | `mikopbx-fail2ban` (Redis) or `mikopbx-networkfilters` (operator DB).             |
| `type`     | string | Always `"ban"`.                                                                   |
| `scope`    | string | `"Ip"` for a single address or `"Range"` for a CIDR.                              |
| `value`    | string | IP address or CIDR.                                                               |
| `duration` | string | Remaining time until expiry, e.g. `"3600s"` or `"8760h"`.                         |
| `scenario` | string | `mikopbx/sip`, `mikopbx/http`, `mikopbx/ami`, `mikopbx/iax`, or `mikopbx/manual`. |

### Mapping to CrowdSec

| MikoPBX                    | CrowdSec            | Source                                  |
| -------------------------- | ------------------- | --------------------------------------- |
| `mikopbx-fail2ban`         | aggregated origin   | Redis keys `firewall:<cat>:<ip>`        |
| `mikopbx-networkfilters`   | aggregated origin   | `m_NetworkFilters.deny` table           |
| `mikopbx/sip`              | scenario tag        | Redis `sip` category                    |
| `mikopbx/http`             | scenario tag        | Redis `http` category                   |
| `mikopbx/ami`              | scenario tag        | Redis `ami` category                    |
| `mikopbx/iax`              | scenario tag        | Redis `iax` category                    |
| `mikopbx/manual`           | scenario tag        | Operator-defined Firewall UI entries    |

## Polling semantics

* Every poll returns the **full** snapshot of currently active bans in
  `new`. Bouncers refresh their ipset / nftables entry timeouts on
  every appearance, so a still-active ban stays alive at the source's
  declared `duration`.
* `deleted` carries the per-bouncer **diff** since the previous poll.
  MikoPBX stores the last-served snapshot per ApiKey id (Redis key
  `_PH_REDIS_CLIENT:fwbouncer:cursor:<token-id>`, TTL 1 h **refreshed
  on every poll** — the cursor expires only after one hour of bouncer
  silence). Decisions that disappeared between two polls —
  operator-triggered unban, ban TTL elapsed, NetworkFilters entry
  deleted — appear in `deleted` as full decision objects on the next
  poll, so the bouncer evicts the entry from its local store
  immediately rather than waiting for natural ipset timeout.
* `update_frequency: 5–10s` is the recommended polling interval.

The bouncer-sent query parameters behave as follows:

| Param     | Behaviour                                                                                                                                                                                                                                                                                                                                                  |
| --------- | -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `startup` | `startup=true` ignores the stored cursor for this poll only — full snapshot in `new`, empty `deleted` — then writes the just-served snapshot to the cursor. The NEXT poll diffs against that fresh snapshot normally. Bouncers send this on the first poll after restart. Other values (including `false`) are treated as steady-state polls.              |
| `scopes`  | Accepted but ignored. MikoPBX only emits `scope=Ip` and `scope=Range`; no filtering applied server-side.                                                                                                                                                                                                                                                    |
| `origins` | Accepted but ignored. Both origins (`mikopbx-fail2ban`, `mikopbx-networkfilters`) always present in the response. Bouncers that want to filter must do so client-side.                                                                                                                                                                                      |

Cursor isolation lets multiple independent bouncers (e.g. one running
nftables locally, another driving a Cloudflare endpoint) each track
their own delta — **issue one ApiKey per bouncer**. Sharing one ApiKey
between two or more bouncers makes them share a single cursor: polls
from different bouncers interleave their snapshot writes, producing
nondeterministic `deleted[]` timing and missed eviction events for
short-lived bans.

## Examples

### curl

```bash
# Read the bouncer API key from an env var / secret manager on the host
# where you run this — never paste it inline in scripts that get checked
# into version control.
TOKEN=$BOUNCER_API_KEY

# CrowdSec-style:
curl -H "X-Api-Key: $TOKEN" \
  "https://pbx.example.com/pbxcore/api/v3/firewall-bouncer/v1/decisions/stream?startup=true" \
  | jq

# Bearer-style (equivalent):
curl -H "Authorization: Bearer $TOKEN" \
  "https://pbx.example.com/pbxcore/api/v3/firewall-bouncer/v1/decisions/stream" \
  | jq
```

### Minimal custom bouncer (Python)

```python
import requests, time

BASE = "https://pbx.example.com/pbxcore/api/v3/firewall-bouncer"
HEADERS = {"X-Api-Key": TOKEN}

# Bouncer-local whitelist (refreshed less often than decisions).
whitelist = set(requests.get(f"{BASE}/v1/whitelist", headers=HEADERS).json())

while True:
    resp = requests.get(f"{BASE}/v1/decisions/stream", headers=HEADERS).json()
    bans = {d["value"] for d in resp["new"]}
    apply_iptables(bans - whitelist)
    time.sleep(10)
```

Note that the JSON body is the LAPI shape at the top level — there is no
`{result, data, ...}` envelope around `new` / `deleted`.

## Whitelist

`GET /pbxcore/api/v3/firewall-bouncer/v1/whitelist` returns the
operator-defined allow-list as a flat JSON array:

```json
["10.0.0.0/8", "192.168.1.0/24"]
```

Sources merged into the response:

* `NetworkFilters` rows with `newer_block_ip = '1'`,
* `Fail2BanRules.whitelist`.

This endpoint is **MikoPBX-specific**. Stock `cs-firewall-bouncer` does
not poll it — CrowdSec LAPI has no "allow" decision type and the bouncer
uses its own `whitelists.yaml`. Provided for MikoPBX-aware integrations
that want server-side whitelist consistency.

MikoPBX additionally enforces the whitelist on the write side (via
`DockerNetworkFilterService::isIpWhitelisted`), but that's defence in
depth — your bouncer should still subtract the whitelist from `new`
before applying bans.

## Security

* The whitelist endpoint exposes **operator allow-list networks**.
  Never expose this endpoint without authentication.
* Optimally, bind the bouncer token to a NetworkFilter that permits
  only the bouncer host's IP. Calls from any other source will return
  403.
* After compromise — revoke the token in the ApiKeys UI; the bouncer
  will stop receiving new decisions, and its local bans will start
  expiring after 30 seconds (if that mode is enabled).
