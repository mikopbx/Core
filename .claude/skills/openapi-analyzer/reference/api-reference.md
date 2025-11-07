# Python Analyzer API Reference

Complete API documentation for `MikoPBXOpenAPIAnalyzer` class methods.

## Class: MikoPBXOpenAPIAnalyzer

### Constructor

#### `__init__(spec_path: str = '/tmp/mikopbx_openapi.json')`

Initialize analyzer with OpenAPI specification.

**Parameters**:
- `spec_path` (str): Path to OpenAPI JSON file. Default: `/tmp/mikopbx_openapi.json`

**Raises**:
- `FileNotFoundError`: If spec file doesn't exist
- `json.JSONDecodeError`: If spec file is not valid JSON

**Example**:
```python
# Use default path
analyzer = MikoPBXOpenAPIAnalyzer()

# Use custom path
analyzer = MikoPBXOpenAPIAnalyzer('/path/to/openapi.json')
```

---

## Information Methods

### `get_info() -> Dict`

Get high-level API metadata.

**Returns**:
```python
{
    "title": "MikoPBX REST API",
    "version": "3.0.0",
    "openapi_version": "3.1.0",
    "total_paths": 259,
    "total_schemas": 96
}
```

**Example**:
```python
analyzer = MikoPBXOpenAPIAnalyzer()
info = analyzer.get_info()
print(f"API has {info['total_paths']} endpoints")
```

---

### `list_paths(pattern: Optional[str] = None) -> List[str]`

List all API paths, optionally filtered by pattern.

**Parameters**:
- `pattern` (str, optional): Filter paths containing this string

**Returns**:
- `List[str]`: Sorted list of path strings

**Examples**:
```python
# Get all paths
all_paths = analyzer.list_paths()
# Returns: ['/pbxcore/api/v3/apikeys', '/pbxcore/api/v3/extensions', ...]

# Filter by pattern
ext_paths = analyzer.list_paths('extensions')
# Returns: ['/pbxcore/api/v3/extensions', '/pbxcore/api/v3/extensions/{id}', ...]
```

---

## Endpoint Methods

### `get_endpoint(path: str, method: str = 'GET') -> Optional[Dict]`

Extract complete endpoint details.

**Parameters**:
- `path` (str): API path (e.g., `/pbxcore/api/v3/extensions`)
- `method` (str): HTTP method. Default: `'GET'`

**Returns**:
- `Dict`: Endpoint details (see structure below)
- `None`: If endpoint not found

**Return Structure**:
```python
{
    "path": "/pbxcore/api/v3/extensions",
    "method": "POST",
    "summary": "Создать новый добавочный",
    "description": "Детальное описание endpoint",
    "operationId": "createExtension",
    "tags": ["Extensions"],
    "parameters": [
        {
            "name": "id",
            "in": "path",  # or "query", "header"
            "required": True,
            "description": "Extension ID",
            "schema": {"type": "string"},
            "example": "123"
        }
    ],
    "requestBody": {
        "type": "object",
        "properties": {
            "number": {
                "type": "string",
                "description": "Номер добавочного",
                "example": "201"
            }
        },
        "required": ["number", "type"]
    },
    "responses": {
        "201": {
            "description": "Успешно создан",
            "schema": { ... }
        },
        "400": {
            "description": "Ошибка валидации",
            "schema": { ... }
        }
    }
}
```

**Examples**:
```python
# Get POST endpoint
endpoint = analyzer.get_endpoint('/pbxcore/api/v3/extensions', 'POST')
print(endpoint['summary'])
print(endpoint['requestBody']['required'])

# Get GET endpoint
endpoint = analyzer.get_endpoint('/pbxcore/api/v3/extensions/{id}', 'GET')
if endpoint:
    for param in endpoint['parameters']:
        print(f"Parameter: {param['name']} ({param['in']})")
```

---

### `get_schema(name: str) -> Optional[Dict]`

Get component schema by name.

**Parameters**:
- `name` (str): Schema name from `#/components/schemas/`

**Returns**:
- `Dict`: Schema definition
- `None`: If schema not found

**Example**:
```python
# Get Extension schema
ext_schema = analyzer.get_schema('Extension')
print(ext_schema['type'])  # "object"
print(ext_schema['properties'].keys())  # ['id', 'number', 'type', ...]
print(ext_schema['required'])  # ['number', 'type']

# Check if schema exists
if analyzer.get_schema('NonExistent') is None:
    print("Schema not found")
```

---

## Analysis Methods

### `compare_with_code(endpoint_info: Dict, code_params: List[str]) -> Dict`

Compare OpenAPI specification with actual code parameters.

**Parameters**:
- `endpoint_info` (Dict): Result from `get_endpoint()`
- `code_params` (List[str]): List of parameter names from code

**Returns**:
```python
{
    "in_spec_only": {"mobile_number", "email"},  # Missing in code
    "in_code_only": {"internal_id"},  # Not documented in spec
    "in_both": {"number", "type", "callerid"},  # Properly synced
    "compliance": 0.85  # 85% compliance score (0.0-1.0)
}
```

**Example**:
```python
endpoint = analyzer.get_endpoint('/pbxcore/api/v3/extensions', 'POST')

# Parameters from DataStructure.php
code_params = ['number', 'type', 'callerid', 'userid', 'internal_id']

comparison = analyzer.compare_with_code(endpoint, code_params)

print(f"Compliance: {comparison['compliance'] * 100:.1f}%")

if comparison['in_spec_only']:
    print("Missing in code:", comparison['in_spec_only'])

if comparison['in_code_only']:
    print("Not in OpenAPI:", comparison['in_code_only'])
```

---

### `validate_endpoint_compliance(path: str, method: str) -> Dict`

Validate endpoint compliance with OpenAPI 3.1.0 standard.

**Parameters**:
- `path` (str): API path
- `method` (str): HTTP method

**Returns**:
```python
{
    "valid": True,  # or False
    "issues": [],  # Critical issues (breaks spec)
    "warnings": ["Missing description for parameter 'id'"],  # Non-critical
    "score": 95  # 0-100 compliance score
}
```

**Validation Rules**:

**Critical (issues)**:
- Missing `summary`
- Missing `operationId`
- POST/PUT/PATCH without `requestBody`
- No `responses` defined

**Non-critical (warnings)**:
- Missing `description`
- Missing expected response codes
- Missing `required` field list in requestBody

**Scoring**:
- Start at 100 points
- Each issue: -20 points
- Each warning: -5 points

**Example**:
```python
result = analyzer.validate_endpoint_compliance('/pbxcore/api/v3/extensions', 'POST')

if result['valid']:
    print(f"✅ Valid endpoint (score: {result['score']})")
else:
    print("❌ Invalid endpoint")
    for issue in result['issues']:
        print(f"  - {issue}")

if result['warnings']:
    print("⚠️  Warnings:")
    for warning in result['warnings']:
        print(f"  - {warning}")
```

---

### `generate_test_data(endpoint_info: Dict) -> Dict`

Generate test data from schema examples and types.

**Parameters**:
- `endpoint_info` (Dict): Result from `get_endpoint()`

**Returns**:
- `Dict`: Test data dictionary with parameter values

**Generation Strategy**:
1. Use `example` from schema if available
2. Use first value from `enum` if defined
3. Generate default based on `type`:
   - `string` → `"test_value"`
   - `integer` → `1`
   - `number` → `1.0`
   - `boolean` → `True`
   - `array` → `[]`
   - `object` → `{}`

**Example**:
```python
endpoint = analyzer.get_endpoint('/pbxcore/api/v3/extensions', 'POST')
test_data = analyzer.generate_test_data(endpoint)

# Result:
# {
#   "number": "201",  # from example
#   "type": "SIP",  # from enum
#   "callerid": "test_value",  # generated default
#   "userid": 1  # generated default
# }

# Use in test
import requests
response = requests.post(
    "https://api.example.com/pbxcore/api/v3/extensions",
    json=test_data,
    headers=headers
)
```

---

## Private Methods

These methods are used internally but can be useful for advanced usage.

### `_extract_parameter(param: Dict) -> Dict`

Extract and normalize parameter details.

### `_extract_request_body(body: Dict) -> Optional[Dict]`

Extract request body schema from `application/json` content.

### `_extract_response(response: Dict) -> Dict`

Extract response schema and description.

### `_resolve_schema(schema: Dict) -> Dict`

Resolve schema references (`$ref`).

**Example**:
```python
# Schema with $ref
schema = {"$ref": "#/components/schemas/Extension"}

# Resolved schema
resolved = analyzer._resolve_schema(schema)
# Returns actual Extension schema definition
```

### `_generate_default(schema: Dict)`

Generate default value based on schema type.

---

## Usage Patterns

### Pattern 1: Full Endpoint Analysis

```python
analyzer = MikoPBXOpenAPIAnalyzer()

# Get endpoint
endpoint = analyzer.get_endpoint('/pbxcore/api/v3/extensions', 'POST')

# Validate compliance
validation = analyzer.validate_endpoint_compliance(
    '/pbxcore/api/v3/extensions',
    'POST'
)

# Compare with code
code_params = ['number', 'type', 'callerid']
comparison = analyzer.compare_with_code(endpoint, code_params)

# Generate test data
test_data = analyzer.generate_test_data(endpoint)

# Print report
print(f"Endpoint: {endpoint['operationId']}")
print(f"Compliance: {validation['score']}/100")
print(f"Code sync: {comparison['compliance'] * 100:.1f}%")
print(f"Test data: {test_data}")
```

### Pattern 2: Batch Validation

```python
analyzer = MikoPBXOpenAPIAnalyzer()

# Validate all endpoints
results = []
for path in analyzer.list_paths():
    for method in ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']:
        result = analyzer.validate_endpoint_compliance(path, method)
        if result.get('valid') is False:
            results.append({
                'path': path,
                'method': method,
                'issues': result['issues']
            })

# Print invalid endpoints
for r in results:
    print(f"{r['method']} {r['path']}: {r['issues']}")
```

### Pattern 3: Schema Exploration

```python
analyzer = MikoPBXOpenAPIAnalyzer()

# Find all schemas with required fields
for name, schema in analyzer.schemas.items():
    if 'required' in schema:
        print(f"{name}: {schema['required']}")

# Get schema details
ext_schema = analyzer.get_schema('Extension')
for prop_name, prop_def in ext_schema['properties'].items():
    required = '✓' if prop_name in ext_schema.get('required', []) else ' '
    prop_type = prop_def.get('type', 'unknown')
    print(f"[{required}] {prop_name}: {prop_type}")
```

---

## Error Handling

### File Not Found

```python
try:
    analyzer = MikoPBXOpenAPIAnalyzer('/invalid/path.json')
except FileNotFoundError:
    print("OpenAPI spec not found. Fetch it first:")
    print("docker exec <id> curl http://mikopbx-php83.localhost:8081/pbxcore/api/v3/openapi:getSpecification > /tmp/mikopbx_openapi.json")
```

### Invalid JSON

```python
try:
    analyzer = MikoPBXOpenAPIAnalyzer('/tmp/corrupted.json')
except json.JSONDecodeError as e:
    print(f"Invalid JSON: {e}")
```

### Endpoint Not Found

```python
endpoint = analyzer.get_endpoint('/invalid/path', 'GET')
if endpoint is None:
    print("Endpoint not found in OpenAPI spec")
    # Check if path exists with different method
    for method in ['GET', 'POST', 'PUT', 'DELETE']:
        if analyzer.get_endpoint('/path', method):
            print(f"Found with method: {method}")
```

---

## Performance Tips

1. **Cache the analyzer**: Create once, reuse multiple times
   ```python
   # Good: Single initialization
   analyzer = MikoPBXOpenAPIAnalyzer()
   for path in paths:
       endpoint = analyzer.get_endpoint(path, 'GET')

   # Bad: Multiple initializations
   for path in paths:
       analyzer = MikoPBXOpenAPIAnalyzer()  # Reloads 9MB file!
       endpoint = analyzer.get_endpoint(path, 'GET')
   ```

2. **Filter paths early**: Use pattern matching in `list_paths()`
   ```python
   # Good: Filter during retrieval
   ext_paths = analyzer.list_paths('extensions')

   # Bad: Filter after retrieval
   all_paths = analyzer.list_paths()
   ext_paths = [p for p in all_paths if 'extensions' in p]
   ```

3. **Validate once**: Don't re-validate the same endpoint
   ```python
   # Cache validation results
   validation_cache = {}

   def get_validation(path, method):
       key = f"{method}:{path}"
       if key not in validation_cache:
           validation_cache[key] = analyzer.validate_endpoint_compliance(path, method)
       return validation_cache[key]
   ```
