# Call Flow Integration Tests

Integration tests for MikoPBX call scenarios using a separate Asterisk instance.

## Architecture

The framework runs a **second Asterisk process** (port 5062) alongside the production MikoPBX Asterisk (port 5060). Test endpoints register from the test Asterisk to the production PBX, place calls through it, and PHP scripts validate the resulting CDR records.

```
┌─────────────────┐         ┌─────────────────┐
│  Test Asterisk   │  SIP    │  Production PBX  │
│  Port 5062       │◄───────►│  Port 5060       │
│  AMI  5039       │         │  AMI  5038       │
│                  │         │                  │
│  Endpoints:      │         │  Routes calls,   │
│  201, 202, 203   │         │  generates CDR   │
└─────────────────┘         └─────────────────┘
```

### Three Layers

1. **`start.sh`** — Bash orchestrator: swaps production DB with test DB, starts test Asterisk, runs test scripts, restores DB on exit (protected by `trap`)
2. **`TestCallsBase.php`** — PHP base class: origination via `.call` files, CDR clearing, CDR validation with recording file checks via `soxi`
3. **`Scripts/XX-test-name/`** — Individual tests: each defines expected CDR and optional call rules

## Running Tests

```bash
# Run all tests (on the PBX system)
bash tests/Calls/start.sh

# Run specific test (by directory prefix)
bash tests/Calls/start.sh 04

# Run with post-test delay (seconds)
bash tests/Calls/start.sh "" 30
```

### Prerequisites

- MikoPBX running with Asterisk on port 5060
- At least 5 SIP peers and 2 providers configured
- Tools: `sqlite3`, `soxi`, `redis-cli`, `php`

## Test Scenarios

| # | Test | Scenario |
|---|------|----------|
| 00 | make-config-pjsip | Setup: generate PJSIP config, register test endpoints |
| 01 | call-A-to-B | Simple answered call |
| 02 | call-A-to-B-attended-B-to-C | Attended transfer initiated by B (##) |
| 03 | call-A-to-B-attended-A-to-C | Attended transfer initiated by A (##) |
| 04 | call-A-to-B-blind-B-to-C | Blind transfer initiated by B (**) |
| 05 | call-A-to-B-blind-A-to-C | Blind transfer initiated by A (**) |
| 06 | call-A-to-B-pickup-C-to-B | Call pickup by C (*8) |
| 07 | originate-A-to-B | Originate via production PBX |
| 08 | originate-A-to-74952293042 | External originate via production PBX |
| 09 | call-A-to-B-attended-B-to-offNum | Attended transfer to offline endpoint |
| 10 | A-to-conf-B-to-conf | Conference room with two participants |
| 11 | call-A-to-B-attended-B-cancel | Attended transfer cancelled by B |

## Adding a New Test

1. Create directory `Scripts/XX-test-name/`
2. Create `configs/extensions.conf` with test-specific dialplan (use `#include orgn-wait-common.conf` for standard origination context)
3. Create `start.php`:

```php
<?php
use MikoPBX\Tests\Calls\Scripts\TestCallsBase;
require_once __DIR__.'/../TestCallsBase.php';

$sampleCDR = [];
$sampleCDR[] = ['src_num'=>'aNum', 'dst_num'=>'bNum', 'duration'=>'7', 'billsec'=>'5', 'fileDuration'=>'5'];

// Simple test (originateWait):
TestCallsBase::executeTest($sampleCDR);

// Or with rules:
$rules = [
    [TestCallsBase::ACTION_ORIGINATE, 'aNum', 'bNum'],
    [TestCallsBase::ACTION_WAIT, 5],
    [TestCallsBase::ACTION_ORIGINATE, 'cNum', '8'],
];
TestCallsBase::executeTest($sampleCDR, $rules);
```

### CDR Sample Fields

- `src_num`, `dst_num` — Use `'aNum'`, `'bNum'`, `'cNum'`, `'offNum'` as placeholders (resolved at runtime)
- `duration` — Total call duration (±1s tolerance)
- `billsec` — Billed seconds (±1s tolerance)
- `fileDuration` — Recording file duration (±1s tolerance)

### Rule Actions

- `ACTION_ORIGINATE` — Place call via test Asterisk spool
- `ACTION_GENERAL_ORIGINATE` — Place call via production PBX spool
- `ACTION_WAIT` — Sleep N seconds

## Feature Codes

| Code | Function |
|------|----------|
| `##` | Attended transfer |
| `**` | Blind transfer |
| `*8` | Call pickup |
| `*0` | Disconnect |
| `*2` | Park call |

## Troubleshooting

- **"Need 3 SIP account"** — Test endpoints failed to register. Check that test 00 completed and PJSIP endpoints have matching `USER_AGENT`
- **CDR count mismatch** — Calls may not have completed. Check test Asterisk logs in `logs/`
- **Recording file not found** — Verify recording is enabled for test extensions in the test database
- **Database not restored** — The `trap cleanup` in `start.sh` handles EXIT/INT/TERM signals. If the system was killed with SIGKILL, manually restore from `/storage/usbdisk1/mikopbx/tmp/mikopbx.db`
