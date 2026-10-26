# MikoPBX Core — threat model for the OSS Scanner

MikoPBX is a phone system for small business: Asterisk for call processing, with a PHP
(Phalcon) web GUI and REST API that generate and manage Asterisk's configuration. It ships
as a single appliance image — one container or VM bundling nginx, php-fpm, SQLite, Redis,
Beanstalkd and Asterisk — and is normally installed on a machine reachable from the office
LAN, often with SIP and sometimes the web GUI exposed to the Internet.

A compromise of the web layer is a compromise of the whole appliance: the GUI can rewrite
Asterisk's configuration, so from there an attacker can place calls, record them, read every
recording and CDR, and reach the LAN behind the PBX.

## Read this first: where you send a request decides what is checked

The agent runs inside the appliance, and the appliance treats loopback as trusted. **Two
different protections switch off for `127.0.0.1`, and they switch off in opposite
directions, so neither source address alone tests the system.**

| Sent from | Authentication / ACL | nginx Lua WAF + rate limiter |
|---|---|---|
| `127.0.0.1`, `::1` | **not enforced** | **not applied** — PHP sees the raw request |
| a non-loopback address | enforced | **applied** — obvious payloads get `403` before PHP runs |

So:

- **Test input handling from `127.0.0.1`** — SQL injection, path traversal, command
  injection, deserialization, file handling. Loopback is the only source where your payload
  reaches PHP unfiltered.
- **Test authentication, authorization and role separation from a non-loopback address**
  (recipe below). From loopback nothing is ever checked, so a loopback request proving
  "no error" proves nothing about access control.

### The authentication exemption, precisely

`src/PBXCoreREST/Middleware/AuthenticationMiddleware.php:86-108` runs in this order:

1. public endpoints and module no-auth routes → optional authentication, request allowed;
2. **if an `Authorization: Bearer` header is present, it is validated** — a bogus token is
   rejected with `401` even from loopback;
3. only if no Bearer header was sent, `$request->isLocalHostRequest()` allows the request
   (`:102`), which is documented at `:43` as *"LOCALHOST — direct access from 127.0.0.1 or
   ::1 (bypasses all security)"*;
4. ACL authorization is skipped for localhost (`:173`) once a token has been accepted.

`src/AdminCabinet/Plugins/SecurityPlugin.php:335` has its own check for the web GUI, on the
raw `$_SERVER['REMOTE_ADDR']`, matching `127.0.0.1` only (not `::1`).

Local workers and CLI scripts depend on this, so it will not change. **Do not report
"unauthenticated access to `/pbxcore/api/v3/...`" when the request came from loopback.**
Do report any way a *remote* party can cause a request to originate there — see
"Request forgery" below.

### The WAF, and why a 403 is not a fix

`src/Core/System/Configs/NginxConf.php:463` installs
`access_by_lua_file .../lua/unified-security.lua` on the server. That script returns
immediately for `127.*`, `::1` and `localhost`
(`src/Core/System/RootFS/etc/nginx/mikopbx/lua/unified-security.lua:117-130`). For every
other address, and in every mode but `relaxed`, it runs `check_basic_security()` — a pattern
matcher for `union%s+select`, `' or `, `1=1`, `';`, `..`, `%00` and friends — and answers a
match with `403 "Security violation detected"` (`:578-612`, `:975-981`). It also rate-limits
per IP and then blocks the IP in Redis.

Two consequences:

- Do not conclude from a `403` that the underlying code is safe. **Report the underlying
  bug at full severity** and say whether the trivial payload was filtered. A pattern WAF in
  front of an injection is defence in depth, not a fix.
- If you need an injection probe to arrive from a non-local address, switch the WAF off for
  the test: `PBX_SECURITY_MODE=relaxed` skips `check_basic_security()`, and
  `MIKOPBX_RATE_LIMIT_ENABLED=0` (read at `NginxConf.php:447`) disables the rate limiter.
  Say in the finding which of these were set.

The WAF, `access-nchan.lua` and the `locations/*.conf` path whitelists are **our own
security code and in scope** — a bypass of them is a finding in its own right.

### How to send a request the middleware does not treat as local

`Request::isLocalHostRequest()` compares `getClientAddress()` with `127.0.0.1` / `::1`. That
resolves to `REMOTE_ADDR`: the class extends `Phalcon\Http\Request` and calls
`getClientAddress()` with no argument, so `trustForwardedHeader` is `false`; nginx sets no
`real_ip` trust, and the Lua also reads `ngx.var.remote_addr` only. **Headers cannot change
the perceived source address.** Give the machine a second, non-loopback address instead:

```sh
ip addr add 192.0.2.1/32 dev lo
curl -k https://192.0.2.1/pbxcore/api/v3/extensions          # 401, auth enforced
curl    http://127.0.0.1/pbxcore/api/v3/extensions           # 200, localhost exemption
```

Verified in this image on 2026-10-17: without a token the non-local request returns
`401 {"error":["The user isn't authenticated."]}`, and with a valid Bearer token it returns
`200`. Plain HTTP from a non-local source is answered with `301` to HTTPS, so use `https://`
and `-k` (self-signed certificate).

`ip addr add` needs `CAP_NET_ADMIN`. If it fails, **say in your report that non-local
authorization could not be exercised** rather than treating the loopback results as an
authorization test.

## Where untrusted input enters

### 1. Endpoints that need no authentication at all

The first place to look for anything unauthenticated and remote. The authoritative lists:

- `src/PBXCoreREST/Services/PublicEndpointsRegistry.php`;
- the `#[ResourceSecurity(... SecurityType::PUBLIC)]` attribute — present on controllers
  under `Auth`, `Passkeys`, `MailSettings/OAuth2Callback`, `WikiLinks`, `System`,
  `UserPageTracker` and `Cdr`;
- `Request::thisIsModuleNoAuthRequest()` (`src/PBXCoreREST/Http/Request.php:287-305`), which
  matches module no-auth routes with a regex built from a route template — worth checking
  whether a longer path can satisfy a shorter pattern;
- the nchan auth and token-validation locations in
  `src/Core/System/RootFS/etc/nginx/mikopbx/locations/longpool.conf`, plus the CDR playback
  path whitelisted in `cdr-api.conf`, `/pbxcore/files/` and `avatars.conf`.

### 2. REST API v3

`/pbxcore/api/v3/...`, nginx → php-fpm, code in `src/PBXCoreREST/`. Controllers validate and
enqueue; the work runs in `src/PBXCoreREST/Workers/WorkerApiCommands.php`, a separate process
reading a Redis list (`REDIS_API_QUEUE = 'api:requests'`). Input crosses that process
boundary inside a queue envelope — a good place to look for validation performed on one side
only, since the worker also has no Phalcon request object and reconstructs context from the
envelope.

### 3. Admin cabinet

The web GUI at `/`, `src/AdminCabinet/`. Authentication is JWT: a `Bearer` header for AJAX
and a `refreshToken` cookie (SameSite=Strict) for page loads —
`src/AdminCabinet/Plugins/SecurityPlugin.php`, `src/Common/Providers/JwtProvider.php`. There
is no CSRF token layer: state changes go through the REST API with an `Authorization`
header, which a browser does not attach on its own. Report CSRF only where a state change is
actually accepted on the cookie alone.

### 4. SIP, AMI and the dialplan — the telephony side

Asterisk listens on 5060/5061 (SIP), 5038 (AMI) and 8088/8089 (HTTP/ARI). Asterisk itself is
upstream and out of scope, but **everything MikoPBX generates and runs around it is in
scope**:

- `src/Core/Asterisk/Configs/` — who may call out, which contexts an unauthenticated SIP
  peer can reach, what the dialplan does with caller-supplied data. Toll fraud lives here.
- `src/Core/Asterisk/AGI.php`, `AGIBase.php`, `src/Core/Asterisk/agi-bin/*.php` — PHP invoked
  from the dialplan with call data (caller id, DTMF, SIP headers) as arguments. Untrusted
  strings from the telephony side reach shell and SQL in these.
- `AsteriskManager.php` — AMI command construction; an injected newline here is an AMI
  command injection.

### 5. Module installation and module code

Uploading and installing a module archive is a direct path to code execution on the
appliance:

- `src/PBXCoreREST/Lib/Modules/` — in particular `InstallFromPackageAction.php`,
  `GetMetadataFromModulePackageAction.php` and `Pipeline/ModuleArchiveExtractor.php`
  (zip extraction, path handling), plus `src/PBXCoreREST/Lib/ModulesManagementProcessor.php`
  and `src/PBXCoreREST/Workers/WorkerModuleInstaller.php`.
- **There is no module signature verification in Core.** Do not assume a signature gate
  exists and then discount a finding because "the package would have been rejected". If you
  find that an archive's origin or integrity is not established before its code runs, that
  is a finding.
- `src/Modules/` is a different surface: it is the runtime base that installed modules extend
  (`PbxExtensionBase.php`, `PbxExtensionState.php`, `PbxExtensionUtils.php`). The question
  here is what a module's code can reach once it is installed.

### 6. Provisioning, licensing and system services

- `src/Core/System/CloudProvisioning/` — including user-supplied YAML/JSON seeds.
  `fromEnvironment()` does no validation by design; the validated path is the YAML/JSON one.
- `src/Core/System/LicenseV2/` — signature verification of entitlement tokens. Network
  failures here are expected offline (see "known non-issues"), but **the verification code
  itself is in scope**: accepting an unsigned or wrongly signed token is a finding.
- `src/Core/System/RootFS/sbin/voicemail-sender` — the stdin mail parser, and the real
  consumer of `ext-mailparse`.
- `src/Core/System/RootFS/etc/rc/fail2ban_nginx` and `fail2ban_asterisk` — root-run scripts
  that take IP addresses derived from log lines.
- Uploaded media, backup and firmware files, and the storage code that handles them.

### 7. Request forgery reaching loopback — read this with section 1

Because loopback bypasses REST authentication, the GUI's own check and the Lua WAF, **any
primitive that makes the PBX send an HTTP request to itself is a full unauthenticated
administrative takeover.** Candidates: a server-side request with an attacker-influenced
URL, webhook or S3 endpoint configuration, the OAuth2 callback, provisioning metadata URLs,
the module download URL, and `ngx.location.capture` in our Lua. Such a chain is **Critical**,
and the "do not report loopback access" rule above does not apply to it — the point of the
finding is that a remote party reached loopback.

## How we rate severity

Rate by what an attacker gains, counted from the **lowest privilege that reaches the bug**,
and by who can supply the input rather than where you happened to send it from.

- **Critical** — remote code execution, arbitrary file read or write, SQL injection, or an
  authentication bypass reachable without credentials from a non-loopback source. Request
  forgery that reaches loopback (section 7). Anything letting an unauthenticated SIP or HTTP
  peer place calls at the owner's expense, or read recordings and CDRs — toll fraud is a
  direct financial loss and we treat it as critical. Stored content planted by an
  unauthenticated party that executes in an administrator's session (see XSS below).
- **High** — the same classes but requiring credentials of a restricted principal; escape
  from a restricted API key's limits; leaking credentials, JWT signing keys, SIP secrets,
  API keys or the license key; SSRF that reaches the LAN behind the PBX.
- **Medium** — XSS that only an authenticated administrator can plant; authenticated
  disclosure of configuration that principal should not read; a missing authorization check
  that leaks non-secret data; a bug needing an unlikely precondition.
- **Low** — denial of service requiring authentication; version, path or stack-trace
  disclosure; missing hardening headers; anything needing console access.

### Rate XSS by who can plant it and what the session can do

A flat "XSS is medium" would be wrong here. Caller id, SIP From and DTMF data come from an
**unauthenticated** caller and are rendered in the CDR, active-calls and monitoring pages of
the admin cabinet. Stored XSS on that path executes in the administrator's session, and that
session can use the documented code-execution features below. That chain is unauthenticated
remote code execution: **Critical**.

### The administrator is root-equivalent by design — with one limit

The GUI deliberately lets an administrator write files on the appliance and execute code:
custom files editing, dialplan applications (which store PHP or shell to run on a call),
scheduled tasks, and module installation. Reaching code execution *as an administrator,
through those features, by using them* is not a vulnerability.

The exception does **not** cover being driven into them. If an unauthenticated or
lower-privileged party can cause an administrator's session to use those features, or can
reach them without that session, that is a finding at full severity.

### Who the restricted principals actually are

`src/Common/Providers/AclProvider.php` defines only two roles: `admins` (allowed everything)
and `guests` (denied everything). Additional non-admin roles come from an external module
that cannot be installed offline, so **do not spend the scan looking for role escalation
between GUI roles.**

The restricted principal Core does have is an **API key**: `ApiKeys` rows with
`full_permissions = 0`, an `allowed_paths` list and an optional `networkfilterid`
(`src/Common/Models/ApiKeys.php:73-88`, enforced via `ApiKeyPermissionChecker`, see the note
at `AuthenticationMiddleware.php:195`). A key reaching a path outside `allowed_paths`, or
ignoring its network filter, is the role-escape finding worth hunting. Create one through the
API Keys page in the GUI.

## What to leave alone

- `vendor/` — third-party Composer packages. We do want to hear about a dependency only if
  our own code uses it unsafely; report that against our call site.
- `sites/admin-cabinet/assets/js/pbx/**` — Babel output of `assets/js/src/**`. Report the bug
  against the file in `src/`, not the compiled copy.
- `resources/db/`, `resources/sounds-base/`, `resources/rootfs/`, any `*.min.*` — vendored or
  generated data.
- Asterisk, PHP, nginx, Redis, Beanstalkd and the Linux userland themselves. Their
  *configuration as we generate it* is in scope; their internals are not.
- `tests/` and `sessions/` — test code and working notes, unless the finding is that a test
  hides a real defect.

## How to exercise the system

```sh
mikopbx-start            # boots the PBX and waits for the REST API; can take a few minutes
```

This image sets no administrator credential, so the appliance comes up with the product's
own first-run login, `admin` / `admin`
(`src/Common/Models/PBXSettings/PbxSettingsDefaultValuesTrait.php:126-127`). It is left alone
deliberately, so that you have an administrator to reproduce post-auth findings with, so
"the default password is unchanged" is not a finding in this image.

Two properties of that credential are worth knowing, because they are properties of the
authentication code and not of the lab setup:

- **The initial value is stored in clear text, and the login accepts three formats.** In a
  fresh appliance `m_PbxSettings.WebAdminPassword` holds the literal `admin`, five bytes, not
  a hash; it becomes a `$6$` SHA-512 crypt hash once the password is changed.
  `CredentialsValidator::checkAdminCredentials()`
  (`src/Common/Library/Auth/CredentialsValidator.php:83-93`) therefore accepts plaintext
  (a plain `===`), SHA-512 crypt, or bcrypt from older installations. Judge the storage, the
  comparison and whatever else reads that row.
- **The forced-change gate exists but is narrow.** `SecurityPlugin` does force a password
  change (`isForcedPasswordChangeRequired()` / `isDefaultCloudPassword()`,
  `src/AdminCabinet/Plugins/SecurityPlugin.php:205-247`, added for issue #1132) — but only
  when the web password still equals `CLOUD_INSTANCE_ID`, which is empty on Docker, LXC and
  NoCloud, so the built-in `admin` default is not gated at all. The code comment at `:124-125`
  states that it gates interactive browser navigation only and that REST API v3
  authentication is a separate layer the plugin never sees. A default password is otherwise
  only surfaced as advice, by the console banner
  (`SystemMessages::showWebCredentials()`) and in the GUI by
  `src/Core/Workers/Libs/WorkerPrepareAdvice/CheckWebPasswords.php`.
  **The scope of that gate is the interesting question**, not its absence: an installation on
  a built-in default, or a cloud default still usable through the REST API while the browser
  is redirected, is a finding we want.

A token — the GUI posts the same endpoint, form-encoded, from
`sites/admin-cabinet/assets/js/src/Session/login-form.js:169`:

```sh
curl -sk -X POST https://192.0.2.1/pbxcore/api/v3/auth:login \
     -H 'Content-Type: application/json' \
     -d '{"login":"admin","password":"admin"}'
# -> data.accessToken, a Bearer token valid for 900 s
```

Unit tests (the XML defines no testsuites, so a path is mandatory):

```sh
vendor/bin/phpunit -c tests/Unit/phpunit.xml tests/Unit/Common/Library
```

**Reloading edited code.** php-fpm picks up changed files immediately
(`opcache.validate_timestamps=1`), but the long-running workers do not. Restart them with:

```sh
php -f /offload/rootfs/usr/www/src/Core/Workers/Cron/WorkerSafeScriptsCore.php restart
```

Re-running `mikopbx-start` does **not** restart anything — it returns as soon as it sees the
API answering. A reboot through the API or the GUI does nothing here either: in Docker,
`System::reboot()` only creates `/tmp/rebooting`, and the only process that watches that file
is the container entrypoint, which `mikopbx-start` deliberately does not run.

**Patching.** `/offload/rootfs/usr/www/{src,sites,tests,vendor}` are symlinks into `/src`, so
a patch written in `/src` is the code that runs — **for PHP and JavaScript only**. The rest of
the appliance rootfs (nginx configuration and its Lua, `/etc/rc/*`, `/sbin/*`, `php.d`) comes
from the base image, not from the checkout. Editing `src/Core/System/RootFS/**` in `/src` has
no effect on the running system, and the running copy may differ from the checkout's version;
to test such a change, edit the file under `/etc` or `/sbin` directly and report the patch
against the `RootFS` path.

Useful paths: the configuration database is `/cf/conf/mikopbx.db` (SQLite; `m_PbxSettings`
holds settings), logs are under `/storage/usbdisk1/mikopbx/log/` —
`system/messages`, `php/php-error.log`, `nginx/error.log`, `asterisk/`.

## fail2ban is running, and it will ban you

Provisioning force-enables fail2ban on first boot
(`CloudProvider::markProvisioningCompleteDirect()`), so the appliance starts with nine jails
active, including `mikopbx-www`, `mikopbx-nginx-errors` and — relevant for a scanner —
`mikopbx-exploit-scanner`. Probing from the non-local address will get that address banned.

In Docker the ban is not an iptables DROP: `canManageFirewall()` is false by design
(`src/Core/System/System.php`), so HTTP bans are enforced by the Lua and Redis
(`/etc/rc/fail2ban_nginx`) and SIP/AMI bans through the Asterisk ACL
(`/etc/rc/fail2ban_asterisk`, `Fail2BanConf.php`). **The symptom is a `403` from nginx, not a
timeout.** You have root, so you can see and undo it:

```sh
fail2ban-client status                               # the nine jails
fail2ban-client set mikopbx-www unbanip 192.0.2.1    # lift a ban on your test address
fail2ban-client stop                                 # or stop it for a test
```

The Lua rate limiter keeps its own blocks in Redis (`_PH_REDIS_CLIENT:rate_limit:*`,
`firewall:*`), which `fail2ban-client` does not clear; use `MIKOPBX_RATE_LIMIT_ENABLED=0` to
avoid them. If you disable either mechanism for a test, say so in the finding — on a real
installation both are on, and that may be part of why an attack is impractical. Equally, "no
iptables rules in the container" is not "the product ships without a firewall".

## Known non-issues in this environment

- `Waiting for Asterisk to fully boot... - failed` in `system/messages`, while Asterisk is in
  fact listening. The "fully booted" probe does not pass here.
- Any license check, update check or metrics upload failing: there is no network during the
  audit, and this image sets `SEND_METRICS=0` and `AUTO_UPDATE_EXTERNAL_IP=0`. The
  verification code in `src/Core/System/LicenseV2/` is still in scope.
- The self-signed TLS certificate, and the `301` from plain HTTP to HTTPS for non-local
  requests.
- `composer.lock` is not versioned, so this image's `vendor/` is freshly
  resolved and may not match what a released image ships — check dependency-behaviour
  findings against the shipped versions before rating them.
- Logging in as `admin` / `admin` works in this image, so "I could log in with the default
  credential" is not a finding on its own. This is the *only* part of the default-credential
  story that is out of scope: the plaintext storage, the three accepted password formats and
  the scope of the forced-change gate are all in scope, and are described under "How to
  exercise the system". Note that the image changes nothing here — a shipped Docker or LXC
  installation boots on the same default.

## How we would like findings reported

- One finding per report, with the severity you assign and why.
- A reproducer we can paste: `curl` with the full request, or a short PHP snippet. State the
  source address it was sent from, whether a token or API key was used, and whether you
  disabled the WAF, the rate limiter or fail2ban for the test.
- Where available, a patch as a diff against the checkout in `/src` — or, for a rootfs file,
  against its path under `src/Core/System/RootFS/`.
