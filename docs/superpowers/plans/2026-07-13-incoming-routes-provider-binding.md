# Incoming Route Provider Binding Preservation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve an incoming route's provider binding when PUT or PATCH omits `providerid`, while retaining explicit change and clear operations.

**Architecture:** Keep request data in API shape through defaults and schema validation, then map `providerid` to the database field `provider` immediately before persistence. The presence of the API key, rather than the HTTP method, determines whether the binding is updated.

**Tech Stack:** PHP 8.4, Phalcon models, MikoPBX REST API v3, Python 3 with pytest, SSH/curl verification on MikoPBX.

## Global Constraints

- `Providers.uniqid` remains unchanged; only the incoming-route binding is in scope.
- POST without `providerid` creates an "Any provider" route stored with `provider = null`.
- PUT and PATCH without `providerid` preserve the existing binding.
- An explicit provider ID changes the binding; `"none"` or `""` clears it.
- No database-schema, outbound-route, or unrelated REST-resource changes.
- Preserve all unrelated files already present in the dirty worktree.

---

### Task 1: Add failing API regression coverage

**Files:**
- Modify: `tests/api/test_23_incoming_routes_default.py:18-360`
- Test: `tests/api/test_23_incoming_routes_default.py`

**Interfaces:**
- Consumes: `MikoPBXClient.post()`, `put()`, `patch()`, and `assert_record_exists()` from `tests/api/conftest.py`.
- Produces: explicit `provider_route_id` and `provider_id` test state plus a regression test for preserve, clear, and restore semantics.

- [ ] **Step 1: Record the provider-bound route explicitly**

Add class state next to `created_ids`:

```python
    provider_route_id = None
    provider_id = None
```

After the provider route is created in `test_04_create_provider_route`, record both values:

```python
        self.provider_route_id = route_id
        self.provider_id = provider_id
```

- [ ] **Step 2: Assert the unchanged POST default**

After `test_03_create_basic_route` receives a successful response, add:

```python
        assert response['data']['providerid'] == 'none'
```

- [ ] **Step 3: Add the provider-binding regression test before the copy test**

```python
    def test_11_provider_binding_update_semantics(self, api_client):
        """Provider binding changes only when providerid is explicitly supplied."""
        if self.provider_route_id is None or self.provider_id is None:
            pytest.skip("Provider-bound route was not created")

        route_id = self.provider_route_id
        provider_id = self.provider_id

        patch_response = api_client.patch(
            f'incoming-routes/{route_id}',
            {'timeout': 17}
        )
        assert_api_success(patch_response, "PATCH without providerid failed")
        patched = assert_record_exists(api_client, 'incoming-routes', route_id)
        assert patched['providerid'] == provider_id
        assert int(patched['timeout']) == 17

        put_data = patched.copy()
        put_data.pop('providerid', None)
        put_data['timeout'] = 18
        put_response = api_client.put(f'incoming-routes/{route_id}', put_data)
        assert_api_success(put_response, "PUT without providerid failed")
        put_updated = assert_record_exists(api_client, 'incoming-routes', route_id)
        assert put_updated['providerid'] == provider_id
        assert int(put_updated['timeout']) == 18

        clear_response = api_client.patch(
            f'incoming-routes/{route_id}',
            {'providerid': 'none'}
        )
        assert_api_success(clear_response, "Explicit provider clear failed")
        cleared = assert_record_exists(api_client, 'incoming-routes', route_id)
        assert cleared['providerid'] == 'none'

        restore_response = api_client.patch(
            f'incoming-routes/{route_id}',
            {'providerid': provider_id}
        )
        assert_api_success(restore_response, "Provider restore failed")
        restored = assert_record_exists(api_client, 'incoming-routes', route_id)
        assert restored['providerid'] == provider_id
```

- [ ] **Step 4: Run syntax and collection checks**

Run:

```bash
python3 -m py_compile tests/api/test_23_incoming_routes_default.py
python3 -m pytest tests/api/test_23_incoming_routes_default.py --collect-only -q
```

Expected: Python compilation succeeds. Pytest collection succeeds when API environment variables are available; otherwise it exits during configuration with only the documented missing-variable error.

- [ ] **Step 5: Demonstrate the regression against the original server code**

Create a temporary incoming route on `serber@boffart.miko.ru` using an existing provider, PATCH only `timeout`, reload it, and delete it in a `finally` cleanup. Expected before deployment: the reloaded `providerid` is `"none"`, proving the new preservation assertion fails against the original implementation.

- [ ] **Step 6: Commit the failing regression test**

```bash
git add tests/api/test_23_incoming_routes_default.py
git commit -m "test(incoming-routes): cover provider binding updates"
```

---

### Task 2: Correct provider mapping and document PATCH

**Files:**
- Modify: `src/PBXCoreREST/Lib/IncomingRoutes/SaveRecordAction.php:82-93,180-200`
- Modify: `src/PBXCoreREST/Controllers/IncomingRoutes/RestController.php:198-218`
- Test: `tests/api/test_23_incoming_routes_default.py`

**Interfaces:**
- Consumes: `DataStructure::applyDefaults()`, `DataStructure::validateInputData()`, and the existing model-save guard for `provider`.
- Produces: model-shaped `$sanitizedData['provider']` only when the API request or POST defaults contain `providerid`.

- [ ] **Step 1: Remove provider mapping from Phase 1**

Delete the complete mapping block beginning with:

```php
// API field mapping: providerid (API) → provider (database)
```

and ending with the unconditional `else` that assigns `null`. Leave audio-message and routing-destination sanitization unchanged.

- [ ] **Step 2: Map the validated API field before Phase 6**

Insert after successful schema validation and before the Phase 6 heading:

```php
        // Map API field providerid to database field provider only when supplied.
        // POST defaults providerid to "none"; PUT/PATCH omission preserves the binding.
        if (array_key_exists('providerid', $sanitizedData)) {
            $providerId = $sanitizedData['providerid'];
            $sanitizedData['provider'] = empty($providerId) || $providerId === 'none'
                ? null
                : $providerId;
            unset($sanitizedData['providerid']);
        }
```

Do not modify the existing persistence guard:

```php
if (array_key_exists('provider', $sanitizedData)) {
    $route->provider = $sanitizedData['provider'];
}
```

- [ ] **Step 3: Expose providerid in PATCH documentation**

In the PATCH operation parameters, insert:

```php
    #[ApiParameterRef('providerid')]
```

between the `number` and `priority` parameters.

- [ ] **Step 4: Run local static verification**

Run:

```bash
php -l src/PBXCoreREST/Lib/IncomingRoutes/SaveRecordAction.php
php -l src/PBXCoreREST/Controllers/IncomingRoutes/RestController.php
python3 -m py_compile tests/api/test_23_incoming_routes_default.py
git diff --check
```

Expected: both PHP files report no syntax errors, Python compilation succeeds, and `git diff --check` produces no output.

- [ ] **Step 5: Review the focused diff**

Run:

```bash
git diff -- src/PBXCoreREST/Lib/IncomingRoutes/SaveRecordAction.php src/PBXCoreREST/Controllers/IncomingRoutes/RestController.php tests/api/test_23_incoming_routes_default.py
```

Expected: only the provider mapping order, PATCH documentation, and focused regression coverage change.

- [ ] **Step 6: Commit the implementation**

```bash
git add src/PBXCoreREST/Lib/IncomingRoutes/SaveRecordAction.php src/PBXCoreREST/Controllers/IncomingRoutes/RestController.php
git commit -m "fix(incoming-routes): preserve provider binding on update"
```

---

### Task 3: Deploy and verify on boffart test server

**Files:**
- Local source: `src/PBXCoreREST/Lib/IncomingRoutes/SaveRecordAction.php`
- Local source: `src/PBXCoreREST/Controllers/IncomingRoutes/RestController.php`
- Remote runtime: `/offload/rootfs/usr/www/src/PBXCoreREST/Lib/IncomingRoutes/SaveRecordAction.php`
- Remote runtime: `/offload/rootfs/usr/www/src/PBXCoreREST/Controllers/IncomingRoutes/RestController.php`
- Temporary verification helper: `/tmp/mikopbx-issue-1095-verify.py`

**Interfaces:**
- Consumes: SSH access as `serber@boffart.miko.ru`, localhost REST access on port 80, and an existing provider returned by `providers:getForSelect`.
- Produces: live evidence for POST default, PATCH preserve, PUT preserve, explicit clear, and restore behavior, followed by cleanup of the temporary route.

- [ ] **Step 1: Back up deployed files and record checksums**

Run and preserve the printed backup path for rollback:

```bash
ssh serber@boffart.miko.ru 'backup="/tmp/mikopbx-issue-1095-backup-$(date +%Y%m%d%H%M%S)"; mkdir -p "$backup/Lib" "$backup/Controllers"; cp /offload/rootfs/usr/www/src/PBXCoreREST/Lib/IncomingRoutes/SaveRecordAction.php "$backup/Lib/"; cp /offload/rootfs/usr/www/src/PBXCoreREST/Controllers/IncomingRoutes/RestController.php "$backup/Controllers/"; echo "BACKUP=$backup"; sha256sum "$backup/Lib/SaveRecordAction.php" "$backup/Controllers/RestController.php"'
```

- [ ] **Step 2: Upload to staging paths and validate syntax**

```bash
scp src/PBXCoreREST/Lib/IncomingRoutes/SaveRecordAction.php serber@boffart.miko.ru:/tmp/SaveRecordAction.issue1095.php
scp src/PBXCoreREST/Controllers/IncomingRoutes/RestController.php serber@boffart.miko.ru:/tmp/RestController.issue1095.php
ssh serber@boffart.miko.ru 'php -l /tmp/SaveRecordAction.issue1095.php && php -l /tmp/RestController.issue1095.php'
```

Expected: both staged files report no syntax errors.

- [ ] **Step 3: Install staged files and reload API workers**

Run:

```bash
ssh serber@boffart.miko.ru 'cp /tmp/SaveRecordAction.issue1095.php /offload/rootfs/usr/www/src/PBXCoreREST/Lib/IncomingRoutes/SaveRecordAction.php; cp /tmp/RestController.issue1095.php /offload/rootfs/usr/www/src/PBXCoreREST/Controllers/IncomingRoutes/RestController.php; chown www:www /offload/rootfs/usr/www/src/PBXCoreREST/Lib/IncomingRoutes/SaveRecordAction.php /offload/rootfs/usr/www/src/PBXCoreREST/Controllers/IncomingRoutes/RestController.php; chmod 0644 /offload/rootfs/usr/www/src/PBXCoreREST/Lib/IncomingRoutes/SaveRecordAction.php /offload/rootfs/usr/www/src/PBXCoreREST/Controllers/IncomingRoutes/RestController.php; pids=$(ps -eo pid,args | awk "/MikoPBX\\\\PBXCoreREST\\\\Workers\\\\WorkerApiCommands/ && !/awk/ {print \\$1}"); test -n "$pids" && kill $pids; i=0; while [ "$i" -lt 45 ]; do count=$(ps -eo args | grep -c "[W]orkerApiCommands"); [ "$count" -gt 0 ] && break; sleep 1; i=$((i+1)); done; echo "WorkerApiCommands=$count"; test "$count" -gt 0'
```

Expected: the command ends successfully and prints a positive worker count.

- [ ] **Step 4: Run a cleanup-safe localhost API scenario**

Create `/tmp/mikopbx-issue-1095-verify.py` locally with this complete content, upload it to the server, and execute it there:

```python
#!/usr/bin/env python3
import json
import time
from urllib.request import Request, urlopen

BASE = "http://127.0.0.1/pbxcore/api/v3"
created_route_ids = []


def call(method, path, payload=None):
    body = None if payload is None else json.dumps(payload).encode()
    request = Request(
        f"{BASE}/{path}",
        data=body,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    with urlopen(request, timeout=30) as response:
        result = json.load(response)
    assert result.get("result") is True, result
    return result.get("data")


try:
    providers = call("GET", "providers:getForSelect?includeNone=false")
    provider_id = next(item["value"] for item in providers if item["value"] != "none")
    stamp = str(int(time.time()))

    bound = call("POST", "incoming-routes", {
        "rulename": f"Issue 1095 bound {stamp}",
        "number": f"1095{stamp[-6:]}",
        "providerid": provider_id,
        "extension": "busy",
        "timeout": 30,
    })
    created_route_ids.append(bound["id"])
    assert bound["providerid"] == provider_id, bound

    patched = call("PATCH", f"incoming-routes/{bound['id']}", {"timeout": 31})
    assert patched["providerid"] == provider_id, patched
    print("PASS: PATCH omission preserved provider")

    current = call("GET", f"incoming-routes/{bound['id']}")
    put_payload = {
        key: current[key]
        for key in ("rulename", "number", "priority", "timeout", "extension", "audio_message_id", "note")
        if key in current
    }
    put_payload["timeout"] = 32
    put_updated = call("PUT", f"incoming-routes/{bound['id']}", put_payload)
    assert put_updated["providerid"] == provider_id, put_updated
    print("PASS: PUT omission preserved provider")

    cleared = call("PATCH", f"incoming-routes/{bound['id']}", {"providerid": "none"})
    assert cleared["providerid"] == "none", cleared
    print("PASS: explicit none cleared provider")

    restored = call("PATCH", f"incoming-routes/{bound['id']}", {"providerid": provider_id})
    assert restored["providerid"] == provider_id, restored
    print("PASS: explicit provider restored binding")

    unbound = call("POST", "incoming-routes", {
        "rulename": f"Issue 1095 unbound {stamp}",
        "number": f"2095{stamp[-6:]}",
        "extension": "busy",
        "timeout": 30,
    })
    created_route_ids.append(unbound["id"])
    assert unbound["providerid"] == "none", unbound
    print("PASS: POST default is none")
finally:
    for route_id in reversed(created_route_ids):
        try:
            call("DELETE", f"incoming-routes/{route_id}")
        except Exception as error:
            print(f"CLEANUP ERROR: route {route_id}: {error}")
    print("PASS: temporary routes cleaned up")
```

Run:

```bash
scp /tmp/mikopbx-issue-1095-verify.py serber@boffart.miko.ru:/tmp/mikopbx-issue-1095-verify.py
ssh serber@boffart.miko.ru 'python3 /tmp/mikopbx-issue-1095-verify.py'
```

Expected output:

```text
PASS: POST default is none
PASS: PATCH omission preserved provider
PASS: PUT omission preserved provider
PASS: explicit none cleared provider
PASS: explicit provider restored binding
PASS: temporary routes cleaned up
```

- [ ] **Step 5: Verify deployed checksums and service health**

Compare local and remote SHA-256 checksums for both PHP files. Confirm `WorkerApiCommands` processes are running and a localhost GET to `/pbxcore/api/v3/incoming-routes?limit=1` returns HTTP 200 with `result: true`.

- [ ] **Step 6: Run final repository verification**

```bash
git diff --check
git status --short
git log --oneline -3
```

Expected: no whitespace errors; only pre-existing unrelated untracked files remain; the design, regression-test, and implementation commits are present.
