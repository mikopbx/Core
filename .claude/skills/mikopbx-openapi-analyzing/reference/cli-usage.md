# CLI Usage Guide

Complete command-line interface reference for `openapi_analyzer.py`.

## Installation & Setup

No installation required - just ensure you have:
- Python 3.7+
- OpenAPI spec downloaded at `/tmp/mikopbx_openapi.json`

## Basic Usage

```bash
python3 scripts/openapi_analyzer.py <command> [args]
```

## Commands Overview

| Command | Description | Args |
|---------|-------------|------|
| `info` | Show API metadata | None |
| `list` | List all paths | `[pattern]` (optional) |
| `get` | Get endpoint details | `<path> <method>` |
| `schema` | Get component schema | `<name>` |
| `validate` | Validate endpoint | `<path> <method>` |

---

## Command: info

Get high-level API information.

### Syntax

```bash
python3 openapi_analyzer.py info
```

### Output

```json
{
  "title": "MikoPBX REST API",
  "version": "3.0.0",
  "openapi_version": "3.1.0",
  "total_paths": 259,
  "total_schemas": 96
}
```

### Use Cases

- Verify OpenAPI spec loaded correctly
- Check API version
- Count total endpoints and schemas
- Quick health check

### Examples

```bash
# Basic info
python3 openapi_analyzer.py info

# Count endpoints
python3 openapi_analyzer.py info | jq '.total_paths'
# Output: 259

# Check OpenAPI version
python3 openapi_analyzer.py info | jq -r '.openapi_version'
# Output: 3.1.0
```

---

## Command: list

List all API paths, optionally filtered by pattern.

### Syntax

```bash
# List all paths
python3 openapi_analyzer.py list

# Filter by pattern
python3 openapi_analyzer.py list <pattern>
```

### Output

One path per line, sorted alphabetically:
```
/pbxcore/api/v3/apikeys
/pbxcore/api/v3/extensions
/pbxcore/api/v3/extensions/{id}
...
```

### Examples

```bash
# List all endpoints
python3 openapi_analyzer.py list

# Find extension endpoints
python3 openapi_analyzer.py list extensions
# Output:
# /pbxcore/api/v3/extensions
# /pbxcore/api/v3/extensions/{id}
# /pbxcore/api/v3/extensions/{id}:copy
# /pbxcore/api/v3/extensions:getDefault
# /pbxcore/api/v3/extensions:getForSelect

# Find provider endpoints
python3 openapi_analyzer.py list providers

# Count endpoints matching pattern
python3 openapi_analyzer.py list extensions | wc -l

# Find all custom action endpoints (with :)
python3 openapi_analyzer.py list | grep ":"
```

### Use Cases

- Explore available endpoints
- Find endpoints for specific resource
- Generate endpoint lists for documentation
- Verify endpoint naming conventions

---

## Command: get

Get complete endpoint details including parameters, request/response schemas.

### Syntax

```bash
python3 openapi_analyzer.py get <path> <method>
```

### Parameters

- `<path>`: Full API path (e.g., `/pbxcore/api/v3/extensions`)
- `<method>`: HTTP method (GET, POST, PUT, PATCH, DELETE)

### Output

```json
{
  "path": "/pbxcore/api/v3/extensions",
  "method": "POST",
  "summary": "Создать новый добавочный",
  "description": "Детальное описание...",
  "operationId": "createExtension",
  "tags": ["Extensions"],
  "parameters": [...],
  "requestBody": {...},
  "responses": {...}
}
```

### Examples

#### Example 1: GET Endpoint

```bash
python3 openapi_analyzer.py get "/pbxcore/api/v3/extensions/{id}" GET
```

Output:
```json
{
  "path": "/pbxcore/api/v3/extensions/{id}",
  "method": "GET",
  "summary": "Получить добавочный по ID",
  "operationId": "getExtensionById",
  "parameters": [
    {
      "name": "id",
      "in": "path",
      "required": true,
      "description": "Extension ID",
      "schema": {"type": "string"}
    }
  ],
  "responses": {
    "200": {
      "description": "Успешно",
      "schema": {...}
    }
  }
}
```

#### Example 2: POST Endpoint

```bash
python3 openapi_analyzer.py get "/pbxcore/api/v3/extensions" POST
```

Output includes `requestBody`:
```json
{
  "requestBody": {
    "type": "object",
    "properties": {
      "number": {
        "type": "string",
        "description": "Номер добавочного (2-8 цифр)",
        "example": "201"
      },
      "type": {
        "type": "string",
        "enum": ["SIP", "IAX", "QUEUE"],
        "example": "SIP"
      }
    },
    "required": ["number", "type"]
  }
}
```

#### Example 3: Extract Specific Fields

```bash
# Get required parameters
python3 openapi_analyzer.py get "/pbxcore/api/v3/extensions" POST | \
  jq -r '.requestBody.required[]'
# Output:
# number
# type

# Get response status codes
python3 openapi_analyzer.py get "/pbxcore/api/v3/extensions" POST | \
  jq -r '.responses | keys[]'
# Output:
# 201
# 400
# 401

# Get operation ID
python3 openapi_analyzer.py get "/pbxcore/api/v3/extensions" POST | \
  jq -r '.operationId'
# Output: createExtension
```

### Use Cases

- Understand endpoint structure
- Extract parameter definitions
- Get request/response examples
- Compare with code implementation
- Generate test data

---

## Command: schema

Get component schema definition by name.

### Syntax

```bash
python3 openapi_analyzer.py schema <name>
```

### Parameters

- `<name>`: Schema name from `#/components/schemas/`

### Output

```json
{
  "type": "object",
  "properties": {
    "id": {"type": "string"},
    "number": {"type": "string"},
    "type": {"type": "string", "enum": ["SIP", "IAX"]}
  },
  "required": ["number", "type"]
}
```

### Examples

#### Example 1: Get Extension Schema

```bash
python3 openapi_analyzer.py schema Extension
```

#### Example 2: List Required Fields

```bash
python3 openapi_analyzer.py schema Extension | jq -r '.required[]'
# Output:
# number
# type
```

#### Example 3: List All Properties

```bash
python3 openapi_analyzer.py schema Extension | jq -r '.properties | keys[]'
# Output:
# id
# number
# type
# callerid
# ...
```

#### Example 4: Get Property Type

```bash
python3 openapi_analyzer.py schema Extension | \
  jq -r '.properties.type'
# Output:
# {"type": "string", "enum": ["SIP", "IAX", ...]}
```

### Use Cases

- Understand data structures
- Validate code models against schemas
- Generate TypeScript/PHP interfaces
- Create mock data
- Documentation generation

---

## Command: validate

Validate endpoint compliance with OpenAPI 3.1.0 standard.

### Syntax

```bash
python3 openapi_analyzer.py validate <path> <method>
```

### Output

```json
{
  "valid": true,
  "issues": [],
  "warnings": ["Missing description for parameter 'id'"],
  "score": 95
}
```

### Validation Criteria

**Critical Issues** (makes `valid: false`):
- Missing `summary`
- Missing `operationId`
- POST/PUT/PATCH without `requestBody`
- No `responses` defined

**Warnings** (reduces score):
- Missing `description`
- Missing expected response codes
- Missing `required` field list

### Examples

#### Example 1: Validate Valid Endpoint

```bash
python3 openapi_analyzer.py validate "/pbxcore/api/v3/extensions" POST
```

Output:
```json
{
  "valid": true,
  "issues": [],
  "warnings": [],
  "score": 100
}
```

#### Example 2: Validate Invalid Endpoint

```bash
python3 openapi_analyzer.py validate "/pbxcore/api/v3/broken" GET
```

Output:
```json
{
  "valid": false,
  "issues": [
    "Missing summary",
    "Missing operationId"
  ],
  "warnings": [
    "Missing description",
    "Missing 404 response"
  ],
  "score": 35
}
```

#### Example 3: Batch Validate All Endpoints

```bash
# Find all invalid endpoints
python3 openapi_analyzer.py list | while read path; do
    python3 openapi_analyzer.py validate "$path" POST 2>/dev/null
done | jq -s 'map(select(.valid == false))'
```

#### Example 4: Generate Compliance Report

```bash
#!/bin/bash
echo "# OpenAPI Compliance Report"
echo ""

total=0
valid=0
total_score=0

while read path; do
    for method in GET POST PUT PATCH DELETE; do
        result=$(python3 openapi_analyzer.py validate "$path" "$method" 2>/dev/null)
        if [ $? -eq 0 ]; then
            total=$((total + 1))
            is_valid=$(echo "$result" | jq -r '.valid')
            score=$(echo "$result" | jq -r '.score')
            total_score=$((total_score + score))

            if [ "$is_valid" == "true" ]; then
                valid=$((valid + 1))
            fi
        fi
    done
done < <(python3 openapi_analyzer.py list)

echo "Total endpoints: $total"
echo "Valid: $valid ($((valid * 100 / total))%)"
echo "Average score: $((total_score / total))/100"
```

### Use Cases

- Pre-release compliance check
- Find documentation gaps
- Track API quality over time
- Identify missing descriptions
- Validate new endpoints

---

## Advanced Usage Patterns

### Pattern 1: Compare Endpoint with Code

```bash
#!/bin/bash
# Compare OpenAPI spec with DataStructure.php

RESOURCE="Extensions"
PATH="/pbxcore/api/v3/extensions"

# Get OpenAPI parameters
openapi_params=$(python3 openapi_analyzer.py get "$PATH" POST | \
  jq -r '.requestBody.properties | keys[]' | sort)

# Get code parameters (example - adapt to your codebase)
code_params=$(grep -A 50 "getParameterDefinitions" \
  "src/PBXCoreREST/Lib/$RESOURCE/DataStructure.php" | \
  grep "'[a-z_]*'" | sed "s/.*'\([^']*\)'.*/\1/" | sort)

# Compare
echo "=== In OpenAPI only ==="
comm -23 <(echo "$openapi_params") <(echo "$code_params")

echo "=== In Code only ==="
comm -13 <(echo "$openapi_params") <(echo "$code_params")

echo "=== In Both ==="
comm -12 <(echo "$openapi_params") <(echo "$code_params")
```

### Pattern 2: Generate Test Data

```bash
# Extract example values for testing
python3 openapi_analyzer.py get "/pbxcore/api/v3/extensions" POST | \
  jq '.requestBody.properties | to_entries | map({
    key: .key,
    value: (.value.example // .value.enum[0] // "test")
  }) | from_entries'
```

Output:
```json
{
  "number": "201",
  "type": "SIP",
  "callerid": "Test User",
  "userid": "1"
}
```

### Pattern 3: Find Undocumented Endpoints

```bash
# Find endpoints with empty descriptions
python3 openapi_analyzer.py list | while read path; do
    for method in GET POST PUT DELETE; do
        desc=$(python3 openapi_analyzer.py get "$path" "$method" 2>/dev/null | \
          jq -r '.description')
        if [ "$desc" == "" ]; then
            echo "$method $path"
        fi
    done
done
```

### Pattern 4: Extract All Required Fields

```bash
# Create CSV of all endpoints and their required fields
echo "Path,Method,Required Fields"
python3 openapi_analyzer.py list | while read path; do
    for method in POST PUT PATCH; do
        endpoint=$(python3 openapi_analyzer.py get "$path" "$method" 2>/dev/null)
        if [ $? -eq 0 ]; then
            required=$(echo "$endpoint" | jq -r '.requestBody.required[]?' | tr '\n' ';')
            if [ -n "$required" ]; then
                echo "$path,$method,$required"
            fi
        fi
    done
done
```

---

## Output Formatting

### JSON Pretty Print

```bash
# Default: 2-space indent
python3 openapi_analyzer.py get "/path" GET

# Custom indent with jq
python3 openapi_analyzer.py get "/path" GET | jq --indent 4 .

# Compact (no whitespace)
python3 openapi_analyzer.py get "/path" GET | jq -c .
```

### Filter Specific Fields

```bash
# Get only summary
python3 openapi_analyzer.py get "/path" GET | jq -r '.summary'

# Get operation ID and tags
python3 openapi_analyzer.py get "/path" GET | jq '{operationId, tags}'

# Get required parameters
python3 openapi_analyzer.py get "/path" POST | jq '.requestBody.required'
```

### Table Format (using jq)

```bash
# Create table of endpoints
python3 openapi_analyzer.py list | while read path; do
    endpoint=$(python3 openapi_analyzer.py get "$path" GET 2>/dev/null)
    if [ $? -eq 0 ]; then
        summary=$(echo "$endpoint" | jq -r '.summary')
        opId=$(echo "$endpoint" | jq -r '.operationId')
        printf "%-50s | %-30s | %s\n" "$path" "$opId" "$summary"
    fi
done
```

---

## Error Handling

### Endpoint Not Found

```bash
python3 openapi_analyzer.py get "/invalid/path" GET
# Output: Endpoint GET /invalid/path not found
# Exit code: 0 (prints error message)
```

### Schema Not Found

```bash
python3 openapi_analyzer.py schema InvalidSchema
# Output: Schema InvalidSchema not found
# Exit code: 0
```

### Missing Arguments

```bash
python3 openapi_analyzer.py get
# Output: Usage: get <path> <method>
# Exit code: 0
```

### File Not Found

```bash
# If /tmp/mikopbx_openapi.json doesn't exist
python3 openapi_analyzer.py info
# Output: FileNotFoundError traceback
# Exit code: 1
```

---

## Performance Tips

1. **Cache results**: Store output in variables for reuse
   ```bash
   endpoint=$(python3 openapi_analyzer.py get "/path" POST)
   echo "$endpoint" | jq '.summary'
   echo "$endpoint" | jq '.requestBody'
   ```

2. **Use pattern filtering**: Filter in `list` command, not with grep
   ```bash
   # Fast
   python3 openapi_analyzer.py list extensions

   # Slower
   python3 openapi_analyzer.py list | grep extensions
   ```

3. **Batch processing**: Process multiple endpoints in one script
   ```bash
   # Good
   python3 << EOF
   from openapi_analyzer import MikoPBXOpenAPIAnalyzer
   analyzer = MikoPBXOpenAPIAnalyzer()
   for path in analyzer.list_paths():
       print(analyzer.get_endpoint(path, 'GET'))
   EOF

   # Bad (slower)
   for path in $(python3 openapi_analyzer.py list); do
       python3 openapi_analyzer.py get "$path" GET
   done
   ```

---

## Integration with Other Tools

### With jq

```bash
# Extract and format
python3 openapi_analyzer.py get "/path" POST | \
  jq -r '.requestBody.required | join(", ")'
```

### With curl

```bash
# Generate curl command from endpoint
path="/pbxcore/api/v3/extensions"
method="POST"
data=$(python3 openapi_analyzer.py get "$path" "$method" | \
  jq '.requestBody.properties | to_entries | map({
    key: .key,
    value: .value.example
  }) | from_entries')

curl -X POST "https://api.example.com$path" \
  -H "Content-Type: application/json" \
  -d "$data"
```

### With pytest

```bash
# Generate test fixtures
python3 << 'EOF'
from openapi_analyzer import MikoPBXOpenAPIAnalyzer
analyzer = MikoPBXOpenAPIAnalyzer()
endpoint = analyzer.get_endpoint('/pbxcore/api/v3/extensions', 'POST')
test_data = analyzer.generate_test_data(endpoint)
print(f"EXTENSION_DATA = {test_data}")
EOF
```
