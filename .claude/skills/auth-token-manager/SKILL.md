---
name: auth-token-manager
description: Получение валидных JWT Bearer токенов для аутентификации MikoPBX REST API v3. Использовать когда нужно тестировать API эндпоинты, отлаживать проблемы аутентификации или при возникновении ошибок 401 Unauthorized. Автоматически обрабатывает вход с username/password и возвращает готовый к использованию access token.
allowed-tools: Bash, Read
---

# MikoPBX Authentication Token Manager

## Overview

This skill provides reliable JWT Bearer token acquisition for MikoPBX REST API v3. Solves the persistent problem of getting valid authentication tokens for API testing and development.

## Authentication Architecture

MikoPBX uses **dual-token authentication**:

1. **Access Token (JWT)**
   - Type: JSON Web Token
   - Lifetime: 15 minutes (900 seconds)
   - Storage: In-memory (Authorization: Bearer header)
   - Purpose: Stateless API authorization

2. **Refresh Token**
   - Type: Random hex string
   - Lifetime: 30 days (configurable via rememberMe)
   - Storage: httpOnly cookie + Redis
   - Purpose: Token rotation without re-authentication

## Token Workflow

```
┌─────────────┐
│   Login     │ POST /auth:login
│  username   │ {login, password, rememberMe}
│  password   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  Server Response                │
│  - accessToken (JWT, 15 min)   │
│  - refreshToken (cookie, 30d)  │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  API Request                    │
│  Authorization: Bearer <JWT>   │
│  Cookie: refreshToken=xxx       │
└──────┬──────────────────────────┘
       │
       ▼ (when token expires)
┌─────────────────────────────────┐
│  Refresh                        │
│  POST /auth:refresh             │
│  Cookie: refreshToken=xxx       │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  New Tokens                     │
│  - new accessToken (JWT)        │
│  - new refreshToken (rotated)   │
└─────────────────────────────────┘
```

## Features

- ✅ Automatic JWT token acquisition via username/password
- ✅ Cookie-based session management (for refresh tokens)
- ✅ Token validation and expiration checking
- ✅ Support for both HTTP and HTTPS endpoints
- ✅ Configurable timeout and retry logic
- ✅ Clear error messages for debugging

## Environment Variables

The skill uses these environment variables (with defaults):

```bash
MIKOPBX_API_URL="http://mikopbx-php83.localhost:8081/pbxcore/api/v3"  # API base URL
MIKOPBX_LOGIN="admin"                                    # Username
MIKOPBX_PASSWORD="123456789MikoPBX#1"                   # Password
```

For HTTPS with self-signed certificates:
```bash
MIKOPBX_API_URL="https://localhost:8445/pbxcore/api/v3"
```

## Usage Examples

### Example 1: Get Token for API Testing
```bash
# Get fresh token
TOKEN=$(bash .claude/skills/auth-token-manager/get-auth-token.sh)

# Use token in API requests
curl -H "Authorization: Bearer $TOKEN" \
     http://mikopbx-php83.localhost:8081/pbxcore/api/v3/extensions
```

### Example 2: Custom Credentials
```bash
# Override default credentials
export MIKOPBX_LOGIN="custom_admin"
export MIKOPBX_PASSWORD="custom_password"
TOKEN=$(bash .claude/skills/auth-token-manager/get-auth-token.sh)
```

### Example 3: HTTPS with Self-Signed Certificate
```bash
# For local development with self-signed cert
export MIKOPBX_API_URL="https://192.168.117.2:8445/pbxcore/api/v3"
TOKEN=$(bash .claude/skills/auth-token-manager/get-auth-token.sh)
```

### Example 4: Debug Mode
```bash
# See full request/response
bash .claude/skills/auth-token-manager/get-auth-token.sh --debug
```

## Token Format

Valid JWT tokens have 3 parts separated by dots:

```
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJhZG1pbiIsInJvbGUiOiJhZG1pbnMiLCJsYW5ndWFnZSI6InJ1IiwiaWF0IjoxNzYwODg4Mjc2LCJleHAiOjE3NjA4ODkxNzYsIm5iZiI6MTc2MDg4ODI3Nn0.SOP3FAXD-O56m7e-l2-aq5rJ02OZB6UtBACbRy4aNKg
```

Parts:
1. **Header**: Algorithm and token type
2. **Payload**: User ID, role, language, timestamps (iat, exp, nbf)
3. **Signature**: HMAC-SHA256 signature

## Common Issues

### Issue 1: "Connection refused"
**Cause**: MikoPBX container not running
**Solution**: Start container or check `MIKOPBX_API_URL`

### Issue 2: "Invalid credentials"
**Cause**: Wrong username/password
**Solution**: Verify `MIKOPBX_LOGIN` and `MIKOPBX_PASSWORD`

### Issue 3: "SSL certificate problem"
**Cause**: Self-signed certificate without --insecure
**Solution**: Script automatically handles this for HTTPS URLs

### Issue 4: "Token expired"
**Cause**: Token older than 15 minutes
**Solution**: Get fresh token (this skill does it automatically)

## Technical Details

### Login Endpoint
```http
POST /pbxcore/api/v3/auth:login
Content-Type: application/x-www-form-urlencoded

login=admin&password=123456789MikoPBX%231&rememberMe=false
```

### Response Format
```json
{
  "result": true,
  "data": {
    "accessToken": "eyJ0eXAiOiJKV1QiLCJh...",
    "tokenType": "Bearer",
    "expiresIn": 900
  },
  "messages": {}
}
```

### Security Notes

1. **HTTPS Recommended**: Always use HTTPS in production
2. **Token Storage**: Never commit tokens to git
3. **Token Lifetime**: Tokens expire after 15 minutes
4. **Refresh Token**: Stored in httpOnly cookie (XSS protection)
5. **Session Management**: Each login creates new session

## Integration with Other Skills

This skill can be used by:
- `mikopbx-api-test-generating` - Get tokens for pytest tests
- `rest-api-docker-tester` - Get tokens for CURL tests
- Custom testing scripts

## Files

- `get-auth-token.sh` - Main script for token acquisition
- `SKILL.md` - This documentation
- `README.md` - Quick reference guide

## See Also

- [REST API Development Guide](/src/PBXCoreREST/CLAUDE.md)
- [Authentication Tests](/tests/api/test_01_auth.py)
- [Python API Client](/tests/api/conftest.py)
