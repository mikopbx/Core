# Reboot Tests - Quick Reference

## Problem

Tests that reboot MikoPBX face a challenge: the pytest process is killed when the system reboots, so the test cannot continue normally.

## Solution

Two-phase test execution using persistent state storage:

1. **Pre-Reboot Phase**: Save test state → Trigger reboot → Skip test
2. **Post-Reboot Phase**: Load state → Verify system → Cleanup

## Quick Start

### 1. Write a Reboot Test

```python
from helpers.reboot_helper import RebootTestHelper

@pytest.mark.reboot
def test_my_reboot(api_client):
    helper = RebootTestHelper("test_my_reboot")

    if helper.is_before_reboot():
        # Save what you need to verify later
        helper.save_state({"key": "value"})

        # Trigger reboot
        api_client.post("/system/reboot")
        helper.mark_reboot_initiated()

        # This ends the test until after reboot
        pytest.skip("Rebooting...")

    elif helper.is_after_reboot():
        # Verify state after reboot
        state = helper.load_state()
        assert state["key"] == "value"

        # Clean up
        helper.cleanup()
```

### 2. Run the Reboot Test

```bash
# From host machine (NOT inside MikoPBX)
cd tests/api
./run-reboot-test.sh mikopbx_php83 test_file.py::test_my_reboot
```

## How It Works

```
┌─────────────────────────────────────────────────────┐
│  Host Machine                                       │
│                                                     │
│  run-reboot-test.sh                                 │
│  ├── Phase 1: Run test (pre-reboot)                │
│  │   └── Test saves state to /storage/...          │
│  │   └── Test triggers reboot                      │
│  │   └── Test exits with skip                      │
│  │                                                  │
│  ├── Phase 2: Wait for reboot (5 min max)          │
│  │   └── Poll API every 5 seconds                  │
│  │   └── Wait for system to respond                │
│  │                                                  │
│  └── Phase 3: Run test (post-reboot)               │
│      └── Test loads state from /storage/...        │
│      └── Test verifies system state                │
│      └── Test cleans up state file                 │
└─────────────────────────────────────────────────────┘
```

## State Storage Location

```
/storage/usbdisk1/mikopbx/python-tests/reboot-states/
└── test_name.json          # State file (persists across reboot)
    {
      "test_name": "...",
      "timestamp": 1234567890,
      "reboot_initiated": 1234567890,
      "state": {
        "key": "value"
      }
    }
```

## Examples

### Example 1: Simple Reboot Test

```python
@pytest.mark.reboot
def test_simple_reboot(api_client):
    helper = RebootTestHelper("test_simple_reboot")

    if helper.is_before_reboot():
        helper.save_state({})
        api_client.post("/system/reboot")
        helper.mark_reboot_initiated()
        pytest.skip("Rebooting")

    elif helper.is_after_reboot():
        # Just verify system is up
        response = api_client.get("/system/ping")
        assert response.status_code == 200
        helper.cleanup()
```

### Example 2: Verify Settings Persist

```python
@pytest.mark.reboot
def test_hostname_persists(api_client):
    helper = RebootTestHelper("test_hostname_persists")

    if helper.is_before_reboot():
        # Change hostname
        new_hostname = "test-reboot-hostname"
        api_client.patch("/network/settings", json={"hostname": new_hostname})

        # Save for verification
        helper.save_state({"hostname": new_hostname})

        # Reboot
        api_client.post("/system/reboot")
        helper.mark_reboot_initiated()
        pytest.skip("Rebooting")

    elif helper.is_after_reboot():
        state = helper.load_state()

        # Verify hostname persisted
        response = api_client.get("/network/settings")
        assert response.json()["hostname"] == state["hostname"]

        helper.cleanup()
```

## Running from CI/CD

```yaml
# GitHub Actions example
- name: Run reboot test
  run: |
    cd tests/api
    ./run-reboot-test.sh mikopbx_php83 test_47_system.py::test_system_reboot
```

## Troubleshooting

### Test stuck after reboot

Check if system came back:
```bash
curl -k http://192.168.107.2:8081/pbxcore/api/v3/system/ping
```

### State file not found after reboot

Check state directory:
```bash
docker exec mikopbx_php83 ls -la /storage/usbdisk1/mikopbx/python-tests/reboot-states/
```

### System didn't reboot

Check logs:
```bash
docker exec mikopbx_php83 tail -f /storage/usbdisk1/mikopbx/log/system/messages
```

## Files

- `helpers/reboot_helper.py` - Helper classes for reboot tests
- `run-reboot-test.sh` - Wrapper script to run from host
- `examples/test_reboot_example.py` - Complete working examples
- `RUNNING_TESTS_INSIDE_MIKOPBX.md` - Full documentation

## Important Notes

- ⚠️ Reboot tests MUST be run from the host machine using `run-reboot-test.sh`
- ⚠️ Running reboot tests directly inside MikoPBX will not work (process dies on reboot)
- ⚠️ State files are stored on `/storage/` which persists across reboots
- ⚠️ Always call `helper.cleanup()` in post-reboot phase to remove state files
- ⚠️ Default timeout for reboot is 5 minutes (configurable in script)

## API for Reboot Helper

```python
# Check test phase
helper.is_before_reboot()  # → True if first run
helper.is_after_reboot()   # → True if state file exists

# Save/load state
helper.save_state({"key": "value"})
state = helper.load_state()  # → {"key": "value"}

# Mark reboot initiated (optional, for tracking)
helper.mark_reboot_initiated()

# Clean up state file after test
helper.cleanup()

# Get list of pending tests (static method)
RebootTestHelper.get_pending_reboot_tests()  # → ["test1", "test2"]
```
