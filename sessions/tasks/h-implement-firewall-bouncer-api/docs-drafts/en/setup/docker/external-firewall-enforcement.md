# External firewall for Docker deployments

> ℹ️ Available starting from **MikoPBX 2026.1.76**. On earlier versions
> the `firewall-bouncer` LAPI endpoint, the Firewall page banner, and
> the "Create bouncer token" button do not exist.

## The problem

In Docker mode, MikoPBX's built-in firewall and fail2ban **do not protect
the web interface**:

* The container cannot manage host iptables.
* With Docker's default `userland-proxy=true`, the container sees the
  HTTP client as the `docker0` gateway (e.g. `172.17.0.1`), not the real
  attacker IP. Nginx-level ACLs and the fail2ban jail for the web form
  block only the gateway — i.e. nobody.

SIP protection still works: UDP DNAT preserves the source IP, Asterisk
sees the real address, fail2ban writes the ban to Redis, and
`module reload acl` rejects subsequent REGISTERs. Only the HTTP segment
is broken.

The fix is to export ban decisions outside the container and apply them
in the **real** host firewall (or edge CDN, or cloud security group) via
an external bouncer.

## Step 1. Check whether this applies to you

The **Security → Web access** page shows a yellow banner —
"Docker bridge: external firewall enforcement required" — when MikoPBX
detects the failure mode. If you see it, this document is for you. The
**Check my IP visibility** button calls the
`system:checkClientIpVisibility` endpoint and reports one of three
verdicts:

* `ip_visible` — the real client IP is visible; no action needed.
* `ip_not_visible` — the real client IP has been replaced by the Docker
  bridge gateway. HTTP firewall rules will not protect you.
* `proxy_detected` — a reverse proxy is in front of the PBX, and the
  PBX deliberately does not trust proxy headers. Configure the proxy to
  expose the real source IP, or deploy an external bouncer.

## Step 2. Choose an approach

### Option A — `network_mode: host` (minimum effort)

If the host is dedicated to the PBX and there are no port conflicts,
flip the container to host mode:

```yaml
services:
  mikopbx:
    image: mikopbx/mikopbx:latest
    network_mode: host
    # delete all `ports:` entries
```

The container shares the host network namespace; Asterisk and Nginx see
real source IPs, and the built-in firewall works as on bare metal. Best
for SIP-heavy installations.

Limitations: only one host-mode container per host, no side-by-side
PBX copies, conflicts with other processes on standard ports.

### Option B — `cs-firewall-bouncer` apt package on the host

The MikoPBX container stays in bridge mode. On the Linux host, install
`cs-firewall-bouncer` (open-source, CrowdSec project). It **polls** the
MikoPBX endpoint every 10 seconds and translates decisions into the
host's iptables / nftables.

Recommended for most installations.

#### 1. Create an API token

1. Open **System → API keys**.
2. Click **Create bouncer token** (pre-fills the correct path
   restriction).
3. Save. A modal will pop up with a ready-to-paste
   `cs-firewall-bouncer.yaml` snippet — **copy it immediately**, the API
   key is shown only once.

The resulting token is restricted to the `/api/v3/firewall-bouncer` path
and has no access to the rest of the API. Optionally bind the token to
a NetworkFilter to further restrict the source IP the bouncer is
allowed to call from.

#### 2. Install the bouncer on the host

```bash
# Debian / Ubuntu
curl -s https://install.crowdsec.net | sudo sh
sudo apt-get install -y crowdsec-firewall-bouncer-iptables
```

#### 3. Configure

Open `/etc/crowdsec/bouncers/cs-firewall-bouncer.yaml` and replace
`api_url` / `api_key` with the values from step 1:

```yaml
api_url: http://<MIKOPBX-HOST>/pbxcore/api/v3/firewall-bouncer/
api_key: <token-from-modal>
update_frequency: 10s
mode: iptables
log_mode: stdout
log_level: info
```

> 📌 `api_url` is the **base URL** — cs-firewall-bouncer appends
> `/v1/decisions/stream` itself and sends the token in the `X-Api-Key`
> header. Do **not** put the full decisions path in `api_url`, and do
> **not** prefix the key with `Bearer ` — the bouncer manages both.

> ⚠️ If your MikoPBX listens on HTTPS with a self-signed certificate,
> add `insecure_skip_verify: true` or install the CA certificate on
> the host.

```bash
sudo systemctl restart crowdsec-firewall-bouncer.service
sudo systemctl status crowdsec-firewall-bouncer.service
```

#### 4. Verify

* The bouncer log should show `received N new decisions, 0 deleted`.
* `sudo iptables -L CROWDSEC -n` (or the IPv6 counterpart for
  `crowdsec-firewall-bouncer-iptables-v6`) lists the applied bans.
* Manually ban a test IP via the **Firewall → Networks** UI or trigger
  a fail2ban ban, and confirm the entry appears in the host iptables
  within 30 seconds.

## Endpoint response shape

`GET /pbxcore/api/v3/firewall-bouncer/v1/decisions/stream` returns a
snapshot of currently active decisions in the exact shape stock
cs-firewall-bouncer expects — `{new, deleted}` at the top level, no
MikoPBX envelope:

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

In the MVP, every poll returns the **full** list of currently active
bans in `new`, and `deleted` is always empty. Bouncers reapply
decisions idempotently — resending the same IP is harmless.

Both header forms authenticate the same token:

```bash
# Stock cs-firewall-bouncer (CrowdSec convention):
curl -H "X-Api-Key: <token>" \
     "http://<MIKOPBX-HOST>/pbxcore/api/v3/firewall-bouncer/v1/decisions/stream?startup=true"

# Equivalent for ad-hoc probes with curl / Postman / Insomnia:
curl -H "Authorization: Bearer <token>" \
     "http://<MIKOPBX-HOST>/pbxcore/api/v3/firewall-bouncer/v1/decisions/stream"
```

### Whitelist sibling endpoint (custom)

`GET /pbxcore/api/v3/firewall-bouncer/v1/whitelist` returns the
operator-defined whitelist as a flat JSON array:

```json
["10.0.0.0/8", "192.168.1.0/24"]
```

This endpoint is **MikoPBX-specific**. Stock cs-firewall-bouncer does
not poll it (CrowdSec LAPI has no "allow" decision type, and the
bouncer uses its own `whitelists.yaml`). Provided for MikoPBX-aware
integrations that want server-side whitelist consistency with the
PBX's NetworkFilters.

## Technical reference

The full response format, query parameters, and MikoPBX↔CrowdSec field
mapping are documented in
[the firewall-export endpoint reference](../../manual/system/api-keys/firewall-export.md).
