# MikoPBX Authentication Token Manager

Quick reference guide for obtaining JWT Bearer tokens for MikoPBX REST API v3.

## Quick Start

```bash
# Get token using default credentials
TOKEN=$(bash .claude/skills/mikopbx-auth-token/get-auth-token.sh)

# Use token in API request
curl -H "Authorization: Bearer $TOKEN" \
     http://mikopbx-php83.localhost:8081/pbxcore/api/v3/extensions
```

## Environment Variables

```bash
# Default configuration (no setup needed)
MIKOPBX_API_URL="http://mikopbx-php83.localhost:8081/pbxcore/api/v3"
MIKOPBX_LOGIN="admin"
MIKOPBX_PASSWORD="123456789MikoPBX#1"

# Override for custom setup
export MIKOPBX_API_URL="https://192.168.117.2:8445/pbxcore/api/v3"
export MIKOPBX_LOGIN="custom_admin"
export MIKOPBX_PASSWORD="custom_password"
```

## Usage Examples

### Example 1: Basic Usage
```bash
TOKEN=$(bash .claude/skills/mikopbx-auth-token/get-auth-token.sh)
echo "Token obtained: ${TOKEN:0:50}..."
```

### Example 2: Test Extensions API
```bash
TOKEN=$(bash .claude/skills/mikopbx-auth-token/get-auth-token.sh)

curl -s -H "Authorization: Bearer $TOKEN" \
     http://mikopbx-php83.localhost:8081/pbxcore/api/v3/extensions | \
     python3 -m json.tool
```

### Example 3: Create Extension
```bash
TOKEN=$(bash .claude/skills/mikopbx-auth-token/get-auth-token.sh)

curl -s -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "user_username": "John Doe",
       "number": "201",
       "sip_secret": "SecurePass123"
     }' \
     http://mikopbx-php83.localhost:8081/pbxcore/api/v3/employees | \
     python3 -m json.tool
```

### Example 4: Debug Mode
```bash
# See detailed output
bash .claude/skills/mikopbx-auth-token/get-auth-token.sh --debug
```

### Example 5: HTTPS with Self-Signed Certificate
```bash
export MIKOPBX_API_URL="https://localhost:8445/pbxcore/api/v3"
TOKEN=$(bash .claude/skills/mikopbx-auth-token/get-auth-token.sh)

curl -s -H "Authorization: Bearer $TOKEN" \
     --insecure \
     https://localhost:8445/pbxcore/api/v3/extensions
```

### Example 6: Use in Shell Script
```bash
#!/bin/bash

# Get token
TOKEN=$(bash .claude/skills/mikopbx-auth-token/get-auth-token.sh) || {
    echo "Failed to get token"
    exit 1
}

# Multiple API calls with same token
curl -H "Authorization: Bearer $TOKEN" \
     http://mikopbx-php83.localhost:8081/pbxcore/api/v3/extensions

curl -H "Authorization: Bearer $TOKEN" \
     http://mikopbx-php83.localhost:8081/pbxcore/api/v3/sip-providers

curl -H "Authorization: Bearer $TOKEN" \
     http://mikopbx-php83.localhost:8081/pbxcore/api/v3/incoming-routes
```

## Exit Codes

- `0` - Success (token printed to stdout)
- `1` - Authentication failed (invalid credentials)
- `2` - Connection failed (server unreachable)
- `3` - Invalid response format (malformed JSON or token)

## Common Issues

### "Connection refused"
```bash
# Check if MikoPBX container is running
docker ps | grep mikopbx

# Verify API URL
echo $MIKOPBX_API_URL
```

### "Authentication failed"
```bash
# Verify credentials
echo "Login: $MIKOPBX_LOGIN"
echo "Password: $MIKOPBX_PASSWORD"

# Try default credentials
unset MIKOPBX_LOGIN MIKOPBX_PASSWORD
TOKEN=$(bash .claude/skills/mikopbx-auth-token/get-auth-token.sh)
```

### "Invalid token format"
```bash
# Enable debug mode to see response
bash .claude/skills/mikopbx-auth-token/get-auth-token.sh --debug
```

## Token Information

- **Format**: JWT (JSON Web Token)
- **Lifetime**: 15 minutes (900 seconds)
- **Structure**: 3 parts separated by dots (header.payload.signature)
- **Usage**: `Authorization: Bearer <token>` header
- **Refresh**: Cookie-based refresh token (30 days)

## Integration with Python Tests

```python
# Use in pytest conftest.py
import subprocess
import os

def get_auth_token():
    """Get JWT token using skill script"""
    script_path = ".claude/skills/mikopbx-auth-token/get-auth-token.sh"
    result = subprocess.run(
        ["bash", script_path],
        capture_output=True,
        text=True,
        check=True
    )
    return result.stdout.strip()

# Use in tests
@pytest.fixture(scope='session')
def auth_token():
    return get_auth_token()
```

## See Also

- [SKILL.md](SKILL.md) - Full documentation
- [REST API Guide](/src/PBXCoreREST/CLAUDE.md) - API development guide
- [Authentication Tests](/tests/api/test_01_auth.py) - Test examples
