---
name: mikopbx-openapi-analyzer
description: Extract and analyze OpenAPI 3.1.0 specification from MikoPBX for endpoint validation
---

# mikopbx-openapi-analyzer

Extract and analyze OpenAPI specification from MikoPBX to validate endpoints, generate tests, and ensure API compliance.

## When to Use This Skill

This is a **helper skill** used by other skills:
- `mikopbx-endpoint-validator` - to validate against OpenAPI spec
- `mikopbx-api-test-generator` - to generate tests from spec
- User explicitly asks to "check OpenAPI spec" or "validate against OpenAPI"

## What This Skill Does

1. **Fetches OpenAPI 3.1.0 specification** from MikoPBX
2. **Extracts endpoint details** (parameters, request/response schemas)
3. **Validates endpoint compliance** with OpenAPI standard
4. **Compares code** with OpenAPI definitions
5. **Generates test data** from schema examples
6. **Provides schema documentation**

## OpenAPI Specification Details

### Location
- **Internal (no auth)**: `http://127.0.0.1:8081/pbxcore/api/v3/openapi:getSpecification`
- **External (requires auth)**: `https://mikopbx_php83.localhost:8445/pbxcore/api/v3/openapi:getSpecification`

### Specification Stats
- **OpenAPI Version**: 3.1.0
- **Total Paths**: 259 endpoints
- **Total Schemas**: 96 component schemas
- **File Size**: ~9MB, 116K lines JSON
- **Format**: Standard OpenAPI 3.1.0 JSON

### Structure
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "MikoPBX REST API",
    "version": "3.0.0"
  },
  "servers": [],
  "paths": {
    "/pbxcore/api/v3/extensions": {
      "get": { ... },
      "post": { ... }
    }
  },
  "components": {
    "schemas": {
      "Extension": { ... },
      "ExtensionListItem": { ... }
    }
  }
}
```

## Usage Instructions

### Step 1: Fetch OpenAPI Specification

```bash
# From inside container (no auth needed)
docker exec <container_id> curl -s http://127.0.0.1:8081/pbxcore/api/v3/openapi:getSpecification > /tmp/mikopbx_openapi.json

# From outside container (requires Bearer token)
curl -H "Authorization: Bearer $TOKEN" \
  https://mikopbx_php83.localhost:8445/pbxcore/api/v3/openapi:getSpecification \
  -k > /tmp/mikopbx_openapi.json

# Check file
wc -l /tmp/mikopbx_openapi.json  # ~116K lines
ls -lh /tmp/mikopbx_openapi.json # ~9MB
```

### Step 2: Analyze with Python

Create Python helper script:

```python
#!/usr/bin/env python3
"""
OpenAPI Specification Analyzer for MikoPBX
Extracts endpoint details from OpenAPI 3.1.0 specification
"""

import json
import sys
from typing import Dict, List, Optional

class MikoPBXOpenAPIAnalyzer:
    """Analyze MikoPBX OpenAPI specification"""

    def __init__(self, spec_path: str = '/tmp/mikopbx_openapi.json'):
        """Load OpenAPI specification"""
        with open(spec_path, 'r', encoding='utf-8') as f:
            self.spec = json.load(f)

        self.paths = self.spec.get('paths', {})
        self.schemas = self.spec.get('components', {}).get('schemas', {})

    def get_info(self) -> Dict:
        """Get API information"""
        return {
            'title': self.spec['info']['title'],
            'version': self.spec['info']['version'],
            'openapi_version': self.spec['openapi'],
            'total_paths': len(self.paths),
            'total_schemas': len(self.schemas)
        }

    def list_paths(self, pattern: Optional[str] = None) -> List[str]:
        """List all API paths, optionally filtered by pattern"""
        paths = list(self.paths.keys())
        if pattern:
            paths = [p for p in paths if pattern in p]
        return sorted(paths)

    def get_endpoint(self, path: str, method: str = 'GET') -> Optional[Dict]:
        """Extract endpoint details"""
        if path not in self.paths:
            return None

        endpoint = self.paths[path].get(method.lower())
        if not endpoint:
            return None

        result = {
            'path': path,
            'method': method.upper(),
            'summary': endpoint.get('summary', ''),
            'description': endpoint.get('description', ''),
            'operationId': endpoint.get('operationId', ''),
            'tags': endpoint.get('tags', []),
            'parameters': [],
            'requestBody': None,
            'responses': {}
        }

        # Path parameters (from path definition)
        path_params = self.paths[path].get('parameters', [])
        for param in path_params:
            result['parameters'].append(self._extract_parameter(param))

        # Operation parameters
        for param in endpoint.get('parameters', []):
            result['parameters'].append(self._extract_parameter(param))

        # Request body
        if 'requestBody' in endpoint:
            result['requestBody'] = self._extract_request_body(endpoint['requestBody'])

        # Responses
        for status, response in endpoint.get('responses', {}).items():
            result['responses'][status] = self._extract_response(response)

        return result

    def _extract_parameter(self, param: Dict) -> Dict:
        """Extract parameter details"""
        return {
            'name': param.get('name'),
            'in': param.get('in'),  # path, query, header
            'required': param.get('required', False),
            'description': param.get('description', ''),
            'schema': param.get('schema', {}),
            'example': param.get('schema', {}).get('example')
        }

    def _extract_request_body(self, body: Dict) -> Optional[Dict]:
        """Extract request body schema"""
        content = body.get('content', {})
        if 'application/json' not in content:
            return None

        schema = content['application/json'].get('schema', {})
        return self._resolve_schema(schema)

    def _extract_response(self, response: Dict) -> Dict:
        """Extract response details"""
        result = {
            'description': response.get('description', ''),
            'schema': None
        }

        content = response.get('content', {})
        if 'application/json' in content:
            schema = content['application/json'].get('schema', {})
            result['schema'] = self._resolve_schema(schema)

        return result

    def _resolve_schema(self, schema: Dict) -> Dict:
        """Resolve schema, following $ref if present"""
        if '$ref' in schema:
            ref_path = schema['$ref']  # e.g., "#/components/schemas/Extension"
            ref_name = ref_path.split('/')[-1]
            if ref_name in self.schemas:
                return self.schemas[ref_name]
        return schema

    def get_schema(self, name: str) -> Optional[Dict]:
        """Get component schema by name"""
        return self.schemas.get(name)

    def compare_with_code(self, endpoint_info: Dict, code_params: List[str]) -> Dict:
        """Compare OpenAPI spec with actual code parameters"""
        spec_params = set()

        # From request body
        if endpoint_info['requestBody']:
            props = endpoint_info['requestBody'].get('properties', {})
            spec_params.update(props.keys())

        # From parameters
        for param in endpoint_info['parameters']:
            spec_params.add(param['name'])

        code_params_set = set(code_params)

        return {
            'in_spec_only': spec_params - code_params_set,
            'in_code_only': code_params_set - spec_params,
            'in_both': spec_params & code_params_set,
            'compliance': len(spec_params & code_params_set) / len(spec_params | code_params_set) if spec_params | code_params_set else 1.0
        }

    def generate_test_data(self, endpoint_info: Dict) -> Dict:
        """Generate test data from schema examples"""
        test_data = {}

        if endpoint_info['requestBody']:
            props = endpoint_info['requestBody'].get('properties', {})
            required = endpoint_info['requestBody'].get('required', [])

            for name, schema in props.items():
                if 'example' in schema:
                    test_data[name] = schema['example']
                elif name in required:
                    # Generate default based on type
                    test_data[name] = self._generate_default(schema)

        return test_data

    def _generate_default(self, schema: Dict):
        """Generate default value based on schema type"""
        type_defaults = {
            'string': 'test_value',
            'integer': 1,
            'number': 1.0,
            'boolean': True,
            'array': [],
            'object': {}
        }

        schema_type = schema.get('type', 'string')

        # Check enum
        if 'enum' in schema:
            return schema['enum'][0]

        return type_defaults.get(schema_type, None)

    def validate_endpoint_compliance(self, path: str, method: str) -> Dict:
        """Validate endpoint compliance with OpenAPI standard"""
        endpoint = self.get_endpoint(path, method)
        if not endpoint:
            return {'valid': False, 'error': 'Endpoint not found in OpenAPI spec'}

        issues = []
        warnings = []

        # Check required fields
        if not endpoint['summary']:
            issues.append('Missing summary')
        if not endpoint['description']:
            warnings.append('Missing description')
        if not endpoint['operationId']:
            issues.append('Missing operationId')

        # Check request body for POST/PUT/PATCH
        if method in ['POST', 'PUT', 'PATCH']:
            if not endpoint['requestBody']:
                issues.append(f'{method} endpoint missing requestBody schema')
            else:
                if 'required' not in endpoint['requestBody']:
                    warnings.append('requestBody missing required field list')

        # Check responses
        if not endpoint['responses']:
            issues.append('No responses defined')
        else:
            expected_codes = {
                'GET': ['200', '404'],
                'POST': ['201', '400'],
                'PUT': ['200', '400', '404'],
                'PATCH': ['200', '400', '404'],
                'DELETE': ['200', '204', '404']
            }

            for code in expected_codes.get(method, []):
                if code not in endpoint['responses']:
                    warnings.append(f'Missing {code} response')

        return {
            'valid': len(issues) == 0,
            'issues': issues,
            'warnings': warnings,
            'score': 100 - (len(issues) * 20 + len(warnings) * 5)
        }


def main():
    """CLI interface"""
    if len(sys.argv) < 2:
        print("Usage: python3 openapi_analyzer.py <command> [args]")
        print("Commands:")
        print("  info                           - Show API info")
        print("  list [pattern]                 - List all paths")
        print("  get <path> <method>            - Get endpoint details")
        print("  schema <name>                  - Get schema details")
        print("  validate <path> <method>       - Validate endpoint")
        return

    analyzer = MikoPBXOpenAPIAnalyzer()
    command = sys.argv[1]

    if command == 'info':
        info = analyzer.get_info()
        print(json.dumps(info, indent=2))

    elif command == 'list':
        pattern = sys.argv[2] if len(sys.argv) > 2 else None
        paths = analyzer.list_paths(pattern)
        for path in paths:
            print(path)

    elif command == 'get':
        if len(sys.argv) < 4:
            print("Usage: get <path> <method>")
            return
        path, method = sys.argv[2], sys.argv[3]
        endpoint = analyzer.get_endpoint(path, method)
        if endpoint:
            print(json.dumps(endpoint, indent=2, ensure_ascii=False))
        else:
            print(f"Endpoint {method} {path} not found")

    elif command == 'schema':
        if len(sys.argv) < 3:
            print("Usage: schema <name>")
            return
        name = sys.argv[2]
        schema = analyzer.get_schema(name)
        if schema:
            print(json.dumps(schema, indent=2, ensure_ascii=False))
        else:
            print(f"Schema {name} not found")

    elif command == 'validate':
        if len(sys.argv) < 4:
            print("Usage: validate <path> <method>")
            return
        path, method = sys.argv[2], sys.argv[3]
        result = analyzer.validate_endpoint_compliance(path, method)
        print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
```

### Step 3: Use Analyzer in Other Skills

#### In mikopbx-endpoint-validator:

```bash
# 1. Fetch OpenAPI spec
docker exec $CONTAINER_ID curl -s http://127.0.0.1:8081/pbxcore/api/v3/openapi:getSpecification > /tmp/mikopbx_openapi.json

# 2. Get endpoint from OpenAPI
python3 openapi_analyzer.py get "/pbxcore/api/v3/extensions" POST > /tmp/openapi_endpoint.json

# 3. Compare with DataStructure.php
# Extract parameters from DataStructure::getParameterDefinitions()
# Compare with OpenAPI spec

# 4. Generate compliance report
python3 openapi_analyzer.py validate "/pbxcore/api/v3/extensions" POST
```

#### In mikopbx-api-test-generator:

```bash
# 1. Fetch OpenAPI spec
docker exec $CONTAINER_ID curl -s http://127.0.0.1:8081/pbxcore/api/v3/openapi:getSpecification > /tmp/mikopbx_openapi.json

# 2. Get endpoint details
python3 openapi_analyzer.py get "/pbxcore/api/v3/extensions" POST > /tmp/endpoint.json

# 3. Extract test data from spec
python3 << 'EOF'
import json
from openapi_analyzer import MikoPBXOpenAPIAnalyzer

analyzer = MikoPBXOpenAPIAnalyzer()
endpoint = analyzer.get_endpoint('/pbxcore/api/v3/extensions', 'POST')
test_data = analyzer.generate_test_data(endpoint)
print(json.dumps(test_data, indent=2))
EOF

# 4. Use test data in pytest generation
```

## Python Analyzer API

### Methods

#### `get_info() -> Dict`
Get API metadata:
```python
{
  "title": "MikoPBX REST API",
  "version": "3.0.0",
  "openapi_version": "3.1.0",
  "total_paths": 259,
  "total_schemas": 96
}
```

#### `list_paths(pattern: Optional[str]) -> List[str]`
List all paths, optionally filtered:
```python
analyzer.list_paths()  # All paths
analyzer.list_paths('extensions')  # Only paths containing 'extensions'
```

#### `get_endpoint(path: str, method: str) -> Optional[Dict]`
Get complete endpoint details:
```python
endpoint = analyzer.get_endpoint('/pbxcore/api/v3/extensions', 'POST')
# Returns: path, method, summary, parameters, requestBody, responses
```

#### `get_schema(name: str) -> Optional[Dict]`
Get component schema:
```python
schema = analyzer.get_schema('Extension')
# Returns full schema with properties, required, etc.
```

#### `compare_with_code(endpoint_info: Dict, code_params: List[str]) -> Dict`
Compare OpenAPI spec with actual code:
```python
comparison = analyzer.compare_with_code(endpoint, ['number', 'type', 'callerid'])
# Returns: in_spec_only, in_code_only, in_both, compliance
```

#### `generate_test_data(endpoint_info: Dict) -> Dict`
Generate test data from schema examples:
```python
test_data = analyzer.generate_test_data(endpoint)
# Returns: {'number': '201', 'type': 'SIP', ...}
```

#### `validate_endpoint_compliance(path: str, method: str) -> Dict`
Validate OpenAPI standard compliance:
```python
result = analyzer.validate_endpoint_compliance('/pbxcore/api/v3/extensions', 'POST')
# Returns: valid, issues, warnings, score
```

## CLI Usage Examples

### Example 1: Get API Info
```bash
python3 openapi_analyzer.py info
```

Output:
```json
{
  "title": "MikoPBX REST API",
  "version": "3.0.0",
  "openapi_version": "3.1.0",
  "total_paths": 259,
  "total_schemas": 96
}
```

### Example 2: List Endpoints
```bash
# All endpoints
python3 openapi_analyzer.py list

# Filter by pattern
python3 openapi_analyzer.py list extensions
```

Output:
```
/pbxcore/api/v3/extensions
/pbxcore/api/v3/extensions/{id}
/pbxcore/api/v3/extensions/{id}:copy
/pbxcore/api/v3/extensions:getDefault
/pbxcore/api/v3/extensions:getForSelect
```

### Example 3: Get Endpoint Details
```bash
python3 openapi_analyzer.py get "/pbxcore/api/v3/extensions" POST
```

Output:
```json
{
  "path": "/pbxcore/api/v3/extensions",
  "method": "POST",
  "summary": "Создать новый добавочный",
  "operationId": "createExtension",
  "parameters": [],
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
        "enum": ["SIP", "IAX", "QUEUE", "IVR", "CONFERENCE", "EXTERNAL"],
        "example": "SIP"
      }
    },
    "required": ["number", "type"]
  },
  "responses": {
    "201": {
      "description": "Добавочный успешно создан",
      "schema": {...}
    }
  }
}
```

### Example 4: Validate Endpoint
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

## Integration with mikopbx-endpoint-validator

### Enhanced Validation Flow:

```bash
#!/bin/bash
# Enhanced endpoint validation with OpenAPI

RESOURCE="Extensions"
PATH="/pbxcore/api/v3/extensions"
METHOD="POST"

# 1. Fetch OpenAPI spec
docker exec $CONTAINER_ID curl -s http://127.0.0.1:8081/pbxcore/api/v3/openapi:getSpecification > /tmp/openapi.json

# 2. Get OpenAPI endpoint
python3 openapi_analyzer.py get "$PATH" "$METHOD" > /tmp/openapi_endpoint.json

# 3. Extract DataStructure parameters
php -r "
require 'src/PBXCoreREST/Lib/$RESOURCE/DataStructure.php';
\$defs = DataStructure::getParameterDefinitions();
echo json_encode(array_keys(\$defs['request']));
" > /tmp/code_params.json

# 4. Compare OpenAPI vs Code
python3 << 'EOF'
import json
from openapi_analyzer import MikoPBXOpenAPIAnalyzer

analyzer = MikoPBXOpenAPIAnalyzer()
endpoint = analyzer.get_endpoint('/pbxcore/api/v3/extensions', 'POST')

with open('/tmp/code_params.json') as f:
    code_params = json.load(f)

comparison = analyzer.compare_with_code(endpoint, code_params)
print(json.dumps(comparison, indent=2))
EOF

# 5. Validate OpenAPI compliance
python3 openapi_analyzer.py validate "$PATH" "$METHOD"
```

## Integration with mikopbx-api-test-generator

### Enhanced Test Generation:

```python
#!/usr/bin/env python3
"""Generate pytest tests from OpenAPI specification"""

from openapi_analyzer import MikoPBXOpenAPIAnalyzer

analyzer = MikoPBXOpenAPIAnalyzer()
endpoint = analyzer.get_endpoint('/pbxcore/api/v3/extensions', 'POST')

# Generate valid test data
test_data = analyzer.generate_test_data(endpoint)

# Generate pytest test
print(f'''
def test_create_extension_from_openapi(headers):
    """Test generated from OpenAPI specification"""

    # Test data from OpenAPI examples
    payload = {json.dumps(test_data, indent=8)}

    response = requests.post(
        f"{{BASE_URL}}/pbxcore/api/v3/extensions",
        json=payload,
        headers=headers,
        verify=False
    )

    assert response.status_code == 201
    data = response.json()
    assert "data" in data
''')

# Generate negative tests from schema
if endpoint['requestBody']:
    required = endpoint['requestBody'].get('required', [])
    for field in required:
        print(f'''
def test_create_extension_missing_{field}(headers):
    """Test missing required field: {field}"""
    payload = {json.dumps({k: v for k, v in test_data.items() if k != field}, indent=8)}

    response = requests.post(
        f"{{BASE_URL}}/pbxcore/api/v3/extensions",
        json=payload,
        headers=headers,
        verify=False
    )

    assert response.status_code == 400
''')
```

## Common Patterns

### Pattern 1: Validate All Endpoints
```bash
python3 openapi_analyzer.py list | while read path; do
    for method in GET POST PUT PATCH DELETE; do
        python3 openapi_analyzer.py validate "$path" "$method" 2>/dev/null
    done
done | jq -s 'map(select(.valid == false))'
```

### Pattern 2: Find Endpoints Missing Documentation
```bash
python3 openapi_analyzer.py list | while read path; do
    python3 openapi_analyzer.py get "$path" GET 2>/dev/null | \
        jq -r 'select(.description == "") | .path'
done
```

### Pattern 3: Extract All Required Parameters
```bash
python3 openapi_analyzer.py get "/pbxcore/api/v3/extensions" POST | \
    jq -r '.requestBody.required[]'
```

## Cache Strategy

OpenAPI spec is large (~9MB), so cache it:

```bash
# Cache for 1 hour
SPEC_FILE="/tmp/mikopbx_openapi.json"
SPEC_AGE=$(($(date +%s) - $(stat -f %m "$SPEC_FILE" 2>/dev/null || echo 0)))

if [ ! -f "$SPEC_FILE" ] || [ $SPEC_AGE -gt 3600 ]; then
    echo "Fetching fresh OpenAPI spec..."
    docker exec $CONTAINER_ID curl -s http://127.0.0.1:8081/pbxcore/api/v3/openapi:getSpecification > "$SPEC_FILE"
else
    echo "Using cached OpenAPI spec (age: ${SPEC_AGE}s)"
fi
```

## Output Format

Always provide structured reports:

```
📋 OpenAPI Analysis Report
==========================

🔍 Endpoint: POST /pbxcore/api/v3/extensions
📖 Operation ID: createExtension
📝 Summary: Создать новый добавочный

✅ OpenAPI Compliance:
   Score: 95/100
   Status: Valid
   Issues: None
   Warnings: Missing description for parameter 'callerid'

📊 Parameter Comparison:
   ✅ In both (5): number, type, callerid, userid, show_in_phonebook
   ⚠️  In OpenAPI only (2): mobile_number, email
   ⚠️  In Code only (1): internal_extension_id

📝 Required Parameters:
   • number (string, example: "201")
   • type (enum: SIP, IAX, QUEUE, IVR, CONFERENCE, EXTERNAL)

📤 Expected Responses:
   • 201: Добавочный успешно создан
   • 400: Ошибка валидации
   • 401: Не авторизован
   • 403: Доступ запрещен
   • 409: Конфликт (номер уже существует)

💡 Recommendations:
   1. Add 'mobile_number' and 'email' to DataStructure
   2. Add description for 'callerid' parameter in OpenAPI
   3. Consider if 'internal_extension_id' should be in OpenAPI spec
```

## Best Practices

1. **Cache the spec** - It's 9MB, fetch once per hour
2. **Use Python for complex analysis** - jq is good for simple queries
3. **Validate both ways** - Code→OpenAPI and OpenAPI→Code
4. **Check examples** - Use OpenAPI examples for test generation
5. **Monitor changes** - Track OpenAPI spec version
6. **Document discrepancies** - Note any mismatches between spec and code

## Success Criteria

Analysis is successful when:
- ✅ OpenAPI spec fetched successfully
- ✅ Endpoint found in specification
- ✅ All parameters extracted correctly
- ✅ Schemas resolved (including $ref)
- ✅ Comparison with code completed
- ✅ Validation results clear and actionable
- ✅ Test data generated successfully

## Pro Tips

1. **Use operationId** for tracking endpoints in code
2. **Check tags** to group related endpoints
3. **Validate responses** - Ensure all status codes documented
4. **Use examples** - They're perfect for test data
5. **Check $ref** - Always resolve schema references
6. **Monitor compliance score** - Aim for 90+
7. **Track required fields** - Critical for validation

## Troubleshooting

### Spec fetch fails:
```bash
# Check container is running
docker ps | grep mikopbx

# Try internal URL
docker exec <id> curl -s http://127.0.0.1:8081/pbxcore/api/v3/openapi:getSpecification
```

### Python import error:
```bash
# Ensure script is in same directory or use full path
python3 /path/to/openapi_analyzer.py info
```

### Schema not found:
```bash
# List all available schemas
python3 openapi_analyzer.py info | jq '.total_schemas'
cat /tmp/mikopbx_openapi.json | jq -r '.components.schemas | keys[]'
```

### Large output:
```bash
# Pipe through less
python3 openapi_analyzer.py get "/pbxcore/api/v3/extensions" POST | less

# Or save to file
python3 openapi_analyzer.py get "/pbxcore/api/v3/extensions" POST > /tmp/endpoint.json
```
