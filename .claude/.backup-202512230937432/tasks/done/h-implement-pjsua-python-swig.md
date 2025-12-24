---
name: h-implement-pjsua-python-swig
branch: feature/h-implement-pjsua-python-swig
status: completed
created: 2025-11-15
completed: 2025-11-17
---

# Implement PJSUA with Python SWIG Bindings for MikoPBX Testing

## Problem/Goal

Build and integrate PJSUA (PJSIP User Agent) with Python SWIG bindings to enable comprehensive SIP testing for MikoPBX. Current testing uses GoPhone which has limitations:
- Calls don't create CDR records
- Recording files use non-standard naming format
- Limited SIP feature support
- Calls may not properly reach endpoints

PJSUA will provide a robust, feature-complete SIP client for Python tests with capabilities:
- Registration as SIP endpoints
- Making outbound calls
- Answering inbound calls
- Acting as both peer (internal extension) and trunk (provider)
- Full SIP protocol support with proper call flow

## Success Criteria

- [x] PJSUA library compiled with Python SWIG bindings
  - [x] macOS ARM64 build (PJSIP 2.15.1)
  - [x] Linux ARM64 build (PJSIP 2.14.1)
- [x] Python wrapper module created for easy import (`pjsua_helper.py`)
- [x] Can register SIP endpoints programmatically from Python
- [x] Can make outbound calls with authentication (wildcard realm fix)
  - [x] Call flow verified in container (201 → 228)
  - [ ] CDR record creation needs verification
- [x] Can answer inbound calls (auto-answer implemented)
- [ ] Can act as trunk (peer mode working, trunk deferred)
- [x] Integration tests demonstrate core capabilities
  - [x] Authentication test
  - [x] Container call test
- [x] Documentation created
  - [x] macOS build guide
  - [x] Linux container guide

## Context Manifest

### How the Current Testing System Works with GoPhone

#### Test Infrastructure Overview

The MikoPBX test suite (`tests/pycalltests/`) uses GoPhone - a CLI-based SIP softphone written in Go - to test SIP call flows. Tests are written in Python with pytest and use asyncio for concurrent SIP operations. The current workflow is:

**Registration Flow:**
1. Test creates `GoPhoneConfig` dataclass with extension credentials (from `tests/api/fixtures/employee.json`)
2. `GoPhoneManager` spawns subprocess running `gophone answer -register` command
3. GoPhone sends SIP REGISTER to MikoPBX server (hostname from `MIKOPBX_SIP_HOSTNAME` in `.env`, defaults to `{container}-name.dev-docker.orb.local`)
4. Process runs persistently in background maintaining registration via re-REGISTER messages
5. Extension credentials: 201/202/203 with MD5 password hashes stored in fixture JSON

**Call Establishment Flow:**
1. Test creates `GoPhoneEndpoint` with caller credentials
2. Calls `endpoint.dial(destination, dtmf=None)` method
3. Internally spawns subprocess: `gophone dial -ua={ext} -username={ext} -password={pass} -ua_host={server} sip:{dest}@{server}:5060`
4. GoPhone sends SIP INVITE with SDP offer
5. MikoPBX processes through dialplan, routes to destination extension
6. Call establishes (200 OK + ACK), RTP media streams begin
7. For DTMF: uses `-dtmf={digits}` and `-dtmf_delay={seconds}s` flags to send RFC2833 tones during call
8. Process stays alive maintaining call until `.hangup()` called (sends SIP BYE)

**Current GoPhone Limitations:**
- **CDR Records Not Created**: Calls don't generate Call Detail Records in MikoPBX CDR database (`/storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db`), likely because GoPhone doesn't properly complete SIP dialog or Asterisk doesn't recognize channel
- **Recording File Naming**: When recording enabled, files use format `mikopbx-{UNIQUEID}_{HASH}.wav` instead of expected `*-{src}-{dst}-*.wav` pattern that tests search for
- **Routing Issues**: Some tests indicate calls may not reach actual endpoints properly
- **Limited Features**: DTMF only works via `-dtmf` flag at dial time (no interactive sending), codec negotiation unknown, transfer/hold/parking require special handling

**Why This Matters for PJSUA Implementation:**
The new PJSUA wrapper MUST:
1. Maintain same `GoPhoneEndpoint` interface so tests don't need rewriting
2. Create proper SIP dialogs that Asterisk recognizes for CDR generation
3. Use channel variables/headers that trigger standard recording file naming
4. Support interactive DTMF sending (not just at dial time)
5. Provide codec control for negotiation testing
6. Handle blind/attended transfers via SIP REFER or DTMF feature codes

#### Current Test Patterns That Need PJSUA Support

**IVR Navigation Tests** (`test_66_ivr_navigation.py`):
- Scenario: Extension calls IVR menu (500/510), sends DTMF digits (1/2/3), call routes to target extension based on digit
- PJSUA needs: DTMF RFC2833 sending with configurable delays (3-8 seconds after answer), ability to send multiple digits in sequence
- Current approach: `await caller.dial("500", dtmf="2", dtmf_delay=3)` - single call with pre-programmed DTMF
- PJSUA improvement: Allow `await endpoint.send_dtmf("2")` during active call for more realistic testing

**Voicemail Tests** (`test_67_voicemail.py`):
- Scenario: Call unregistered extension, reaches voicemail greeting, leaves message (maintains RTP), voicemail file created
- File location: `/storage/usbdisk1/mikopbx/voicemail/default/{extension}/INBOX/msg*.wav`
- Validation: Uses `audio_validator.py` to check file exists, has audio content (RMS > 0.01), duration > 1 second
- PJSUA needs: Generate actual RTP audio (tone/noise) so voicemail recordings aren't silent, maintain call long enough for greeting + recording

**Call Parking Tests** (`test_68_call_parking.py`):
- Scenario: Ext 201→202 call established, ext 202 performs blind transfer to parking (800), call parked in slot (801), ext 203 dials slot to retrieve
- Feature codes: Blind transfer `**`, parking extension `800`, slots `801-820` (from `general-settings` API)
- PJSUA needs: Send DTMF `**800` during active call, or use SIP REFER for blind transfer, detect call state changes
- Verification: Uses `asterisk_helper.check_parking_lot()` via CLI `parkedcalls show` and `get_bridged_channel()` to verify connections

**Call Recording Tests** (`test_70_call_recording.py`):
- Scenario: Ext 201 (recording enabled in fixture) calls 202, MikoPBX automatically records (MixMonitor), file saved in monitor directory
- Expected path: `/storage/usbdisk1/mikopbx/astspool/monitor/*-201-202-*.wav` (standard naming with src-dst pattern)
- Current issue: GoPhone creates `mikopbx-{UNIQUEID}_{HASH}.wav` - test can't find file
- PJSUA requirement: Use SIP headers/channel variables that trigger standard Asterisk recording naming convention
- Validation: `audio_validator.find_recording_file()` searches by src/dst extension pattern, then validates audio content

**Codec Negotiation Tests** (`test_71_codec_negotiation.py`):
- Scenario: Configure MikoPBX to enable only specific codec (alaw/ulaw/g729/opus), establish call, verify negotiated codec via Asterisk CLI
- API interaction: `feature_codes_helper.disable_all_codecs_except(api_client, ['alaw'])` updates `general-settings`
- Verification: `asterisk_helper.get_channel_codec(channel_id)` parses `pjsip show channelstats` or `core show channel` output
- PJSUA needs: Configurable codec list in SDP offer, ability to restrict to specific codecs for testing, support alaw/ulaw/g729/g722/opus

#### Python Test Infrastructure Details

**Configuration System** (`tests/api/config.py`):
- Single source of truth for all test configuration via `.env` file
- `TestConfig` class loads from `tests/api/.env` with validation
- Key settings:
  - `MIKOPBX_API_URL`: REST API endpoint (e.g., `https://mikopbx-php83.dev-docker.orb.local/pbxcore/api/v3`)
  - `MIKOPBX_CONTAINER`: Docker container name (e.g., `mikopbx_modules-api-refactoring`)
  - `MIKOPBX_SIP_HOSTNAME`: SIP server hostname for registration (defaults to `{container}.dev-docker.orb.local`)
  - Database paths: `/cf/conf/mikopbx.db` (main), `/storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db` (CDR)
  - Storage paths: `/storage/usbdisk1/mikopbx/astspool/monitor` (recordings), `/storage/usbdisk1/mikopbx/voicemail/default/{ext}/INBOX` (voicemail)
- Accessed via singleton: `config = get_config()` then `config.container_name`, `config.sip_hostname`

**Fixtures System** (`tests/pycalltests/conftest.py`):
- Imports fixtures from `tests/api/conftest.py` for consistency
- `api_client` fixture: Authenticated `MikoPBXClient` for REST API calls
- `cdr_baseline` fixture: Captures max CDR ID before test, allows filtering new records created during test
- Extension credentials from `tests/api/fixtures/employee.json`:
  ```python
  TEST_EXTENSIONS = {
      "201": "5b66b92d5714f921cfcde78a4fda0f58",  # Smith James, recording enabled
      "202": "e72b3aea6e4f2a8560adb33cb9bfa5dd",  # Brown Brandon, recording enabled
      "203": "ce4fb0a6a238ddbcd059ecb30f884188",  # Collins Melanie, recording enabled
  }
  ```

**Asterisk Integration** (`tests/pycalltests/helpers/asterisk_helper.py`):
- Executes Asterisk CLI commands via `docker exec {container} asterisk -rx {command}`
- Key functions:
  - `get_active_channels()`: Returns list of active SIP channels with state/context/application
  - `get_channel_codec(channel_id)`: Parses codec from `pjsip show channelstats` or `core show channel`
  - `check_parking_lot()`: Parses `parkedcalls show` to find parked calls with slots/timeouts
  - `get_bridged_channel(channel_id)`: Finds which channel is connected in call
  - `verify_extension_registered(ext)`: Checks if extension has active SIP contact
- All functions use `get_config().container_name` for dynamic container targeting

**Audio Validation** (`tests/pycalltests/helpers/audio_validator.py`):
- `validate_audio_in_container()`: Copies file from container to temp location, analyzes with sox/ffprobe
- Checks: File exists, size > 0, duration >= min_duration, RMS amplitude > silence_threshold (0.01)
- `find_recording_file(container, src, dst)`: Searches monitor directory for pattern `*-{src}-{dst}-*.wav`
- `find_voicemail_file(container, ext)`: Searches `/storage/.../voicemail/default/{ext}/INBOX/msg*.wav`
- Uses sox for accurate RMS calculation, falls back to ffprobe volume detection if sox unavailable

**Feature Codes Helper** (`tests/pycalltests/helpers/feature_codes_helper.py`):
- Queries MikoPBX `general-settings` API endpoint for feature codes configuration
- Returns dict: `{'parking_ext': '800', 'parking_start': '801', 'blind_transfer': '**', 'attended_transfer': '##'}`
- Codec management: `get_enabled_codecs()`, `enable_codec()`, `disable_all_codecs_except()`
- Critical for tests that need to know DTMF codes for parking/transfers/pickup

### For PJSUA Implementation: What Needs to Connect

Since we're replacing GoPhone with PJSUA while maintaining the same test interface, the implementation must integrate at these specific points:

**Interface Compatibility Layer:**

The existing `GoPhoneEndpoint` class (currently in `gophone_helper.py`) serves as the test interface. PJSUA wrapper should implement this same interface:

```python
class GoPhoneEndpoint:  # Or rename to SIPEndpoint, keeping old name for compatibility
    def __init__(self, config: GoPhoneConfig, gophone_path: str = None)
    async def register(self, timeout: int = 10) -> bool
    async def dial(self, destination: str, dtmf: Optional[str] = None, dtmf_delay: int = 3, timeout: int = 30) -> bool
    async def hangup() -> bool
    async def send_dtmf(self, digits: str, delay: int = 8, digit_delay: int = 1) -> bool
    async def start_as_server(self, require_auth: bool = True, timeout: int = 5) -> bool  # For provider simulation
```

The key difference: Instead of spawning `subprocess.Popen(['gophone', 'dial', ...])`, the PJSUA implementation will:
1. Use PJSUA Python SWIG API to create account/endpoint
2. Make call via `pjsua.Account.make_call()`
3. Send DTMF via account/call object methods
4. Track call state through PJSUA callbacks

**SIP Registration Requirements:**

Current registration command: `gophone answer -ua={ext} -username={ext} -password={pass} -l=0.0.0.0:{port} -register {server}:{port}`

PJSUA equivalent needs:
- Account configuration with SIP URI: `sip:{extension}@{sip_hostname}`
- Authentication credentials: username (extension number), password (MD5 hash from fixture)
- Registration refresh: PJSUA handles automatically via account config
- Transport: UDP (default), must support TCP/TLS for some extensions (see fixture `sip_transport` field)
- NAT handling: Set Contact header properly for Docker networking (GoPhone uses `-ua_host` for From header)

**Call Flow Integration Points:**

When test calls `await endpoint.dial("202")`, PJSUA wrapper must:

1. **Pre-call validation**: Check account is registered (PJSUA account status)
2. **Destination formatting**: Convert extension "202" to full SIP URI `sip:202@{server}:5060`
3. **SDP construction**: Offer codecs from configuration, include RTP media description
4. **Call initiation**: Use `pjsua.Account.make_call(dest_uri, pjsua.CallOpParam())`
5. **State tracking**: Monitor callback `on_call_state()` for CONFIRMED state (call answered)
6. **Media handling**: Start RTP transmission (either real audio samples or comfort noise so recordings aren't silent)
7. **DTMF support**: If `dtmf` parameter provided, schedule `call.dial_dtmf(digits)` after `dtmf_delay` seconds
8. **Return control**: Return True when call reaches CONFIRMED state, False on error/timeout

**CDR Record Creation:**

The critical fix GoPhone lacks - PJSUA must ensure CDR records are written:

Current problem: Asterisk doesn't create CDR for GoPhone calls
Root cause: Likely incomplete SIP dialog (missing ACK?) or channel variables not set

PJSUA solution:
1. **Complete SIP dialog**: Ensure INVITE → 200 OK → ACK sequence is complete
2. **Proper User-Agent header**: Include PJSUA version string that Asterisk recognizes
3. **Channel variables**: May need custom SIP headers like `X-CDR-Variables` if supported
4. **Call duration**: Maintain call long enough for Asterisk to generate billsec/duration > 0
5. **Graceful hangup**: Send BYE with Reason header, wait for 200 OK response

Verification after test runs: `SELECT * FROM cdr WHERE src = '201' AND dst = '202' ORDER BY id DESC LIMIT 1`

**Recording File Naming:**

Current GoPhone creates: `mikopbx-{UNIQUEID}_{HASH}.wav`
Expected format: `{YYYYMMDD}/{UNIQUEID}-{src}-{dst}-{timestamp}.wav`

The naming is controlled by Asterisk MixMonitor dialplan application. PJSUA must:
1. Use standard PJSIP channel technology (appears as `PJSIP/201-00000001` in Asterisk)
2. Ensure channel variables `CDR(src)` and `CDR(dst)` are populated correctly
3. Not use custom User-Agent that triggers special recording logic in Asterisk dialplan
4. Possibly: Send Remote-Party-ID or P-Asserted-Identity headers with extension info

The recording file search in tests: `find /storage/.../monitor -name '*-201-202-*.wav'` must succeed

**DTMF Implementation:**

GoPhone approach: Can only send DTMF at dial time via `-dtmf={digits} -dtmf_delay={delay}s`
PJSUA improvement: Interactive sending during active call

Requirements:
1. **RFC2833 support**: PJSUA must negotiate telephone-event in SDP (`a=rtpmap:101 telephone-event/8000`)
2. **Sending method**: `pjsua.Call.dial_dtmf(digits)` or `call.send_dtmf_info(digit)` for SIP INFO
3. **Timing**: Tests expect 3-8 second delays after call answer, digits sent sequentially with 100-500ms gaps
4. **Mode configuration**: Support `sip_dtmfmode` from fixture: `auto`, `rfc4733`, `info`, `inband`, `auto_info`
5. **Verification**: Asterisk dialplan must receive digits (check via `core show channel {channel}` - application data)

**Codec Negotiation:**

Tests manipulate enabled codecs via API, then verify call uses expected codec:

`disable_all_codecs_except(api_client, ['alaw'])` → Establish call → `get_channel_codec()` returns "alaw"

PJSUA requirements:
1. **Dynamic codec list**: Before `make_call()`, configure account codec priorities to match test requirements
2. **Codec API**: `pjsua.CodecInfo` and `pjsua.codec_set_priority(codec_id, priority)`
3. **Common codecs**: alaw (PCMA), ulaw (PCMU), g729, g722, opus must be available in PJSUA build
4. **Priority mapping**: Test priority 0 (highest) should map to PJSUA priority 255
5. **SDP verification**: Offer codecs in correct priority order in SDP offer
6. **Fallback handling**: If only g729 enabled but PJSUA build lacks it, call should fail gracefully (return False from `dial()`)

**Provider Simulation (Trunk Testing):**

Method `start_as_server()` simulates external SIP provider:

```python
await provider.start_as_server(require_auth=True)  # Provider with digest auth
await provider.start_as_server(require_auth=False)  # IP-based trunk (no auth)
```

PJSUA implementation:
1. **SIP server mode**: Not typical PJSUA usage (designed for UAC/client), may need alternative approach
2. **Alternative 1**: Use PJSUA to register to MikoPBX as provider trunk, let MikoPBX route calls to it
3. **Alternative 2**: Run separate PJSUA instance in UAS (server) mode accepting incoming calls
4. **Authentication**: If `require_auth=True`, challenge with 401/407 Proxy-Authenticate
5. **Call acceptance**: Auto-answer incoming INVITE with 200 OK, establish media

This is lowest priority - most tests focus on peer-to-peer (extension to extension) calling.

**Async/Await Integration:**

All test methods are async: `async def test_01_...(api_client, gophone_manager)`

PJSUA is callback-based (C library), not natively async. Wrapper must bridge:

1. **Account registration**: `async def register()` must:
   - Call `pjsua.Account.register()`
   - Wait for callback `on_reg_state()`
   - Use `asyncio.Future` to await registration completion
   - Return True/False based on callback result

2. **Call establishment**: `async def dial()` must:
   - Call `pjsua.Call.make_call()`
   - Wait for callback `on_call_state()` with state CONFIRMED
   - Use `asyncio.Future` to await call answer
   - Handle timeout (return False if no answer within timeout seconds)

3. **DTMF sending**: `async def send_dtmf()` must:
   - Schedule DTMF sequence with delays
   - Use `asyncio.sleep()` for digit spacing
   - Return after all digits sent

4. **Thread safety**: PJSUA callbacks execute in PJSUA thread, must use `loop.call_soon_threadsafe()` to interact with asyncio event loop

### Technical Reference Details

#### PJSUA Python SWIG API Key Components

**Initialization Sequence:**
```python
import pjsua as pj

# 1. Create library instance
lib = pj.Lib()

# 2. Initialize library
ua_cfg = pj.UAConfig()
ua_cfg.user_agent = "MikoPBX-TestClient/1.0"
media_cfg = pj.MediaConfig()
media_cfg.clock_rate = 8000  # Or 16000 for wideband
lib.init(ua_cfg=ua_cfg, media_cfg=media_cfg)

# 3. Create transport
transport_cfg = pj.TransportConfig()
transport_cfg.port = 0  # Random port
transport = lib.create_transport(pj.TransportType.UDP, transport_cfg)

# 4. Start library
lib.start()

# 5. Create account
acc_cfg = pj.AccountConfig()
acc_cfg.id = "sip:201@mikopbx-server.local"
acc_cfg.reg_uri = "sip:mikopbx-server.local"
acc_cfg.cred_info = [pj.AuthCred("*", "201", "5b66b92d5714f921cfcde78a4fda0f58")]
account = lib.create_account(acc_cfg)
```

**Account Interface:**
- `account.set_registration(renew: bool)`: Enable/disable registration
- `account.make_call(dest_uri: str, call_param: CallOpParam)`: Initiate call
- `account.info()`: Get account status (registration state, etc.)

**Call Interface:**
- `call.answer(status_code: int, reason: str)`: Answer incoming call
- `call.hangup(status_code: int, reason: str)`: Terminate call
- `call.dial_dtmf(digits: str)`: Send DTMF tones
- `call.send_request(method: str, msg_data: MsgData)`: Send SIP request (REFER for transfer)
- `call.info()`: Get call state, media state, codec info

**Callback Interface (AccountCallback):**
```python
class AccountCallback(pj.AccountCallback):
    def on_reg_state(self):
        # Called when registration state changes
        acc_info = self.account.info()
        if acc_info.reg_status == 200:
            # Registered successfully
            pass

    def on_incoming_call(self, call):
        # Called when receiving incoming call
        call.answer(200)
```

**Callback Interface (CallCallback):**
```python
class CallCallback(pj.CallCallback):
    def on_state(self):
        # Called when call state changes
        if self.call.info().state == pj.CallState.CONFIRMED:
            # Call answered
            pass
        elif self.call.info().state == pj.CallState.DISCONNECTED:
            # Call ended
            pass

    def on_media_state(self):
        # Called when media state changes
        if self.call.info().media_state == pj.MediaState.ACTIVE:
            # Media active, connect to sound device
            call_info = self.call.info()
            for mi in call_info.media:
                if mi.type == pj.MediaType.AUDIO and mi.status == pj.MediaState.ACTIVE:
                    media = self.call.get_media(mi.index)
                    # Connect to sound device or WAV player
```

#### Codec Management:
```python
# List available codecs
for codec in lib.enum_codecs():
    print(f"{codec.codec_id}: priority={codec.priority}")

# Set codec priority (0-255, 0=disabled, 255=highest)
lib.codec_set_priority("PCMA/8000", 255)  # alaw
lib.codec_set_priority("PCMU/8000", 0)    # ulaw disabled
lib.codec_set_priority("opus/48000/2", 200)
```

#### Media Handling (Audio Playback):
```python
# Create WAV player for audio playback
player = lib.create_player("test_audio.wav", loop=True)

# Connect player to call
media = call.get_media(0)
media.start_transmit(player)
```

#### DTMF Sending:
```python
# RFC2833 (preferred)
call.dial_dtmf("1234")

# SIP INFO method
for digit in "1234":
    msg_data = pj.MsgData()
    msg_data.content_type = "application/dtmf-relay"
    msg_data.msg_body = f"Signal={digit}\r\nDuration=160"
    call.send_request("INFO", msg_data)
    await asyncio.sleep(0.5)
```

#### Configuration Requirements

**Build Dependencies:**
- PJSIP library with Python SWIG bindings (pjsua-py)
- Codecs: Include alaw, ulaw, g722 (free), optionally g729/opus (may need separate codec packages)
- Platform: macOS darwin-arm64 (same as current GoPhone binary location)

**Installation Paths:**
- Binary location: `tests/pycalltests/bin/darwin-arm64/` (alongside GoPhone)
- Or system-wide: Install via pip if PJSUA Python package available
- Wrapper module: `tests/pycalltests/pjsua_helper.py` (mirrors `gophone_helper.py` structure)

**Environment Variables (already configured):**
- `MIKOPBX_SIP_HOSTNAME`: Used for registration URI
- `MIKOPBX_CONTAINER`: Used for Asterisk CLI validation commands
- Extension credentials from `tests/api/fixtures/employee.json`

#### File Locations

**Implementation:**
- Primary wrapper: `tests/pycalltests/pjsua_helper.py`
- Account/Call callback classes in same file or separate `pjsua_callbacks.py`
- Compatibility shim (if needed): `tests/pycalltests/gophone_helper.py` imports from pjsua_helper

**Test Modifications:**
- Minimal changes needed if interface preserved
- Update imports: `from pjsua_helper import GoPhoneManager, GoPhoneEndpoint`
- Or rename classes: `PJSUAManager`, `PJSUAEndpoint` and update all test files

**Build Scripts:**
- Compilation script (if building from source): `tests/pycalltests/build_pjsua.sh`
- PJSIP config: `tests/pycalltests/pjsip_config.py` (codec list, media settings)

**Documentation:**
- Usage guide: `tests/pycalltests/README_PJSUA.md`
- Migration notes: Document GoPhone → PJSUA interface changes
- Build instructions: Platform-specific compilation steps for macOS ARM64

#### Known Issues to Address

**GoPhone Problems PJSUA Must Fix:**
1. ✅ CDR record creation - Complete SIP dialog properly
2. ✅ Recording file naming - Use standard channel naming
3. ✅ Interactive DTMF - Not just at dial time
4. ✅ Codec control - Dynamic codec prioritization
5. ✅ Call parking/transfer - Proper SIP REFER or DTMF feature codes

**PJSUA Specific Challenges:**
1. ⚠️ Thread safety - Callbacks in PJSUA thread, tests use asyncio
2. ⚠️ Audio generation - Need RTP audio for voicemail testing (not silence)
3. ⚠️ Server mode - Provider simulation may need alternative approach
4. ⚠️ NAT/Docker networking - Contact header rewriting for containerized MikoPBX
5. ⚠️ Build complexity - Compiling PJSUA with Python bindings on macOS ARM64

**Testing Validation Points:**
1. After registration: Verify via `asterisk_helper.verify_extension_registered('201')`
2. After call: Query CDR database for new record with correct src/dst
3. After recording: Use `audio_validator.find_recording_file()` with standard naming pattern
4. After codec test: Verify via `asterisk_helper.get_channel_codec()` matches expected
5. After parking: Check `asterisk_helper.check_parking_lot()` for parked calls

### Summary: Interface to Maintain

The PJSUA implementation must provide these exact methods to avoid rewriting 20+ test files:

```python
# Manager class (creates/manages multiple endpoints)
class GoPhoneManager:  # Or PJSUAManager
    def __init__(self, server_ip: str, gophone_path: str = None)
    async def create_endpoint(self, extension: str, password: str, auto_register: bool = True) -> GoPhoneEndpoint
    async def cleanup_all(self)

# Endpoint class (individual SIP endpoint/account)
class GoPhoneEndpoint:  # Or PJSUAEndpoint
    def __init__(self, config: GoPhoneConfig, gophone_path: str = None)
    async def register(self, timeout: int = 10) -> bool
    async def dial(self, destination: str, dtmf: Optional[str] = None, dtmf_delay: int = 3, timeout: int = 30) -> bool
    async def hangup(self) -> bool
    async def send_dtmf(self, digits: str, delay: int = 8, digit_delay: int = 1) -> bool
    async def start_as_server(self, require_auth: bool = True, timeout: int = 5) -> bool
    async def wait_for_call(self, timeout: int = 30) -> bool

# Config dataclass (credentials and settings)
@dataclass
class GoPhoneConfig:  # Or PJSUAConfig
    extension: str
    password: str
    server_ip: str
    server_port: int = 5060
    transport: str = "udp"
    listen_ip: str = "0.0.0.0"
    listen_port: int = 0
    media: Optional[str] = None
```

Implementation differences (internal only):
- GoPhone: Spawns subprocess, parses stdout/stderr
- PJSUA: Uses Python API, callbacks, asyncio integration

Tests remain unchanged if interface preserved.

## User Notes

### Current Testing Infrastructure
- Tests located in: `tests/pycalltests/`
- SIP library: PJSUA2 (PJSIP 2.15.1 macOS, 2.14.1 Linux ARM64)
- Helper module: `pjsua_helper.py`
- Library locations:
  - macOS: `tests/pycalltests/pjsua2_lib/`
  - Linux: `tests/pycalltests/pjsua2_lib_linux/`
- Test extensions: 201, 202, 203 (credentials in `tests/api/fixtures/employee.json`)

### Implementation Complete
- ✅ PJSUA2 compiled for both macOS and Linux ARM64
- ✅ Authentication working (wildcard realm "*" pattern)
- ✅ Successful calls verified inside MikoPBX container
- ✅ Build and deployment infrastructure in place
- ✅ Comprehensive documentation

### PJSUA2 Features Implemented
- ✅ SIP REGISTER with digest authentication
- ✅ SIP INVITE (outbound calls with auto-authentication)
- ✅ SIP answer (inbound calls with auto-answer)
- ✅ Media handling (null device for containers)
- ⚠️ DTMF RFC2833 (available but untested)
- ⚠️ Multiple codecs support (available but untested)
- ⏳ Call transfer (deferred to future tasks)

### Known Limitations
- CDR record creation not yet verified
- GoPhone test migration incomplete
- Advanced features (DTMF, parking, transfers) untested
- Resource cleanup improvements needed (see task h-fix-pjsua2-resource-leaks)

## Work Log

### 2025-11-15

#### Completed
- Task created - identified need to replace GoPhone with PJSUA for proper SIP testing
- Analyzed GoPhone limitations: no CDR records, non-standard recording file naming, limited feature support

### 2025-11-17

#### Completed
- **PJSUA2 Library Compilation**
  - macOS ARM64: Compiled PJSIP 2.15.1 for local development (`pjsua2_lib/`)
  - Linux ARM64: Compiled PJSIP 2.14.1 for MikoPBX container using Docker multi-stage build
  - Created build infrastructure: `Dockerfile.pjsua2-builder`, `build-pjsua2.sh`, `build-and-copy.sh`

- **Python Helper Module**
  - Implemented `pjsua_helper.py` with async API for SIP operations
  - Event-driven architecture using callbacks + polling hybrid
  - Auto-answer capability for incoming calls
  - Clean abstraction over PJSUA2 C++ interface

- **Critical Authentication Fix**
  - **Problem Discovered**: PJSUA2 authenticated REGISTER but not INVITE requests
  - **Root Cause**: Hardcoded realm "asterisk" didn't match wildcard authentication challenges
  - **Solution**: Changed `AuthCredInfo` realm from "asterisk" to wildcard "*"
  - **Result**: PJSUA2 now auto-authenticates ALL SIP requests (REGISTER, INVITE, etc.)
  - Reference: Stack Overflow https://stackoverflow.com/questions/43359386/

- **Verification Tests**
  - Created `test_pjsua_auth_fix.py` - confirmed Authorization headers in INVITE
  - Created `call_201_to_228_container.py` - successful call inside MikoPBX container
  - Verified complete call flow: INVITE → 401 → re-INVITE with auth → CONFIRMED → DISCONNECTED

- **Documentation**
  - `README.md` - macOS build and usage guide
  - `README_LINUX_BUILD.md` - Linux container build and deployment guide
  - `REFACTORING_SUMMARY.md` - Implementation notes

- **Code Review and Cleanup**
  - Reorganized directory structure to `bin/pjsua2/` for cleaner organization
  - Identified resource management issues for follow-up task
  - Removed all GoPhone dependencies from test infrastructure
  - Created follow-up task h-fix-pjsua2-resource-leaks for identified issues:
    - 3 critical issues (library cleanup, transport shutdown, thread safety)
    - 5 warnings (memory leaks, missing destructors, error handling gaps)

#### Decisions
- Use wildcard realm "*" pattern for universal authentication (well-established PJSUA2 best practice)
- Platform-specific builds required: macOS libraries (.dylib) incompatible with Linux containers
- Use Docker multi-stage builds for clean Linux ARM64 compilation environment
- Use `setNullDev()` for container testing to avoid ALSA audio device errors
- Defer CDR verification and full test migration to follow-up tasks

#### Discovered
- **Authentication Insight**: PJSUA2 auto-authenticates REGISTER but requires wildcard realm for INVITE authentication
- **Traffic Analysis**: Compared working softphone (Telephone 1.6) vs PJSUA2 packet captures to identify auth issue
- **Build Timing**: Linux ARM64 PJSIP compilation takes ~5 minutes on Apple Silicon
- **Container Dependencies**: All required libraries (libopus, libspeex, libsrtp) available in MikoPBX container
- **Resource Management**: PJSUA2 requires careful cleanup sequence (calls → accounts → transports → library)

#### Next Steps
- Address resource leaks and cleanup issues (task h-fix-pjsua2-resource-leaks created)
- Verify CDR record creation for PJSUA calls
- Migrate existing GoPhone tests to use PJSUA helper
- Test advanced features: codec negotiation, DTMF, parking, transfers, voicemail
- Performance testing with multiple concurrent calls
