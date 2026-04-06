# HTTP Methods Reference

Complete guide to using HTTP methods with MikoPBX REST API.

## Overview

MikoPBX REST API v3 follows RESTful conventions for HTTP methods and CRUD operations.

## Standard CRUD Mapping

| Operation | HTTP Method | Endpoint Pattern | Example |
|-----------|-------------|------------------|---------|
| **Create** | POST | `/resource` | `POST /extensions` |
| **Read (List)** | GET | `/resource` | `GET /extensions` |
| **Read (One)** | GET | `/resource/{id}` | `GET /extensions/201` |
| **Update** | PATCH | `/resource/{id}` | `PATCH /extensions/201` |
| **Delete** | DELETE | `/resource/{id}` | `DELETE /extensions/201` |

## GET - Retrieve Data

### Purpose
Retrieve resources without modifying data. Idempotent and safe.

### Use Cases
- List all resources
- Get specific resource by ID
- Search and filter
- Retrieve metadata

### Examples

```bash
# List all extensions
./api-request.sh GET extensions

# Get specific extension
./api-request.sh GET "extensions/201"

# Search with filters
./api-request.sh GET "extensions?search=admin&limit=10"

# Get with date range (CDR)
./api-request.sh GET "cdr?dateFrom=2025-10-17&dateTo=2025-10-18%2023:59:59"

# Get metadata
./api-request.sh GET "cdr/metadata"
```

### Query Parameters

Common query parameters:
- `search` - Search term
- `limit` - Maximum items to return
- `offset` - Skip N items (pagination)
- `sort` - Sort field
- `order` - Sort direction (asc/desc)
- `dateFrom` - Start date filter
- `dateTo` - End date filter

### Response Format

```json
{
  "result": true,
  "data": {
    "items": [...],
    "totalCount": 42
  },
  "messages": {}
}
```

## POST - Create Resource

### Purpose
Create new resources. Not idempotent.

### Use Cases
- Create new extension
- Create provider
- Create incoming route
- Execute custom action (non-CRUD)

### Examples

```bash
# Create with form data
./api-request.sh POST extensions \
  --data "number=201&username=john&mobile=1234567890"

# Create with JSON payload
./api-request.sh POST extensions \
  --json '{"number":"202","username":"jane","mobile":"9876543210"}'

# Execute custom action (playback token)
./api-request.sh POST "cdr:playback" --data "id=12345"
```

### Form Data vs JSON

**Form Data** (application/x-www-form-urlencoded):
```bash
--data "key1=value1&key2=value2&key3=value3"
```

**JSON Payload** (application/json):
```bash
--json '{"key1":"value1","key2":"value2","key3":"value3"}'
```

### Response Format

```json
{
  "result": true,
  "data": {
    "id": "123",
    "number": "201",
    "username": "john"
  },
  "messages": {
    "success": ["Extension created successfully"]
  }
}
```

## PATCH - Update Resource

### Purpose
Partially update existing resource. Only specified fields are modified.

### Use Cases
- Update extension mobile number
- Enable/disable provider
- Change route priority
- Modify specific fields

### Examples

```bash
# Update single field
./api-request.sh PATCH "extensions/201" --data "mobile=5555555555"

# Update multiple fields
./api-request.sh PATCH "extensions/201" \
  --data "mobile=5555555555&username=john_updated"

# Update with JSON
./api-request.sh PATCH "extensions/201" \
  --json '{"mobile":"5555555555","username":"john_updated"}'
```

### Partial vs Full Update

**PATCH** (partial update):
- Only sends changed fields
- Other fields remain unchanged
- More efficient

**PUT** (full update):
- Sends complete resource representation
- Replaces entire resource
- Less common in MikoPBX API

### Response Format

```json
{
  "result": true,
  "data": {
    "id": "123",
    "number": "201",
    "mobile": "5555555555"
  },
  "messages": {
    "success": ["Extension updated successfully"]
  }
}
```

## DELETE - Remove Resource

### Purpose
Remove resource from system. Idempotent.

### Use Cases
- Delete extension
- Remove provider
- Delete CDR record
- Clean up test data

### Examples

```bash
# Delete extension
./api-request.sh DELETE "extensions/201"

# Delete provider
./api-request.sh DELETE "providers/5"

# Delete CDR record
./api-request.sh DELETE "cdr/12345"
```

### Soft Delete vs Hard Delete

Some resources use **soft delete**:
- Record marked as deleted (disabled=1)
- Data preserved for history
- Can be restored

Others use **hard delete**:
- Record permanently removed
- Cannot be recovered
- Cascading deletion of related records

### Response Format

```json
{
  "result": true,
  "data": {},
  "messages": {
    "success": ["Extension deleted successfully"]
  }
}
```

## PUT - Replace Resource

### Purpose
Replace entire resource with new representation. Idempotent.

### Use Cases
- Full resource replacement (rare in MikoPBX)
- Prefer PATCH for updates

### Example

```bash
# Replace entire extension (uncommon)
./api-request.sh PUT "extensions/201" \
  --json '{"number":"201","username":"john","mobile":"1234567890","email":"john@example.com"}'
```

### When to Use PUT vs PATCH

**Use PATCH when**:
- Updating specific fields
- Partial updates
- Most common scenario

**Use PUT when**:
- Replacing entire resource
- All fields provided
- Explicit full replacement

## Custom Actions (Non-CRUD)

Some endpoints use `:action` syntax for operations that don't fit CRUD model.

### Examples

```bash
# Authentication
./api-request.sh POST "auth:login" \
  --data "login=admin&password=123456789MikoPBX%231"

# Refresh token
./api-request.sh POST "auth:refresh"

# Logout
./api-request.sh POST "auth:logout"

# Check for updates
./api-request.sh GET "system:check-for-updates"

# Get playback token
./api-request.sh POST "cdr:playback" --data "id=12345"

# Download recording
./api-request.sh POST "cdr:download" --data "id=12345"
```

### Action Naming Convention

Format: `resource:action`

Examples:
- `auth:login`
- `auth:logout`
- `auth:refresh`
- `cdr:playback`
- `cdr:download`
- `system:check-for-updates`

## Idempotency

### Idempotent Methods
Making the same request multiple times produces same result:
- **GET** - Always returns same data (for same state)
- **PUT** - Replaces with same data
- **DELETE** - Resource already deleted (no error)
- **PATCH** - Updates with same values

### Non-Idempotent Methods
Each request may produce different result:
- **POST** - Creates new resource each time
- Custom actions (may have side effects)

## Status Codes

While MikoPBX returns JSON responses, HTTP status codes indicate request status:

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | GET successful |
| 201 | Created | POST successful |
| 204 | No Content | DELETE successful |
| 400 | Bad Request | Validation failed |
| 401 | Unauthorized | Invalid token |
| 403 | Forbidden | No permission |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Internal error |

## Best Practices

### 1. Use Appropriate Method
```bash
# ✅ Correct
./api-request.sh GET extensions          # Retrieve
./api-request.sh POST extensions --data  # Create
./api-request.sh PATCH extensions/201    # Update
./api-request.sh DELETE extensions/201   # Delete

# ❌ Wrong
./api-request.sh POST extensions/201     # Don't POST to specific ID
./api-request.sh GET extensions --data   # GET doesn't need data
```

### 2. Use JSON for Complex Data
```bash
# ✅ Good for simple data
./api-request.sh POST extensions --data "number=201&username=test"

# ✅ Good for complex/nested data
./api-request.sh POST extensions \
  --json '{"number":"201","username":"test","settings":{"key":"value"}}'
```

### 3. URL Encode Query Parameters
```bash
# ✅ Encoded spaces and special chars
./api-request.sh GET "cdr?dateTo=2025-10-18%2023:59:59"

# ✅ Script handles encoding in --data
./api-request.sh POST extensions --data "username=John Doe"
```

### 4. Check Response Status
```bash
# Always check result field
RESPONSE=$(./api-request.sh GET extensions --lines 0)
RESULT=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['result'])")

if [[ "$RESULT" == "True" ]]; then
    echo "Success!"
else
    echo "Failed!"
fi
```

## Error Handling

### Validation Errors
```json
{
  "result": false,
  "data": {},
  "messages": {
    "error": [
      "Validation failed: number is required",
      "Validation failed: mobile must be numeric"
    ]
  }
}
```

### Not Found Errors
```json
{
  "result": false,
  "data": {},
  "messages": {
    "error": ["Extension with ID 999 not found"]
  }
}
```

### Permission Errors
```json
{
  "result": false,
  "data": {},
  "messages": {
    "error": ["Insufficient permissions for this operation"]
  }
}
```

## See Also

- [Common Endpoints](common-endpoints.md) - Endpoint patterns and examples
- [CRUD Examples](../examples/crud-examples.md) - Complete CRUD workflows
- [SKILL.md](../SKILL.md) - Main skill documentation
