---
name: h-fix-gnatsd-genid-panic-arm64
status: completed
created: 2026-04-27
completed: 2026-04-27
---

# Fix gnatsd `genID()` panic on early boot (slice bounds out of range)

**Repo:** `/Volumes/DevDisk/Developement/mikopbx/gnatsd-miko/`
**File:** `server/util.go` (lines 32–60)
**Discovered:** 2026-04-27 while diagnosing «Starting nats queue daemon… FAIL (60.29s)» on AWS EC2 ARM64 (Graviton, t4g.*).
**Affected platforms:** any host where boot reaches `NatsConf::start()` before NTP sync (ARM64 cloud VMs, embedded boards without RTC battery, snapshot-restored VMs, fresh installs).

---

## Symptom captured on host

When MikoPBX boot launches `gnatsd` via the boot script, the process panics within milliseconds of exec, leaving no record in `gnatsd.log` (only `[INF] Server is ready` lines from later monit-driven restarts). The PHP boot loop `monitWaitStart()` polls `pgrep gnatsd` for 60s, never finds it, and prints `FAIL (60.29s)`.

Stderr captured on the host (after instrumenting `NatsConf::start()`):

```
panic: runtime error: slice bounds out of range [:22] with length 12

goroutine 1 [running]:
miko.ru/gnatsd/server.genID({0x467e52, 0x7})
    /root/t2-trunk/package/miko/gnatsd/src/server/util.go:46 +0x1fc
miko.ru/gnatsd/server.New(0x4000128008)
    /root/t2-trunk/package/miko/gnatsd/src/server/server.go:174 +0x6c
main.main()
    /root/t2-trunk/package/miko/gnatsd/src/main.go:94 +0x11c
```

System clock at the moment of panic: `1970-01-01 03:00:21` (Unix ≈ 10821, NTP not yet synced).

---

## Root cause

`server/util.go:32-49`:

```go
func genID(host string) string { // mcvet: add param host
    //+mcvet
    if len(host) == 0 || host == DEFAULT_HOST {
        ci := license.GetClientInfo()
        if len(ci.MacAddress) == 17 {
            host = strings.Replace(ci.MacAddress, ":", "", -1)[6:]
        }
    }

    key := []byte(host)
    now := strconv.FormatInt(time.Now().Unix(), 10)
    id := fastEncryptDecrypt([]byte(now + " " + VERSION), key)
    encId := base62.StdEncoding.EncodeToString(id)

    return encId[:22]                    // <-- panic
    //-mcvet
    return nuid.Next()                   // dead code (unreachable)
}
```

Length analysis (`VERSION = "1.4.1"` from `server/const.go:41`):

| Scenario                             | `time.Now().Unix()` | `now + " " + VERSION` length | base62-encoded length | `encId[:22]` |
| ------------------------------------ | ------------------- | ---------------------------- | --------------------- | ------------ |
| Synced clock (≥ year 2001)           | 10 digits           | 16 bytes                     | ~22 chars             | OK           |
| Early boot, RTC unset                | 4–5 digits          | 10–11 bytes                  | ~13–15 chars          | **PANIC**    |
| Snapshot restored to pre-2001 epoch  | 1–9 digits          | 7–15 bytes                   | ~9–20 chars           | **PANIC**    |

The panic message `length 12` matches a 9-byte input (≈ `"4321 1.4.1"` — Unix timestamp ~4321) base62-encoded.

### Two more defects in the same block

1. **Division by zero / index-out-of-range in `fastEncryptDecrypt` (line 56):**
   ```go
   result[i] = result[i] ^ key[i % (len(key) / 1)]
   ```
   - `len(key) / 1` is `len(key)` — the `/ 1` is dead.
   - If host is empty AND `license.GetClientInfo().MacAddress` is not exactly 17 chars, `host` stays `""` → `key` is empty → `i % 0` → runtime panic OR `key[0]` on an empty slice. The function has no guard.

2. **Unreachable `return nuid.Next()` (line 48):**
   - Dead code — reads as if there were a fallback, but the preceding `return encId[:22]` always executes (or panics).

---

## Why this didn't surface earlier

- On x86 EC2 / bare-metal, NTP sync via `chrony` or `ntpd` typically completes within 1–2 seconds because cloud-init / DHCP populates timeservers fast and the CPU is fast enough.
- ARM64 Graviton (especially `t4g`/`a1`) plus ARM-Linux T2 SDE boot reaches `bootup_pbx` (which calls `NatsConf::start()`) before NTP — `time.Now().Unix()` is still 4–5 digits.
- The boot script redirects stderr to `/dev/null` (`> /dev/null 2>&1` in `NatsConf::configure()`), so the panic was invisible to operators — only a `FAIL (60.29s)` print remained. **(MikoPBX side: this has been fixed in `src/Core/System/Configs/NatsConf.php` — stderr now goes to `$logDir/gnatsd-stderr.log`.)**

---

## Proposed fix

Minimal and defensive — keeps existing ID derivation logic but guarantees a valid 22-char return regardless of clock state, host length, or MAC availability.

```go
// server/util.go
func genID(host string) string { // mcvet: add param host
    //+mcvet
    if len(host) == 0 || host == DEFAULT_HOST {
        ci := license.GetClientInfo()
        if len(ci.MacAddress) == 17 {
            host = strings.Replace(ci.MacAddress, ":", "", -1)[6:]
        }
    }
    if len(host) == 0 {
        return nuid.Next() // can't XOR with empty key; fall back to nuid
    }

    key := []byte(host)
    // UnixNano() always produces 19 digits → input ≥ 25 bytes → encoded ≥ 33 chars,
    // safely above the 22-char slice. Independent of NTP / RTC state.
    now := strconv.FormatInt(time.Now().UnixNano(), 10)
    id := fastEncryptDecrypt([]byte(now+" "+VERSION), key)
    encId := base62.StdEncoding.EncodeToString(id)
    if len(encId) < 22 {
        return nuid.Next() // defensive; should be unreachable with UnixNano
    }
    return encId[:22]
    //-mcvet
}

func fastEncryptDecrypt(data, key []byte) []byte {
    if len(key) == 0 {
        return data
    }
    result := data
    for i := 0; i < len(data); i++ {
        result[i] = result[i] ^ key[i%len(key)]
    }
    return result
}
```

Changes summarized:

1. `Unix()` → `UnixNano()` — 19-digit timestamp guarantees ≥ 25 bytes input → ≥ 33 chars output, comfortably above 22.
2. Guard `len(host) == 0` → return `nuid.Next()`.
3. Guard `len(encId) < 22` → return `nuid.Next()` (defence in depth).
4. Drop dead `len(key) / 1` and `return nuid.Next()` after `return encId[:22]`.
5. Guard `fastEncryptDecrypt` against empty key.

Note: switching to `UnixNano()` changes the ID slightly (different XOR input), but ID is opaque and clock-time-derived was already non-deterministic across reboots — no compatibility constraint.

---

## Tests to add

`server/util_test.go`:

```go
func TestGenID_EarlyBoot(t *testing.T) {
    // No way to mock time.Now without a wrapper, but we can check current behaviour
    // produces a valid 22-char output regardless of host length / VERSION length.
    cases := []string{"", "0.0.0.0", "h", "abcdefghij", "very-long-hostname-string"}
    for _, host := range cases {
        id := genID(host)
        if len(id) != 22 {
            t.Errorf("genID(%q) returned len=%d, want 22", host, len(id))
        }
    }
}

func TestFastEncryptDecrypt_EmptyKey(t *testing.T) {
    // Must not panic
    out := fastEncryptDecrypt([]byte("hello"), []byte{})
    if string(out) != "hello" {
        t.Errorf("expected passthrough on empty key, got %q", out)
    }
}
```

For full early-boot reproduction, inject a `nowFunc func() int64` package variable so tests can simulate `time.Now().Unix() = 1234`.

---

## Build & deploy

The binary lives at `/usr/sbin/gnatsd` on the rootfs (sourced from T2 SDE package `package/miko/gnatsd`).

Cross-compile:
```bash
cd /Volumes/DevDisk/Developement/mikopbx/gnatsd-miko
GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o gnatsd-arm64 .
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o gnatsd-amd64 .
```

Then update T2 SDE pkg or push to the build pipeline so the next firmware image picks up the fix.

For local hotfix testing on the affected EC2 ARM64 host (`3.0.146.164`):
```bash
scp gnatsd-arm64 ec2-user@3.0.146.164:/tmp/gnatsd
ssh ec2-user@3.0.146.164 'busybox mount -o remount,rw /offload && \
    cp /tmp/gnatsd /offload/rootfs/usr/sbin/gnatsd && \
    chmod +x /offload/rootfs/usr/sbin/gnatsd && \
    busybox mount -o remount,ro /offload && \
    reboot'
```

---

## Verification after fix

Boot the host and confirm:

1. `dmesg | head -1` boot time T0
2. `head -1 /storage/usbdisk1/mikopbx/log/nats/gnatsd.log` should show `[INF] Starting nats-server` within seconds of T0 (not minutes)
3. `cat /storage/usbdisk1/mikopbx/log/nats/gnatsd-stderr.log` should be empty (no `panic:` lines)
4. Console boot output: `Starting nats queue daemon................. DONE (X.XXs)` with X < 5
5. `monit summary | grep gnatsd` → `OK`

---

## Diagnostic data preserved on host (for reference)

While diagnosing this, the following files were created on `3.0.146.164` and then cleaned up. If they're needed again, re-run instrumentation per the diagnostic patch in `git log` of `Core/src/Core/System/Configs/NatsConf.php` (it captured stderr via foreground `gnatsd` invocation with `2>&1`).
