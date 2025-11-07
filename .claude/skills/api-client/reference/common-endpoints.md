# Common API Endpoints Reference

Complete reference of commonly used MikoPBX REST API v3 endpoints with examples.

## Endpoint Categories

- [Authentication](#authentication)
- [Extensions](#extensions)
- [Providers (SIP/IAX)](#providers)
- [Incoming Routes](#incoming-routes)
- [Outbound Routes](#outbound-routes)
- [Call Detail Records (CDR)](#call-detail-records-cdr)
- [IVR Menus](#ivr-menus)
- [Call Queues](#call-queues)
- [Conference Rooms](#conference-rooms)
- [Sound Files](#sound-files)
- [System](#system)
- [Search](#search)
- [Network](#network)
- [Firewall](#firewall)

## Authentication

### Login
```bash
# Get JWT token
./api-request.sh POST "auth:login" \
  --data "login=admin&password=123456789MikoPBX%231&rememberMe=false"
```

**Response**:
```json
{
  "result": true,
  "data": {
    "accessToken": "eyJ0eXAi...",
    "tokenType": "Bearer",
    "expiresIn": 900
  }
}
```

### Refresh Token
```bash
# Refresh expired token
./api-request.sh POST "auth:refresh"
```

### Logout
```bash
# Invalidate current session
./api-request.sh POST "auth:logout"
```

## Extensions

### List Extensions
```bash
# Get all extensions
./api-request.sh GET extensions

# Search extensions
./api-request.sh GET "extensions?search=admin&limit=10"

# Paginate
./api-request.sh GET "extensions?limit=20&offset=40"
```

### Get Extension
```bash
# Get specific extension by number
./api-request.sh GET "extensions/201"
```

### Create Extension
```bash
# Create with form data
./api-request.sh POST extensions \
  --data "number=201&username=john_doe&mobile=1234567890&email=john@example.com"

# Create with JSON
./api-request.sh POST extensions \
  --json '{
    "number": "201",
    "username": "john_doe",
    "mobile": "1234567890",
    "email": "john@example.com",
    "secret": "strongpassword123"
  }'
```

### Update Extension
```bash
# Update single field
./api-request.sh PATCH "extensions/201" --data "mobile=5555555555"

# Update multiple fields
./api-request.sh PATCH "extensions/201" \
  --data "mobile=5555555555&email=newemail@example.com"
```

### Delete Extension
```bash
# Delete extension
./api-request.sh DELETE "extensions/201"
```

## Providers

### List Providers
```bash
# Get all providers
./api-request.sh GET providers

# Filter by type
./api-request.sh GET "providers?type=sip"
```

### Get Provider
```bash
# Get specific provider
./api-request.sh GET "providers/1"
```

### Create SIP Provider
```bash
# Create SIP trunk
./api-request.sh POST providers \
  --json '{
    "type": "sip",
    "description": "Main SIP Trunk",
    "host": "sip.provider.com",
    "username": "account123",
    "secret": "password123",
    "disabled": "0"
  }'
```

### Create IAX Provider
```bash
# Create IAX trunk
./api-request.sh POST providers \
  --json '{
    "type": "iax",
    "description": "IAX Provider",
    "host": "iax.provider.com",
    "username": "iaxuser",
    "secret": "iaxpass"
  }'
```

### Update Provider
```bash
# Enable/disable provider
./api-request.sh PATCH "providers/1" --data "disabled=0"

# Update credentials
./api-request.sh PATCH "providers/1" \
  --data "username=newuser&secret=newpassword"
```

### Delete Provider
```bash
./api-request.sh DELETE "providers/1"
```

## Incoming Routes

### List Routes
```bash
# Get all incoming routes
./api-request.sh GET incoming-routes

# Filter by provider
./api-request.sh GET "incoming-routes?provider=1"
```

### Create Route
```bash
# Create incoming route
./api-request.sh POST incoming-routes \
  --json '{
    "provider": "1",
    "number": "201",
    "extension": "201",
    "priority": "1",
    "note": "Main incoming route"
  }'
```

### Update Route
```bash
# Change destination
./api-request.sh PATCH "incoming-routes/1" --data "extension=202"

# Change priority
./api-request.sh PATCH "incoming-routes/1" --data "priority=5"
```

### Delete Route
```bash
./api-request.sh DELETE "incoming-routes/1"
```

## Outbound Routes

### List Routes
```bash
# Get all outbound routes
./api-request.sh GET outbound-routes
```

### Create Route
```bash
# Create outbound route
./api-request.sh POST outbound-routes \
  --json '{
    "provider": "1",
    "numberPattern": "9XXXXXXX",
    "priority": "1",
    "note": "Local calls"
  }'
```

### Update Route
```bash
./api-request.sh PATCH "outbound-routes/1" --data "priority=2"
```

### Delete Route
```bash
./api-request.sh DELETE "outbound-routes/1"
```

## Call Detail Records (CDR)

### List CDR
```bash
# Get recent calls
./api-request.sh GET "cdr?limit=20"

# Get by date range
./api-request.sh GET "cdr?dateFrom=2025-10-17&dateTo=2025-10-18%2023:59:59&limit=50"

# Search by phone number
./api-request.sh GET "cdr?search=79643442732&limit=10"

# Search by caller name
./api-request.sh GET "cdr?search=Ivan&dateFrom=2025-10-17&limit=5"
```

### Get CDR Metadata
```bash
# Get available date ranges and statistics
./api-request.sh GET "cdr/metadata"
```

### Get Playback Token
```bash
# Get token for call recording playback
./api-request.sh POST "cdr:playback" --data "id=12345"
```

**Response**:
```json
{
  "result": true,
  "data": {
    "token": "eyJ0eXAi...",
    "url": "/pbxcore/api/v3/cdr/playback?token=eyJ0eXAi..."
  }
}
```

### Download Recording
```bash
# Download call recording
./api-request.sh POST "cdr:download" --data "id=12345"
```

### Delete CDR Record
```bash
# Delete single record
./api-request.sh DELETE "cdr/12345"
```

## IVR Menus

### List IVR Menus
```bash
./api-request.sh GET ivr-menus
```

### Create IVR Menu
```bash
./api-request.sh POST ivr-menus \
  --json '{
    "name": "Main Menu",
    "extension": "2000",
    "timeout": "10",
    "timeoutExtension": "201"
  }'
```

### Update IVR Menu
```bash
./api-request.sh PATCH "ivr-menus/1" --data "timeout=15"
```

### Delete IVR Menu
```bash
./api-request.sh DELETE "ivr-menus/1"
```

## Call Queues

### List Call Queues
```bash
./api-request.sh GET call-queues
```

### Create Call Queue
```bash
./api-request.sh POST call-queues \
  --json '{
    "name": "Support Queue",
    "extension": "3000",
    "strategy": "rrmemory",
    "timeout": "30"
  }'
```

### Update Call Queue
```bash
./api-request.sh PATCH "call-queues/1" --data "timeout=45"
```

### Delete Call Queue
```bash
./api-request.sh DELETE "call-queues/1"
```

## Conference Rooms

### List Conference Rooms
```bash
./api-request.sh GET conference-rooms
```

### Create Conference Room
```bash
./api-request.sh POST conference-rooms \
  --json '{
    "name": "Team Meeting",
    "extension": "4000",
    "pinCode": "1234"
  }'
```

### Update Conference Room
```bash
./api-request.sh PATCH "conference-rooms/1" --data "pinCode=5678"
```

### Delete Conference Room
```bash
./api-request.sh DELETE "conference-rooms/1"
```

## Sound Files

### List Sound Files
```bash
# Get all sound files
./api-request.sh GET sound-files

# Filter by category
./api-request.sh GET "sound-files?category=custom"
```

### Upload Sound File
```bash
# Note: File uploads require multipart/form-data
# Use standard curl for file uploads
curl -H "Authorization: Bearer $TOKEN" \
     -F "file=@recording.mp3" \
     -F "name=Custom Greeting" \
     "http://127.0.0.1:8081/pbxcore/api/v3/sound-files"
```

### Delete Sound File
```bash
./api-request.sh DELETE "sound-files/123"
```

## System

### Get System Info
```bash
# Get system information
./api-request.sh GET "system/info"
```

### Check for Updates
```bash
# Check for new releases
./api-request.sh GET "system:check-for-updates"
```

**Response**:
```json
{
  "result": true,
  "data": {
    "updateAvailable": true,
    "currentVersion": "2024.1.100",
    "latestVersion": "2024.1.150",
    "releaseNotes": "..."
  }
}
```

### Get System Status
```bash
# Get service status
./api-request.sh GET "system/status"
```

### Restart Service
```bash
# Restart specific service
./api-request.sh POST "system:restart-service" --data "service=asterisk"
```

## Search

### Global Search
```bash
# Search across all resources
./api-request.sh GET "search?query=admin&limit=20"

# Search by category
./api-request.sh GET "search?query=201&category=extensions"
```

**Categories**:
- `extensions`
- `providers`
- `incoming-routes`
- `outbound-routes`
- `ivr-menus`
- `call-queues`
- `conference-rooms`

## Network

### Get Network Settings
```bash
./api-request.sh GET network
```

### Update Network Settings
```bash
./api-request.sh PATCH network \
  --json '{
    "interface": "eth0",
    "ipAddress": "192.168.1.100",
    "netmask": "255.255.255.0",
    "gateway": "192.168.1.1"
  }'
```

## Firewall

### List Firewall Rules
```bash
./api-request.sh GET firewall
```

### Create Firewall Rule
```bash
./api-request.sh POST firewall \
  --json '{
    "network": "192.168.1.0/24",
    "description": "Office Network",
    "permit": "1"
  }'
```

### Update Firewall Rule
```bash
./api-request.sh PATCH "firewall/1" --data "permit=0"
```

### Delete Firewall Rule
```bash
./api-request.sh DELETE "firewall/1"
```

## Query Parameters

### Common Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `search` | string | Search term | `?search=admin` |
| `limit` | integer | Max items | `?limit=10` |
| `offset` | integer | Skip items | `?offset=20` |
| `sort` | string | Sort field | `?sort=username` |
| `order` | string | Sort order | `?order=asc` |
| `dateFrom` | string | Start date | `?dateFrom=2025-10-17` |
| `dateTo` | string | End date | `?dateTo=2025-10-18` |

### Combining Parameters

```bash
# Multiple filters
./api-request.sh GET "extensions?search=john&limit=5&sort=username&order=desc"

# Date range with search
./api-request.sh GET "cdr?dateFrom=2025-10-17&dateTo=2025-10-18&search=Ivan&limit=10"
```

### URL Encoding

Special characters must be URL encoded:

| Character | Encoded | Example |
|-----------|---------|---------|
| Space | `%20` | `John%20Doe` |
| `:` | `%3A` | `23%3A59%3A59` |
| `+` | `%2B` | `%2B1234567890` |
| `=` | `%3D` | `key%3Dvalue` |
| `&` | `%26` | `name%26surname` |

**Example**:
```bash
# Unencoded: dateTo=2025-10-18 23:59:59
# Encoded:
./api-request.sh GET "cdr?dateTo=2025-10-18%2023:59:59"
```

## Response Patterns

### Success Response
```json
{
  "result": true,
  "data": {
    "id": "123",
    "field": "value"
  },
  "messages": {
    "success": ["Operation completed successfully"]
  }
}
```

### List Response
```json
{
  "result": true,
  "data": {
    "items": [
      {"id": "1", "name": "Item 1"},
      {"id": "2", "name": "Item 2"}
    ],
    "totalCount": 42
  },
  "messages": {}
}
```

### Error Response
```json
{
  "result": false,
  "data": {},
  "messages": {
    "error": ["Validation failed: field is required"]
  }
}
```

## Pagination

### Calculate Pages
```bash
# Get total count
RESPONSE=$(./api-request.sh GET "extensions?limit=1" --lines 0)
TOTAL=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['totalCount'])")

# Calculate pages (20 per page)
PAGE_SIZE=20
PAGES=$(( (TOTAL + PAGE_SIZE - 1) / PAGE_SIZE ))

echo "Total: $TOTAL, Pages: $PAGES"

# Get page 3
OFFSET=$(( (3 - 1) * PAGE_SIZE ))
./api-request.sh GET "extensions?limit=$PAGE_SIZE&offset=$OFFSET"
```

## Best Practices

### 1. Use Specific Endpoints
```bash
# ✅ Good - specific endpoint
./api-request.sh GET "extensions/201"

# ❌ Less efficient - search
./api-request.sh GET "extensions?search=201&limit=1"
```

### 2. Limit Response Size
```bash
# ✅ Good - limit results
./api-request.sh GET "cdr?limit=10"

# ❌ Bad - all results (slow)
./api-request.sh GET cdr
```

### 3. Use Proper Data Format
```bash
# ✅ Simple data - form encoding
./api-request.sh POST extensions --data "number=201&username=test"

# ✅ Complex data - JSON
./api-request.sh POST extensions --json '{"number":"201","settings":{"key":"value"}}'
```

### 4. Check Result Field
```bash
RESPONSE=$(./api-request.sh GET extensions --lines 0)
if echo "$RESPONSE" | python3 -c "import sys,json; exit(0 if json.load(sys.stdin)['result'] else 1)"; then
    echo "Success"
else
    echo "Failed"
fi
```

## See Also

- [HTTP Methods Reference](http-methods.md) - Detailed method documentation
- [CRUD Examples](../examples/crud-examples.md) - Complete workflows
- [SKILL.md](../SKILL.md) - Main skill documentation
