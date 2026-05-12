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

# CRITICAL for Docker deployments: the rule MUST be inserted in
# DOCKER-USER, otherwise traffic Docker forwards to the container
# bypasses INPUT/FORWARD entirely and the ban is silently
# ineffective.
iptables_chains:
  - INPUT
  - FORWARD
  - DOCKER-USER

# Disable IPv6 unless Docker has an IPv6 bridge configured. ip6tables
# does not have a DOCKER-USER chain on hosts without docker IPv6, and
# the bouncer fatals at startup when it tries to insert there.
disable_ipv6: true
```

> 📌 `api_url` is the **base URL** — cs-firewall-bouncer appends
> `/v1/decisions/stream` itself and sends the token in the `X-Api-Key`
> header. Do **not** put the full decisions path in `api_url`, and do
> **not** prefix the key with `Bearer ` — the bouncer manages both.

> ⚠️ If your MikoPBX listens on HTTPS with a self-signed certificate,
> add `insecure_skip_verify: true` or install the CA certificate on
> the host.

> 🚨 `iptables_chains: [INPUT, FORWARD, DOCKER-USER]` is **not** the
> CrowdSec default (default is `INPUT` only). Without `DOCKER-USER`,
> traffic Docker routes to the container goes via the `DOCKER` chain
> and never sees the bouncer's DROP rule — the ban appears in iptables
> but actually does nothing. This is the single most common trap when
> wiring CrowdSec to a Docker-hosted PBX.

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

## Production deployment notes

### Protect SSH (and other admin ports) from the bouncer

CrowdSec bouncers ban at **IP level, not protocol level** — a single
ipset entry drops every TCP and UDP packet from the banned address.
That includes port 22. If an operator's source IP ends up in the ban
list by mistake (say, fail2ban detects three failed `auth:login`
attempts from the office NAT), SSH gets dropped too, and the operator
can lock themselves out of the host.

Insert a high-priority ACCEPT for the admin port **above** the
bouncer's DROP rule, so administrative access stays reachable even
when the operator's own IP gets banned:

```bash
# Always-accept SSH (port 22) — survives bouncer state changes
sudo iptables -I INPUT 1 -p tcp --dport 22 -j ACCEPT \
  -m comment --comment "admin-protect"

# Persist across reboots (Debian / Ubuntu)
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

Repeat for any other port you administer through (Wireguard,
the cloud provider's serial console, etc.) — anything you do **not**
want the bouncer to ever drop.

### Optional: safety-net auto-flush timer

For installations where losing access to the host has a high cost,
add a systemd-timer that periodically flushes the bouncer's ipset.
The bouncer will re-apply current bans on the next poll, so this is
a bounded-blast-radius safety net rather than a feature disable:

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

30 minutes is a reasonable default — short enough that an accidental
lockout self-recovers before the operator's coffee gets cold, long
enough that real attacks still get blocked for a meaningful window.

### Bouncer bans cover every protocol — by design

CrowdSec maps decisions to a single ipset per IP family. iptables
rules then drop **all** traffic from listed IPs, regardless of
protocol or port. So a `mikopbx/http` ban (web brute-force) will also
silently drop the same IP's SIP / IAX / AMI / SSH packets — and the
reverse: a `mikopbx/sip` ban (Asterisk fail2ban jail) will drop the
same IP's HTTP and AMI too. MikoPBX feeds **all four ban categories**
(`sip`, `http`, `ami`, `iax`) into the same stream, so once the
bouncer is wired every ban becomes IP-wide.

For most installations that's the right behaviour — if an IP is
hostile to HTTP it has no business reaching SIP either, and vice
versa. But if you deliberately want **per-protocol** isolation
(e.g. block HTTP brute-forcers without affecting their SIP), do
**not** deploy the bouncer for that PBX. The existing in-Docker SIP
defence path (`fail2ban` → Redis → pjsip ACL inside Asterisk) keeps
SIP bans isolated to Asterisk, but only as long as those bans never
reach the host ipset — which is exactly what the bouncer changes.

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

`new[]` carries the full snapshot of currently active bans on every
poll — bouncers refresh their entry timeouts to the value of `duration`,
so an active ban stays alive at the source's declared lifetime.
`deleted[]` is computed per-token (MikoPBX stores the previous snapshot
per ApiKey id) and contains decisions that disappeared since the last
poll. Operator-triggered unbans propagate to the bouncer's ipset in
one poll cycle (≈ 5–10 seconds), not at natural-TTL decay.

`?startup=true` on the first poll after bouncer restart resets the
per-token cursor and emits `deleted: []` — so a freshly-restarted
bouncer never sees phantom evictions for state it never tracked.

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
