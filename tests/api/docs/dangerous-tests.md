# Dangerous network tests

A handful of tests mutate live network configuration on the target —
firewall rules, static routes, gateway, DNS, hostname. They can break
connectivity to the host that pytest is talking to, including the API URL
itself, in which case the rest of the run fails with timeouts.

These tests are tagged with the `@pytest.mark.dangerous_network` marker.
They are **excluded by default** by `run-safe-tests.sh`, which runs
`pytest -m "not dangerous_network"`.

## Files that contain dangerous tests

| File                                  | Marked tests | What they do                                  |
|---------------------------------------|--------------|-----------------------------------------------|
| `test_33_network.py`                  | 7            | Static routes, gateway, hostname, DNS edits   |
| `test_35_firewall.py`                 | 2            | Toggle firewall enable, rule activation       |
| `test_35_network_ipv6_complete.py`    | 4            | IPv6 gateway, static addresses                |

(Total: 13 tests at time of writing — `pytest -m dangerous_network --collect-only` for the live count.)

## Running them deliberately

```bash
./run-dangerous-tests.sh                # interactive confirmation
./run-dangerous-tests.sh --force        # skip confirmation
pytest -v -m "dangerous_network"        # raw pytest invocation
```

`run-dangerous-tests.sh` finishes by probing the configured API URL with
`curl` so you immediately notice if the target became unreachable.

## When to run them

- After changing `src/Core/Asterisk/Configs/IptablesConf.php`,
  `src/Core/System/Network*.php`, or related dialplan generators.
- Before tagging a release.
- **Not** in a regular CI loop unless the target is dedicated and
  recoverable — e.g. a disposable LXC container or a VM with a known-good
  snapshot.

## Recovery

If a dangerous test leaves the target unreachable:

```bash
# Docker target — wholesale restart restores defaults
docker restart mikopbx-php83

# LXC target
pct restart <vmid>

# VM target — console / IPMI access; flush iptables manually if available
# inside the VM:
busybox iptables -F
busybox iptables -t nat -F
```

If the target persists firewall config across reboots and the rule made it
to disk, you may need to revert via the web UI or directly via the
SQLite DB (`m_FirewallRules` / `m_LanInterfaces`).

## Authoring a dangerous test

```python
import pytest

@pytest.mark.dangerous_network
def test_block_external_api(api_client):
    """Verify that …"""
    # 1. snapshot current state
    # 2. apply mutation
    # 3. assert behaviour
    # 4. restore state in a try/finally — never rely on cleanup fixtures
```

Always restore state in `finally`. A failing assertion must not leave the
firewall in a partially applied state, otherwise subsequent tests will hit
unrelated 401/timeout failures and the build report becomes unreadable.
