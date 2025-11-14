# MikoPBX Call Testing Framework: GoPhone + CipBX

Complete guide for automated SIP call testing in MikoPBX using GoPhone (SIP softphone) and CipBX (SIP provider simulator).

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Installation](#installation)
- [Usage](#usage)
- [Python Integration](#python-integration)
- [Testing Guide](#testing-guide)
- [Debugging & Troubleshooting](#debugging--troubleshooting)

## Overview

This testing framework provides realistic end-to-end SIP call testing through two specialized tools:

- **GoPhone**: CLI SIP softphone for endpoint/extension simulation
- **CipBX**: SIP provider/trunk simulator with echo server functionality

### Why Both Tools?

Previously, gophone was used for both provider and extension simulation, which had limitations:

1. **Unrealistic Scenarios**: Same tool for both sides didn't represent real-world behavior
2. **Limited Testing**: Couldn't properly test provider authentication and routing
3. **Container Constraints**: Provider needed to be accessible from MikoPBX container

**New architecture benefits:**

- Realistic separation of provider (cipbx in container) and endpoint (gophone on host)
- Better debugging with separate logs
- Industry-standard echo server for audio testing
- Proper authentication testing

## Architecture

### Component Roles

```
┌──────────────┐         ┌─────────────┐         ┌──────────────┐
│   GoPhone    │         │  MikoPBX    │         │    CipBX     │
│  (Endpoint)  │         │  Container  │         │  (Provider)  │
│  Host System │         │             │         │  Container   │
└──────┬───────┘         └──────┬──────┘         └──────┬───────┘
       │  REGISTER              │                        │
       │───────────────────────>│                        │
       │                        │                        │
       │  INVITE to provider    │  INVITE                │
       │───────────────────────>│───────────────────────>│
       │                        │                        │
       │  ═══════════ RTP Echo Media Stream ════════════>│
       │                        │                        │
```

**GoPhone** - SIP Endpoint Simulator:
- Runs on host system
- Simulates softphone/extension behavior
- Handles registration, calls, DTMF
- Supports multiple transports (UDP, TCP, TLS, WebSocket)

**CipBX** - SIP Provider Simulator:
- Runs inside mikopbx-php83 container
- Simulates external provider/trunk
- Provides echo server for audio testing
- Supports digest authentication
- Auto-hangup timeout capabilities

## Installation

### Binary Organization

```
tests/pycalltests/
├── bin/
│   ├── darwin-arm64/     # macOS ARM64 (Apple Silicon)
│   │   ├── gophone       # 12 MB - SIP softphone
│   │   └── cipbx         # 9 MB - SIP provider (for local testing)
│   └── linux-arm64/      # Linux ARM64
│       └── cipbx         # 8 MB - For mikopbx-php83 container
├── gophone_helper.py     # Python wrapper for gophone
├── cipbx_helper.py       # Python wrapper for cipbx
└── README.md             # This file
```

### 1. Install GoPhone

**Automatic Installation:**

```bash
cd /Users/nb/PhpstormProjects/mikopbx/Core/tests/pycalltests
chmod +x install-gophone.sh
./install-gophone.sh
```

**Manual Installation:**

```bash
# Download for macOS ARM64
curl -L https://github.com/emiago/gophone/releases/latest/download/gophone-darwin-arm64 -o gophone
chmod +x gophone

# Or build from source (requires Go 1.21+)
git clone https://github.com/emiago/gophone.git /tmp/gophone_source
cd /tmp/gophone_source
go build -o gophone ./cmd/gophone
cp gophone /Users/nb/PhpstormProjects/mikopbx/Core/tests/pycalltests/
```

**Verify:**
```bash
./gophone --help
```

### 2. Install CipBX

**Automatic Installation:**

CipBX is automatically copied to the container when running tests via `cipbx_helper.py::install_cipbx_to_container()`.

**Rebuilding CipBX:**

```bash
# Requirements: Go 1.24.6+ (tested with Go 1.25.4)
git clone https://github.com/arthur-s/cipbx.git /tmp/cipbx_source
cd /tmp/cipbx_source
go mod tidy

# Build for macOS ARM64
go build -o bin/darwin-arm64/cipbx ./cmd/cipbx

# Build for Linux ARM64 (container)
docker run --rm -v $(pwd):/build -w /build golang:1.23 \
  go build -o bin/linux-arm64/cipbx ./cmd/cipbx
```

### 3. Install Python Dependencies

```bash
pip3 install pytest pytest-asyncio
```

## Usage

### GoPhone - SIP Endpoint

GoPhone supports multiple operation modes:

#### 1. Register Mode

Simple registration without answering calls:

```bash
./gophone register -username=201 -password=<pass> 192.168.107.3:5060
```

#### 2. Answer Mode

Register and automatically answer incoming calls:

```bash
./gophone answer -ua=201 -username=201 -password=<pass> \
  -l 0.0.0.0:0 -register "192.168.107.3:5060"
```

**Parameters:**
- `-ua=201` - User Agent (sets From URI to 201@server)
- `-username=201` - SIP authentication username
- `-password=<pass>` - SIP password
- `-l 0.0.0.0:0` - Listen address (port 0 = random)
- `-register "IP:PORT"` - SIP server (no sip: prefix)

#### 3. Dial Mode

Make outbound call:

```bash
./gophone dial -ua=201 -username=201 -password=<pass> \
  sip:202@192.168.107.3:5060
```

With media options:

```bash
# Log RTP media (for testing)
./gophone dial -media=log sip:202@192.168.107.3:5060

# Play audio file
./gophone dial -media=audio sip:202@192.168.107.3:5060

# Use microphone
./gophone dial -media=mic sip:202@192.168.107.3:5060
```

#### 4. Advanced Features

**DTMF Tones:**
```bash
./gophone dial -dtmf=123 -dtmf_delay=2s -dtmf_digit_delay=500ms \
  sip:202@server:5060
```

**Call Recording:**
```bash
./gophone dial -record=test.wav sip:202@192.168.107.3:5060
```

**Interactive Mode:**
```bash
echo "wait=3s; dtmf=79; hangup;" | ./gophone dial -i -media=speaker \
  sip:demo@server:5060
```

### CipBX - SIP Provider

#### Basic Provider (No Auth)

```bash
# Inside container
docker exec -d mikopbx-php83 /tmp/cipbx -l 0.0.0.0 -p 5070
```

#### Provider with Authentication

```bash
docker exec -d mikopbx-php83 /tmp/cipbx -l 0.0.0.0 -p 5070 \
  -u testuser -w testpass
```

#### Provider with Auto-Hangup

```bash
# Auto-hangup after 60 seconds
docker exec -d mikopbx-php83 /tmp/cipbx -l 0.0.0.0 -p 5070 -t 60
```

#### Multiple Transports

```bash
# TCP transport
docker exec -d mikopbx-php83 /tmp/cipbx -l 0.0.0.0 -p 5070 --transport tcp
```

### Environment Variables

GoPhone supports debugging variables:

| Variable | Values | Description |
|----------|--------|-------------|
| `LOG_LEVEL` | debug, info, error | Log verbosity |
| `LOG_FORMAT` | json, console | Log format |
| `SIP_DEBUG` | (any value) | Enable SIP message logging |
| `RTP_DEBUG` | (any value) | Enable RTP traffic logging |
| `RTCP_DEBUG` | (any value) | Enable RTCP traffic logging |

Example:
```bash
export LOG_LEVEL=debug
export SIP_DEBUG=1
./gophone answer -ua=201 -username=201 -password=<pass> -register "192.168.107.3:5060"
```

## Provider Registration Testing

### Understanding Registration Types

When testing SIP provider/trunk registration in MikoPBX, it's critical to understand the difference between registration types:

#### Inbound Registration
- **Direction**: External client → MikoPBX
- **Use Case**: Remote softphones, extensions, or providers registering ON your MikoPBX
- **REST API**: `registration_type: "inbound"`
- **Example**: A remote softphone connecting to your PBX

#### Outbound Registration
- **Direction**: MikoPBX → External provider
- **Use Case**: Your MikoPBX registering ON an external SIP trunk/provider
- **REST API**: `registration_type: "outbound"`
- **Example**: Registering to a VoIP carrier for outbound calling

### Docker Networking for Provider Tests

**IMPORTANT**: When testing provider registration where MikoPBX (in container) needs to connect to services on the host:

❌ **WRONG**: Using `127.0.0.1` or `localhost`
```python
provider_data = {
    "host": "127.0.0.1",  # Won't work! This points to container, not host
    "port": 5070
}
```

✅ **CORRECT**: Using `host.docker.internal` IP
```python
from gophone_helper import get_host_ip_for_container

# Get host IP accessible from container
host_ip = await get_host_ip_for_container()  # Returns: 0.250.250.254 on macOS

provider_data = {
    "host": host_ip,  # Correct! Container can reach host services
    "port": 5070
}
```

### Network Address Resolution

The helper function `get_host_ip_for_container()` resolves `host.docker.internal` from inside the MikoPBX container:

```python
from gophone_helper import get_host_ip_for_container, get_mikopbx_ip

# Get container IP (for host → container connections)
mikopbx_ip = await get_mikopbx_ip()
# Returns: 192.168.107.3 (container IP in Docker network)

# Get host IP (for container → host connections)
host_ip = await get_host_ip_for_container()
# Returns: 0.250.250.254 (host.docker.internal IP on macOS)
```

### Complete Provider Registration Example

```python
from gophone_helper import get_host_ip_for_container
from cipbx_helper import CipBXConfig, CipBXProvider
from conftest import MikoPBXClient

# Step 1: Start CipBX provider on HOST
cipbx_config = CipBXConfig(
    listen_ip="0.0.0.0",
    listen_port=5070,
    username="trunk_user",
    password="trunk_pass123"
)
cipbx_provider = CipBXProvider(cipbx_config, cipbx_path="./cipbx")
await cipbx_provider.start()

# Step 2: Get host IP accessible from container
host_ip = await get_host_ip_for_container()  # e.g., 0.250.250.254

# Step 3: Create provider in MikoPBX via REST API
api_client = MikoPBXClient(api_url, username, password)
api_client.authenticate()

provider_data = {
    "type": "sip",
    "registration_type": "outbound",  # MikoPBX registers TO provider
    "host": host_ip,  # Use host IP, NOT 127.0.0.1!
    "port": 5070,
    "username": "trunk_user",
    "secret": "trunk_pass123",
    "transport": "udp",
    "disabled": False
}

response = api_client.post('sip-providers', provider_data)
provider_id = response['data']['id']

# Step 4: Wait for registration
await asyncio.sleep(10)

# Step 5: Verify registration via Asterisk CLI
# docker exec mikopbx-php83 asterisk -rx "pjsip show registrations"
# Should show: Registered (exp. XXXs)
```

### Common Mistakes

1. **Wrong Registration Type**:
   ```python
   # ❌ WRONG: For trunk registration
   "registration_type": "inbound"  # This is for clients registering TO MikoPBX

   # ✅ CORRECT: For trunk registration
   "registration_type": "outbound"  # MikoPBX registers TO external provider
   ```

2. **Wrong Host Address**:
   ```python
   # ❌ WRONG: Container can't reach host via 127.0.0.1
   "host": "127.0.0.1"

   # ✅ CORRECT: Use host.docker.internal IP
   host_ip = await get_host_ip_for_container()
   "host": host_ip  # e.g., 0.250.250.254
   ```

3. **CipBX Location**:
   ```python
   # ✅ CORRECT: CipBX runs on HOST (not in container)
   cipbx_provider = CipBXProvider(config, cipbx_path="./bin/darwin-arm64/cipbx")
   await cipbx_provider.start()  # Runs locally on host
   ```

### Verification Commands

```bash
# Check PJSIP registrations from host
docker exec mikopbx-php83 asterisk -rx "pjsip show registrations"

# Expected output for successful registration:
# SIP-TRUNK-XXXXX-REG/sip:0.250.250.254:5070  ...  Registered  (exp. 102s)

# Check if CipBX is running on host
ps aux | grep cipbx

# Test connectivity from container to host
docker exec mikopbx-php83 ping -c 2 0.250.250.254
```

## Python Integration

### GoPhone Helper

#### GoPhoneConfig

```python
from gophone_helper import GoPhoneConfig

config = GoPhoneConfig(
    extension="201",
    password="pass123",
    server_ip="192.168.107.3",
    server_port=5060,
    transport="udp",
    listen_ip="0.0.0.0",
    listen_port=0,
    media="log"  # Options: audio, mic, speaker, log, none
)
```

#### GoPhoneEndpoint

```python
from gophone_helper import GoPhoneEndpoint, GoPhoneConfig

config = GoPhoneConfig(extension="201", password="pass123", server_ip="192.168.107.3")
endpoint = GoPhoneEndpoint(config, gophone_path="./gophone")

# Register and answer calls
await endpoint.register()

# Make outbound call
await endpoint.dial("202")
await asyncio.sleep(10)
await endpoint.hangup()

# Cleanup
await endpoint.unregister()
```

#### GoPhoneManager

```python
from gophone_helper import GoPhoneManager

manager = GoPhoneManager(server_ip="192.168.107.3", gophone_path="./gophone")

# Create and auto-register endpoints
ext201 = await manager.create_endpoint("201", "pass123", auto_register=True)
ext202 = await manager.create_endpoint("202", "pass456", auto_register=True)

# Make call
await ext201.dial("202")
await asyncio.sleep(5)
await ext201.hangup()

# Cleanup
await manager.cleanup_all()
```

### CipBX Helper

#### CipBXManager

```python
from cipbx_helper import CipBXManager, CipBXConfig

manager = CipBXManager(cipbx_path="/tmp/cipbx")

# Create provider without authentication
provider1 = await manager.create_provider(port=5070)

# Create provider with authentication
provider2 = await manager.create_provider(
    port=5071,
    username="trunk_user",
    password="trunk_pass",
    timeout=60  # Auto-hangup after 60s
)

# Check status
status = await provider1.get_status()
# {"running": True, "port": 5070, "auth_enabled": False}

# Stop provider
await provider1.stop()
```

## Testing Guide

### Test Structure

```python
import pytest
from gophone_helper import GoPhoneConfig, GoPhoneEndpoint
from cipbx_helper import CipBXManager

@pytest.mark.asyncio
async def test_registration(mikopbx_ip):
    """Test basic SIP registration"""
    config = GoPhoneConfig(
        extension="201",
        password="5b66b92d5714f921cfcde78a4fda0f58",
        server_ip=mikopbx_ip
    )

    endpoint = GoPhoneEndpoint(config, gophone_path="./gophone")
    success = await endpoint.register()

    assert success, "Registration should succeed"
    assert endpoint.is_registered

    await endpoint.unregister()

@pytest.mark.asyncio
async def test_call_to_provider(cipbx_manager, gophone_endpoint):
    """Test call from extension to provider"""
    # Start provider
    provider = await cipbx_manager.create_provider(port=5070)

    # Register endpoint
    await gophone_endpoint.register()

    # Make call to provider
    await gophone_endpoint.dial("echo")
    await asyncio.sleep(5)
    await gophone_endpoint.hangup()

    # Cleanup
    await provider.stop()
```

### Fixtures

```python
@pytest.fixture
async def mikopbx_ip():
    """Get MikoPBX container IP"""
    result = subprocess.run(
        ["docker", "inspect", "-f", "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}", "mikopbx-php83"],
        capture_output=True, text=True
    )
    return result.stdout.strip()

@pytest.fixture
async def cipbx_manager():
    """Create CipBX manager"""
    manager = CipBXManager(cipbx_path="/tmp/cipbx")
    yield manager
    await manager.cleanup_all()

@pytest.fixture
async def gophone_manager(mikopbx_ip):
    """Create GoPhone manager"""
    manager = GoPhoneManager(server_ip=mikopbx_ip, gophone_path="./gophone")
    yield manager
    await manager.cleanup_all()
```

### Running Tests

```bash
cd /Users/nb/PhpstormProjects/mikopbx/Core/tests/pycalltests

# Run all tests
pytest -v -s

# Run specific test file
pytest test_cipbx_gophone_integration.py -v -s

# Run specific test
pytest test_cipbx_gophone_integration.py::TestCipBXGoPhoneIntegration::test_03_gophone_to_cipbx_call -v -s

# Run registration tests only
pytest test_gophone_registration.py -v -s

# Run call tests only
pytest test_gophone_calls.py -v -s
```

## Debugging & Troubleshooting

### Check Processes

```bash
# Check cipbx in container
docker exec mikopbx-php83 pgrep -f "cipbx.*5070"

# Check gophone on host
ps aux | grep gophone
```

### View Logs

**CipBX Logs:**
```bash
# Run in foreground for debugging
docker exec -it mikopbx-php83 /tmp/cipbx -l 0.0.0.0 -p 5070
```

**Asterisk Logs:**
```bash
# Enable PJSIP logging
docker exec mikopbx-php83 asterisk -rx "pjsip set logger on"

# Tail Asterisk messages
docker exec mikopbx-php83 tail -f /storage/usbdisk1/mikopbx/log/asterisk/messages
```

**GoPhone with Debug:**
```bash
export LOG_LEVEL=debug
export SIP_DEBUG=1
export RTP_DEBUG=1
./gophone answer -ua=201 -username=201 -password=<pass> -register "192.168.107.3:5060"
```

### Common Issues

#### Registration Fails

1. Verify extension exists:
   ```bash
   docker exec mikopbx-php83 asterisk -rx "pjsip show endpoint 201"
   ```

2. Check password from API or database

3. Always use `-ua` parameter to set proper From URI

#### Call Not Connecting

1. Verify cipbx is running:
   ```bash
   docker exec mikopbx-php83 pgrep -f cipbx
   ```

2. Check MikoPBX outbound routes for provider

3. Test direct call:
   ```bash
   ./gophone dial sip:echo@192.168.107.3:5070
   ```

#### Port Already in Use

```bash
# Check port
docker exec mikopbx-php83 netstat -lntp | grep 5070

# Kill existing process
docker exec mikopbx-php83 pkill -f "cipbx.*5070"
```

#### Async Test Hangs

1. Ensure pytest-asyncio is installed
2. Use `@pytest.mark.asyncio` decorator
3. Clean up gophone processes:
   ```bash
   killall gophone
   ```

## References

- [GoPhone Repository](https://github.com/emiago/gophone) - SIP softphone CLI tool
- [CipBX Repository](https://github.com/arthur-s/cipbx) - SIP provider simulator
- [sipgo Library](https://github.com/emiago/sipgo) - Go SIP library
- [RFC 3261](https://www.rfc-editor.org/rfc/rfc3261) - SIP Protocol specification
- [pytest-asyncio](https://pytest-asyncio.readthedocs.io/) - Async pytest support
- [MikoPBX Docs](https://github.com/mikopbx/DevelopementDocs) - Development documentation

## Next Steps

### Completed
- ✅ Basic registration tests
- ✅ Basic call tests
- ✅ CipBX + GoPhone integration
- ✅ Provider simulation with echo server

### In Progress
- 🔄 DTMF testing
- 🔄 Call recording validation
- 🔄 Stress/load testing
- 🔄 Provider failover scenarios

### Planned
- Call queue testing
- IVR menu testing
- Codec negotiation testing
- Transport testing (TCP, TLS, WebSocket)
- CI/CD integration

## Contributing

When adding new tests:

1. Follow existing test structure
2. Use descriptive test names with docstrings
3. Always cleanup endpoints/providers after tests
4. Add proper assertions with clear error messages
5. Update this README with new features
6. Test both success and failure scenarios

## License

- GoPhone: BSD-3-Clause License
- CipBX: MIT License
- MikoPBX: GPL-3.0 License
